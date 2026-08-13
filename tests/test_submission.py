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


def add_manifest(repo: Path, *, inject_identity: bool = False) -> Path:
    run_id = "formal-terminal-glm-5-2-pi-test"
    artifact = repo / "trajectories/terminal-glm-5-2-pi" / run_id
    artifact.mkdir(parents=True)
    payload = artifact / "result.json"
    payload.write_text("{}\n")
    manifest = {
        "schema_version": 1,
        "source_run_id": run_id,
        "subset": "terminal",
        "published_at_utc": "2026-08-13T11:59:00Z",
        "bench": "terminal",
        "model": "glm-5-2",
        "harness": "pi",
        "protocol": {
            "num_steps": 5,
            "train_rollouts_per_task": 3,
            "test_rollouts_per_task": 3,
        },
        "score_and_cost": {"V_test_A0": 0.1, "V_test_AT": 0.2, "delta_test": 0.1},
        "artifacts": [{
            "path": "result.json",
            "bytes": payload.stat().st_size,
            "sha256": hashlib.sha256(payload.read_bytes()).hexdigest(),
        }],
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


if __name__ == "__main__":
    unittest.main()
