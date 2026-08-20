from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        check=check,
        text=True,
        capture_output=True,
    )


def copy_protocol(repo: Path) -> None:
    for relative in (
        "scripts/build_leaderboard.py",
        "scripts/submission_common.py",
        "scripts/validate_submission.py",
        "scripts/record_submission.py",
        "scripts/publish_submission.py",
    ):
        target = repo / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, target)


def init_repo(repo: Path) -> None:
    repo.mkdir()
    git(repo, "init")
    git(repo, "config", "user.email", "test@example.invalid")
    git(repo, "config", "user.name", "RSIBench Test")
    copy_protocol(repo)
    (repo / "trajectories/.gitkeep").parent.mkdir()
    (repo / "trajectories/.gitkeep").write_text("")
    git(repo, "add", ".")
    git(repo, "commit", "-m", "base")


def add_manifest(
    repo: Path,
    *,
    inject_identity: bool = False,
    run_id: str = "formal-terminal-glm-5-2-pi-test",
    bench: str = "terminal",
) -> Path:
    artifact = repo / f"trajectories/{bench}-glm-5-2-pi" / run_id
    artifact.mkdir(parents=True)
    payload = artifact / "result.json"
    payload.write_text("{}\n")
    manifest = {
        "schema_version": 1,
        "source_run_id": run_id,
        "subset": bench,
        "published_at_utc": "2026-08-13T11:59:00Z",
        "bench": bench,
        "model": "glm-5-2",
        "harness": "pi",
        "protocol": {
            "num_steps": 5,
            "train_rollouts_per_task": 3,
            "test_rollouts_per_task": 3,
            "test_state_policy": "all-accepted" if bench == "terminal" else "endpoints",
            "test_evaluation_order": [0, 1],
        },
        "score_and_cost": {"V_test_A0": 0.1, "V_test_AT": 0.2, "delta_test": 0.1},
        "candidate_history": {
            "schema_version": 1,
            "policy": "preserve_every_meta_agent_candidate",
            "round_count": 5,
            "accepted_rounds": [1],
            "candidates": [
                {
                    "round": round_no,
                    "candidate_id": f"round-{round_no:02d}",
                    "status": "accepted" if round_no == 1 else "rejected",
                    "accepted": round_no == 1,
                    "score_status": "scored",
                    "candidate_score": 0.1 + round_no / 100,
                }
                for round_no in range(1, 6)
            ],
        },
        "artifacts": [{
            "path": "result.json",
            "bytes": payload.stat().st_size,
            "sha256": hashlib.sha256(payload.read_bytes()).hexdigest(),
        }],
    }
    if bench == "terminal":
        manifest["ablations"] = {
            "method": "keep_one_changed_module",
            "layers": {},
        }
    if inject_identity:
        manifest["github_login"] = "forged-user"
    path = artifact / "trajectory-manifest.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    return path


class SubmissionProtocolTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary.name) / "data"
        init_repo(self.repo)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_validator_checkout_materializes_lfs_artifacts(self) -> None:
        workflow = (
            ROOT / ".github/workflows/validate-submission.yml"
        ).read_text()
        checkout = workflow.split("- uses: actions/checkout@v4", 1)[1].split(
            "- uses: actions/setup-python@v5", 1
        )[0]
        self.assertIn("lfs: true", checkout)

    def commit_submission(self, *, inject_identity: bool = False) -> tuple[str, str]:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        add_manifest(self.repo, inject_identity=inject_identity)
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "submission")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        return base, head

    def test_pr_validator_rejects_submitter_controlled_identity(self) -> None:
        base, head = self.commit_submission(inject_identity=True)
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"), "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("submitter-controlled identity is forbidden", completed.stdout + completed.stderr)

    def test_merge_receipt_builds_github_linked_site_feed(self) -> None:
        base, head = self.commit_submission()
        validated = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"), "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertEqual(validated.returncode, 0, validated.stderr)
        recorded = subprocess.run(
            [
                sys.executable, str(self.repo / "scripts/record_submission.py"),
                "--repo-root", str(self.repo), "--repository", "owner/rsibench-data",
                "--github-login", "alice", "--github-user-id", "123", "--pull-request", "17",
                "--merge-commit", head, "--base-commit", base, "--head-commit", head,
                "--merged-at", "2026-08-13T12:00:00Z", "--merged-by-github", "maintainer",
            ],
            text=True, capture_output=True,
        )
        self.assertEqual(recorded.returncode, 0, recorded.stderr)
        built = subprocess.run(
            [sys.executable, str(self.repo / "scripts/build_leaderboard.py")],
            text=True, capture_output=True,
        )
        self.assertEqual(built.returncode, 0, built.stderr)
        feed = json.loads((self.repo / "leaderboard/submissions.json").read_text())
        self.assertEqual(len(feed["results"]), 1)
        result = feed["results"][0]
        self.assertEqual(result["configuration"], "glm-5-2__pi")
        self.assertEqual(result["benchmark"], "terminal")
        self.assertEqual(result["baseline_score"], 10.0)
        self.assertEqual(result["final_score"], 20.0)
        self.assertEqual(result["lift"], 10.0)
        self.assertEqual(result["submission"]["github_login"], "alice")
        self.assertEqual(result["submission"]["github_user_id"], 123)
        self.assertEqual(result["submission"]["pull_request"], 17)
        self.assertEqual(result["submission_sequence"], 1)
        self.assertEqual(result["resubmission_increment"], 0)
        self.assertEqual(len(result["candidate_history"]["candidates"]), 5)

    def test_record_receipt_from_api_manifest_list_is_idempotent(self) -> None:
        base, head = self.commit_submission()
        manifest_list = self.repo.parent / "added-manifests.txt"
        manifest_list.write_text(
            "trajectories/terminal-glm-5-2-pi/"
            "formal-terminal-glm-5-2-pi-test/trajectory-manifest.json\n"
        )
        command = [
            sys.executable, str(self.repo / "scripts/record_submission.py"),
            "--repo-root", str(self.repo), "--repository", "owner/rsibench-data",
            "--github-login", "alice", "--github-user-id", "123",
            "--pull-request", "17", "--merge-commit", head,
            "--base-commit", base, "--head-commit", head,
            "--merged-at", "2026-08-13T12:00:00Z",
            "--merged-by-github", "maintainer",
            "--added-manifests-file", str(manifest_list),
        ]
        first = subprocess.run(command, text=True, capture_output=True)
        second = subprocess.run(command, text=True, capture_output=True)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("already exists", second.stdout)
        receipts = list((self.repo / "submissions/github").glob("pr-*.json"))
        self.assertEqual([path.name for path in receipts], ["pr-17.json"])

    def test_publish_script_backfills_and_replays_without_new_commit(self) -> None:
        base, head = self.commit_submission()
        remote = self.repo.parent / "remote.git"
        remote.mkdir()
        git(remote, "init", "--bare")
        git(self.repo, "remote", "add", "origin", str(remote))
        git(self.repo, "push", "-u", "origin", "HEAD:main")
        worker = self.repo.parent / "worker"
        git(self.repo.parent, "clone", str(remote), str(worker))
        git(worker, "checkout", "main")
        pull = self.repo.parent / "pull.json"
        pull.write_text(json.dumps({
            "number": 17,
            "merged": True,
            "merge_commit_sha": head,
            "base": {"sha": base},
            "head": {"sha": head},
            "merged_at": "2026-08-13T12:00:00Z",
            "merged_by": {"login": "maintainer"},
            "user": {"login": "alice", "id": 123},
        }))
        manifests = self.repo.parent / "api-manifests.txt"
        manifests.write_text(
            "trajectories/terminal-glm-5-2-pi/"
            "formal-terminal-glm-5-2-pi-test/trajectory-manifest.json\n"
        )
        command = [
            sys.executable, str(worker / "scripts/publish_submission.py"),
            "--repo-root", str(worker), "--repository", "owner/rsibench-data",
            "--pull-request-json", str(pull),
            "--added-manifests-file", str(manifests),
            "--retry-delay", "0",
        ]
        first = subprocess.run(command, text=True, capture_output=True)
        self.assertEqual(first.returncode, 0, first.stderr)
        published = git(remote, "rev-parse", "refs/heads/main").stdout.strip()
        second = subprocess.run(command, text=True, capture_output=True)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("already published", second.stdout)
        self.assertEqual(
            git(remote, "rev-parse", "refs/heads/main").stdout.strip(),
            published,
        )
        git(worker, "fetch", "origin", "main")
        receipt = json.loads(
            git(worker, "show", "origin/main:submissions/github/pr-17.json").stdout
        )
        self.assertEqual(receipt["github_login"], "alice")
        feed = json.loads(
            git(worker, "show", "origin/main:leaderboard/submissions.json").stdout
        )
        self.assertEqual(feed["generated_from_receipts"], 1)

    def test_repeated_cell_submissions_are_preserved_and_numbered(self) -> None:
        base, head = self.commit_submission()
        subprocess.run(
            [sys.executable, str(self.repo / "scripts/record_submission.py"),
             "--repo-root", str(self.repo), "--repository", "owner/rsibench-data",
             "--github-login", "alice", "--github-user-id", "123", "--pull-request", "17",
             "--merge-commit", head, "--base-commit", base, "--head-commit", head,
             "--merged-at", "2026-08-13T12:00:00Z", "--merged-by-github", "maintainer"],
            check=True,
        )
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "receipt one")
        base_two = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        second_run = "formal-terminal-glm-5-2-pi-test-two"
        add_manifest(self.repo, run_id=second_run)
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "submission two")
        head_two = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        subprocess.run(
            [sys.executable, str(self.repo / "scripts/record_submission.py"),
             "--repo-root", str(self.repo), "--repository", "owner/rsibench-data",
             "--github-login", "bob", "--github-user-id", "456", "--pull-request", "18",
             "--merge-commit", head_two, "--base-commit", base_two, "--head-commit", head_two,
             "--merged-at", "2026-08-13T13:00:00Z", "--merged-by-github", "maintainer"],
            check=True,
        )
        subprocess.run([sys.executable, str(self.repo / "scripts/build_leaderboard.py")], check=True)
        results = json.loads((self.repo / "leaderboard/submissions.json").read_text())["results"]
        self.assertEqual(len(results), 2)
        self.assertEqual([row["submission_sequence"] for row in results], [1, 2])
        self.assertEqual([row["resubmission_increment"] for row in results], [0, 1])

    def test_pr_validator_rejects_unindexed_trajectory_file(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(self.repo)
        (manifest.parent / "unindexed.txt").write_text("not covered by manifest\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "submission")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"), "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("outside manifest checksums", completed.stdout + completed.stderr)

    def test_pr_validator_rejects_wrong_held_out_order(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(self.repo)
        value = json.loads(manifest.read_text())
        value["protocol"]["test_evaluation_order"] = [0, 1, 1]
        manifest.write_text(json.dumps(value, indent=2) + "\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "bad order")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("A0 and A_last", completed.stdout + completed.stderr)

    def test_pr_validator_rejects_missing_endpoint_score(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(self.repo)
        value = json.loads(manifest.read_text())
        value["score_and_cost"].pop("V_test_AT")
        manifest.write_text(json.dumps(value, indent=2) + "\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "missing final score")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("required V_test_AT must be finite", completed.stdout + completed.stderr)

    def test_pr_validator_rejects_avg1_completed_ablation(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(self.repo)
        value = json.loads(manifest.read_text())
        value["ablations"] = {
            "method": "keep_one_changed_module",
            "layers": {},
        }
        value["ablations"]["layers"] = {
            "pi_core_source": {
                "status": "completed",
                "rollouts_per_task": 1,
                "component_scores": {"PI_SRC_AGENT_LOOP": {"mean_reward": 0.2}},
            }
        }
        manifest.write_text(json.dumps(value, indent=2) + "\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "bad ablation repeats")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("must use avg@3", completed.stdout + completed.stderr)

    def test_pr_validator_accepts_optional_all_accepted_curve(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(
            self.repo,
            bench="science",
            run_id="formal-science-glm-5-2-pi-test",
        )
        value = json.loads(manifest.read_text())
        value["protocol"]["test_state_policy"] = "all-accepted"
        value["protocol"]["test_evaluation_order"] = [0, 1]
        manifest.write_text(json.dumps(value, indent=2) + "\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "optional curve")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_pr_validator_accepts_nonterminal_endpoints_without_ablation(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        add_manifest(
            self.repo,
            bench="science",
            run_id="formal-science-glm-5-2-pi-endpoints",
        )
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "nonterminal endpoints")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_pr_validator_rejects_terminal_endpoints_without_ablation(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(self.repo)
        value = json.loads(manifest.read_text())
        value["protocol"]["test_state_policy"] = "endpoints"
        value.pop("ablations")
        manifest.write_text(json.dumps(value, indent=2) + "\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "invalid terminal minimum")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("Terminal requires test_state_policy=all-accepted", completed.stdout + completed.stderr)

    def test_pr_validator_accepts_explicit_legacy_terminal_endpoints(self) -> None:
        base = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        manifest = add_manifest(self.repo)
        value = json.loads(manifest.read_text())
        value["protocol"].update(
            submission_profile="legacy-endpoints-v1",
            test_state_policy="endpoints",
        )
        value.pop("ablations")
        manifest.write_text(json.dumps(value, indent=2) + "\n")
        git(self.repo, "add", "trajectories")
        git(self.repo, "commit", "-m", "audited legacy endpoints")
        head = git(self.repo, "rev-parse", "HEAD").stdout.strip()
        completed = subprocess.run(
            [sys.executable, str(self.repo / "scripts/validate_submission.py"),
             "--repo-root", str(self.repo), "--base", base, "--head", head],
            text=True, capture_output=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)


class SubmissionWorkflowContractTest(unittest.TestCase):
    def test_receipt_workflow_supports_lossless_backfill_and_push_retry(self) -> None:
        workflow = (ROOT / ".github/workflows/record-submission-identity.yml").read_text()
        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn("pull_request:", workflow)
        self.assertIn("scripts/publish_submission.py", workflow)
        self.assertIn("--max-attempts 8", workflow)
        self.assertIn("gh api --paginate", workflow)
        self.assertNotIn("queue: max", workflow)
        self.assertNotIn("group: rsibench-submission-receipts", workflow)


if __name__ == "__main__":
    unittest.main()
