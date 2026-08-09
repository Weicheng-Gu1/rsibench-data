import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { statSync } from "node:fs";
import { join } from "node:path";

// M3 Control: deliverable pacing controller.
//
// Diagnosed failure class (training evidence): sessions that keep exploring or
// perfecting intermediate work until the external session limit cuts them off
// without ever materializing the task-required artifact at its final path
// (verifier then reports the required output file missing or unchanged). The
// agent usually has a working approach in context long before the cutoff; it
// simply never applies it to the required location.
//
// Mechanism:
// 1. At agent start, parse the task prompt into a small "deliverable
//    contract": paths that production verbs (write/save/create/produce/...
//    within the same sentence) designate as outputs. Paths playing an input
//    role anywhere in the prompt are disqualified. Existing paths become
//    "must be modified" contracts; missing paths become "must exist and be
//    non-empty" contracts. When no explicit artifact is named, the controller
//    stays silent.
// 2. On tool results (mid-loop ticks), at two fixed elapsed-minute stages,
//    check contracts against the filesystem. When any contract is unmet, send
//    exactly one bounded steer message per stage instructing the agent to
//    checkpoint its current best working version at the required path(s) and
//    only then continue refining. Each stage fires at most once, nothing is
//    blocked, and satisfied contracts produce no messages.

const PRODUCTION_VERB =
  /(?:writ(?:e|es|ten|ing)|sav(?:e|es|ing)|creat(?:e|es|ing)|generat(?:e|es|ing)|produc(?:e|es|ing)|stor(?:e|es|ing)|output(?:s|ting)?|deliver(?:s|ed|ing)?|complete|implement(?:s|ed|ing)?|re-?implement(?:ed|ing)?|build(?:ing)?)/i;
const INPUT_CUE =
  /(?:\bgiven\b|\bprovided\b|input\s+(?:file|data|record)s?|\bdataset\b|decomp(?:re)?ssor|\bexisting\b|reads?\s+(?:input|data)|corresponding decryption)/i;
const ABSOLUTE_PATH =
  /(?:^|[\s"'`(=:{,])(\/[A-Za-z0-9_.\/-]*[A-Za-z0-9_-]+\.[A-Za-z0-9]{1,5})(?![A-Za-z0-9])/g;
const RELATIVE_NAME =
  /\b([A-Za-z0-9_-]+\.(?:py|R|r|c|h|hh|cc|cpp|txt|json|jsonl|stan|comp|npy|npz|html|sh|ts|js|out))\b/g;
const SKIPPED_PREFIXES = [
  "/app/.pi",
  "/app/source_code",
  "/tests",
  "/proc",
  "/sys",
  "/dev",
];
const SKIPPED_BASENAMES = /^(test_|conftest|.*_test\.)/;
const RUN_OBJECT = /(?:runn?ing|runs|run|execut\w*|launch\w*|start\w*|invoke\w*|calling)\s+$/i;
const INPUT_CUE_RADIUS = 80;
const MAX_CONTRACTS = 8;

function matchAllGlobal(sentence: string, pattern: RegExp): RegExpMatchArray[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...sentence.matchAll(new RegExp(pattern.source, flags))];
}

interface Contract {
  path: string;
  kind: "create" | "edit";
}

interface FileProbe {
  exists: boolean;
  size: number;
  mtimeMs: number;
}

function defaultStageMinutes(): number[] {
  const raw = process.env.RSIBENCH_PACING_STAGES_MIN;
  if (raw) {
    const parsed = raw
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (parsed.length > 0) return parsed.slice(0, 3);
  }
  return [5, 10];
}

function sentencesOf(prompt: string): string[] {
  const paragraphs: string[] = [];
  let buffer = "";
  for (const rawLine of prompt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (buffer) paragraphs.push(buffer);
      buffer = "";
      continue;
    }
    buffer = buffer ? `${buffer} ${line}` : line;
    if (/[.!?:;"'`)\]}>]$/.test(line)) {
      paragraphs.push(buffer);
      buffer = "";
    }
  }
  if (buffer) paragraphs.push(buffer);
  const sentences: string[] = [];
  for (const paragraph of paragraphs) {
    for (const sentence of paragraph.split(/[.!?](?=\s+[A-Z"'`])/)) {
      if (sentence.trim()) sentences.push(sentence);
    }
  }
  return sentences;
}

function isSkippedPath(path: string): boolean {
  if (SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  const base = path.slice(path.lastIndexOf("/") + 1);
  return SKIPPED_BASENAMES.test(base);
}

export function parseDeliverables(prompt: string, cwd: string): string[] {
  const produced: string[] = [];
  const inputRole = new Set<string>();
  for (const sentence of sentencesOf(prompt)) {
    const absolute: { path: string; start: number; end: number }[] = [];
    for (const match of matchAllGlobal(sentence, ABSOLUTE_PATH)) {
      const raw = match[1];
      const start = (match.index ?? 0) + match[0].indexOf(raw);
      const previous = start > 0 ? sentence[start - 1] : "";
      if (previous && /[A-Za-z0-9:]/.test(previous)) continue; // glued token/URL
      const path = raw.replace(/[.,;:)\]"'`]+$/, "");
      if (path.split("/").filter(Boolean).length < 2) continue; // bare "/file.ext"
      if (isSkippedPath(path)) continue;
      absolute.push({ path, start, end: start + raw.length });
    }
    if (INPUT_CUE.test(sentence)) {
      const cuePositions = matchAllGlobal(sentence, INPUT_CUE).map(
        (match) => match.index ?? 0,
      );
      const nearCue = (position: number) =>
        cuePositions.some(
          (position2) =>
            position >= position2 - 60 && position <= position2 + INPUT_CUE_RADIUS,
        );
      for (const item of absolute) {
        if (nearCue(item.start)) inputRole.add(item.path);
      }
      for (const match of matchAllGlobal(sentence, RELATIVE_NAME)) {
        const name = match[1];
        const start = (match.index ?? 0) + match[0].indexOf(name);
        if (absolute.some((a) => start >= a.start && start < a.end)) continue;
        if (nearCue(start)) inputRole.add(join(cwd, name));
      }
    }
    const verbPositions = matchAllGlobal(sentence, PRODUCTION_VERB).map(
      (match) => match.index ?? 0,
    );
    const sentenceCandidates: string[] = [];
    for (const item of absolute) {
      if (!verbPositions.some((position) => position < item.start)) continue;
      // Skip execution mentions ("produced by running X"): the artifact of
      // interest is what running X writes, not X itself.
      if (RUN_OBJECT.test(sentence.slice(Math.max(0, item.start - 24), item.start))) {
        continue;
      }
      sentenceCandidates.push(item.path);
    }
    if (sentenceCandidates.length === 0 && verbPositions.length > 0) {
      const firstVerb = Math.min(...verbPositions);
      for (const match of matchAllGlobal(sentence, RELATIVE_NAME)) {
        const name = match[1];
        const start = (match.index ?? 0) + match[0].indexOf(name);
        if (start <= firstVerb) continue;
        if (sentence[start - 1] === "/") continue;
        if (absolute.some((a) => start >= a.start && start < a.end)) continue;
        sentenceCandidates.push(join(cwd, name));
        break; // nearest object of the production verb only
      }
    }
    for (const candidate of sentenceCandidates) {
      if (!produced.includes(candidate)) produced.push(candidate);
    }
  }
  return produced.filter((path) => !inputRole.has(path)).slice(0, MAX_CONTRACTS);
}

function probe(path: string): FileProbe {
  try {
    const stats = statSync(path);
    return { exists: stats.isFile(), size: stats.size, mtimeMs: stats.mtimeMs };
  } catch {
    return { exists: false, size: 0, mtimeMs: 0 };
  }
}

function isUnmet(contract: Contract, startMs: number): boolean {
  const current = probe(contract.path);
  if (!current.exists || current.size === 0) return true;
  if (contract.kind === "edit" && current.mtimeMs < startMs - 2000) return true;
  return false;
}

function stageMessage(
  stage: number,
  minutes: number,
  missing: Contract[],
): string {
  const listed = missing
    .slice(0, 4)
    .map((contract) =>
      contract.kind === "create"
        ? `${contract.path} (must be created)`
        : `${contract.path} (must be updated)`,
    )
    .join("; ");
  if (stage === 0) {
    return (
      `[pacing checkpoint] About ${minutes} minutes into this session. The task ` +
      `requires these artifacts at their final locations: ${listed}. None of them ` +
      `is in place yet. Write your current best working version of each one to its ` +
      `exact required path NOW, even if rough; you can keep improving it in place ` +
      `afterwards. Work that lives only in scratch files or in this conversation ` +
      `earns no credit if the session ends.`
    );
  }
  return (
    `[pacing finalize] About ${minutes} minutes into this session and these ` +
    `required artifacts are still missing or unchanged: ${listed}. Make this your ` +
    `immediate priority: commit the best solution you already have verified to ` +
    `exactly these paths, confirm each file exists and is non-empty, and only then ` +
    `continue refining. New exploration that never lands in the required files ` +
    `produces no reward.`
  );
}

export default function install(pi: ExtensionAPI): void {
  const stageMinutes = defaultStageMinutes();
  let contracts: Contract[] = [];
  let startMs = 0;
  let firedStages = new Set<number>();

  pi.on("before_agent_start", async (event, ctx) => {
    try {
      startMs = Date.now();
      firedStages = new Set<number>();
      const cwd = ctx.cwd || "/app";
      const paths = parseDeliverables(event.prompt || "", cwd);
      contracts = paths.map((path) => {
        const current = probe(path);
        return {
          path,
          kind: current.exists && current.size > 0 ? "edit" : "create",
        };
      });
      if (contracts.length === 0) return;
      pi.appendEntry("rsibench:pacing", {
        kind: "deliverable_contract",
        artifacts: contracts,
        stageMinutes,
      });
      const lines = contracts
        .map((contract) =>
          contract.kind === "create"
            ? `- create ${contract.path}`
            : `- update ${contract.path} (it exists but must be modified)`,
        )
        .join("\n");
      return {
        systemPrompt:
          `${event.systemPrompt}\n\n## Required artifact checkpoints\n` +
          `This task explicitly requires the following deliverables:\n${lines}\n` +
          `Write a first working version of each to its exact required path as ` +
          `early as possible, then keep updating that file in place as you ` +
          `improve it. Never leave the only copy of working code, results, or ` +
          `configuration in scratch paths or in the conversation.`,
      };
    } catch {
      return undefined;
    }
  });

  pi.on("tool_result", async () => {
    try {
      if (!startMs || contracts.length === 0) return;
      const elapsedMinutes = (Date.now() - startMs) / 60000;
      for (let stage = 0; stage < stageMinutes.length; stage += 1) {
        if (firedStages.has(stage)) continue;
        if (elapsedMinutes < stageMinutes[stage]) continue;
        firedStages.add(stage);
        const missing = contracts.filter((contract) =>
          isUnmet(contract, startMs),
        );
        if (missing.length === 0) {
          pi.appendEntry("rsibench:pacing", {
            kind: "pacing_satisfied",
            stage,
            elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
          });
          continue;
        }
        pi.appendEntry("rsibench:pacing", {
          kind: "pacing_steer",
          stage,
          elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
          unmet: missing,
        });
        pi.sendMessage(
          {
            customType: "rsibench-pacing",
            content: stageMessage(stage, stageMinutes[stage], missing),
            display: false,
          },
          { deliverAs: "steer", triggerTurn: true },
        );
      }
    } catch {
      // Pacing hints must never break the session.
    }
  });
}
