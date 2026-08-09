import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// M2 State: bound oversized command output so the deliverable goal stays salient.
//
// Evidence (step_06 clean failures, current harness 5678). The dominant
// zero-reward pattern is a timeout kill: the agent writes a stub deliverable,
// then sinks into many turns of read-only investigation (objdump/strings/grep/
// hexdump via bash) and is killed by the externally enforced task limit before
// it verifies or completes the artifact. M3 already sends deliverable-first
// prose (accepted round 4) but rounds 3/5/6 all regressed when m3_control was
// edited further, so the M3 prose lever is exhausted.
//
// The repeated observable across the FAILING reverse-engineering runs is
// oversized *bash* tool results: gcode-to-text r0/r1/r2 (40KB/29KB/33KB),
// path-tracing-reverse r1 (27KB), raman-fitting r2 (33KB). These dumps
// (disassembly/strings/hex) dominate the provider context, inflate tokens per
// turn, and bury the deliverable contract. The same >20KB pattern is ABSENT
// from clean passes: cobol-modernization, feal-linear-cryptanalysis, and
// largest-eigenval never produce a bash result over ~3KB. So a >20KB bash
// result is a precise, task-general signal of the investigation sink that
// precedes a timeout kill, and it does not fire on clean passes.
//
// Mechanism: a `tool_result` hook (sanctioned M2 "reshape a diagnosed oversized
// observation" pattern) that bounds bash text results above BASH_MAX_CHARS to a
// head + tail slice with a truncation marker. It preserves exit status / error
// metadata (details and isError are untouched) and the actionable boundaries of
// command output (command echo + structure at the head; errors / final summary
// at the tail). The marker tells the agent the middle was elided and to re-run a
// narrower command (grep / specific flags / offset) if it needs the elided part
// — nudging the targeted investigation that clean passes already use. `read`
// results (line-numbered file content) are deliberately NOT reshaped, and only
// bash text above the threshold is touched, so normal-sized output is unchanged.
//
// Trigger replay over step_06 (BASH_MAX_CHARS = 24000):
//   fires on failing runs: gcode r0 (40KB), gcode r1 (29KB), gcode r2 (33KB),
//   path-tracing r1 (27KB), raman r2 (33KB) = 5 failing runs across 3 tasks.
//   Does NOT fire on: path-tracing r0/r2 (max bash 9.7KB/19KB), raman r0/r1
//   (4.8KB/6.7KB) — those are below threshold and untouched — nor on any clean
//   pass (cobol/feal/largest-eigenval max bash <3KB). Clean-pass exposure: 0.
//
// Uncertainty: this is the smallest low-exposure M2 mechanism supported by the
// strongest repeated clean-failure signal. It plausibly slows context growth on
// the investigation sink (more effective turns before the external limit) and
// keeps the deliverable goal from being buried by dump noise. It does not by
// itself construct verification; it removes a diagnosed context burden. M3
// remains the accepted round-4 controller and is intentionally unchanged.

const BASH_MAX_CHARS = 24000;
const HEAD_CHARS = 9000;
const TAIL_CHARS = 6000;

type TextContent = { type: "text"; text: string };

function isTextContent(c: unknown): c is TextContent {
  return (
    typeof c === "object" &&
    c !== null &&
    (c as { type?: unknown }).type === "text" &&
    typeof (c as { text?: unknown }).text === "string"
  );
}

export default function install(pi: ExtensionAPI): void {
  pi.on("tool_result", async (event) => {
    if (event.toolName !== "bash") return;
    const content = event.content;
    if (!Array.isArray(content) || content.length === 0) return;

    let changed = false;
    const reshaped = content.map((item) => {
      if (!isTextContent(item)) return item;
      const text = item.text;
      if (text.length <= BASH_MAX_CHARS) return item;

      changed = true;
      const head = text.slice(0, HEAD_CHARS);
      const tail = text.slice(text.length - TAIL_CHARS);
      const elided = text.length - HEAD_CHARS - TAIL_CHARS;
      const marker =
        `\n\n[... rsibench-m2: elided ${elided} middle chars of a ${text.length}-char ` +
        `command output to keep context focused on the deliverable. Re-run a ` +
        `narrower command (e.g. grep, specific flags, or head/tail) if you need ` +
        `the elided part. The first ${HEAD_CHARS} and last ${TAIL_CHARS} chars ` +
        `are shown above and below. ...]\n\n`;
      return { type: "text" as const, text: head + marker + tail };
    });

    if (!changed) return;

    pi.appendEntry("rsibench:mechanism", {
      kind: "state_reshape",
      trigger: "oversized_bash_result",
      toolName: "bash",
      originalChars: content
        .filter(isTextContent)
        .reduce((n, c) => n + c.text.length, 0),
      isError: event.isError,
    });

    return { content: reshaped };
  });
}
