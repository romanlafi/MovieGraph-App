import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    "staging": ("staging", "preview", "wrangler.preview.jsonc"),
    "production": ("main", "deploy", "wrangler.jsonc"),
}


def deployment_command(target: str, branch: str) -> list[str]:
    expected_branch, operation, config = TARGETS[target]
    if branch != expected_branch:
        raise RuntimeError(f"{target} requires Git branch {expected_branch}; no deployment was started")
    command = ["uvx", "--from", "workers-py", "pywrangler", operation, "--config", config]
    if target == "staging":
        command.extend(["--name", "staging"])
    return command


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy staging to PRE or main to production; never migrate databases")
    parser.add_argument("target", choices=TARGETS)
    parser.add_argument("--check", action="store_true", help="Check branch selection without deploying")
    arguments = parser.parse_args()
    try:
        branch = os.environ.get("WORKERS_CI_BRANCH") or subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=ROOT, text=True).strip()
        command = deployment_command(arguments.target, branch)
        if arguments.check:
            print(" ".join(command))
            return 0
        if not (ROOT / "front" / "dist" / "index.html").is_file():
            raise RuntimeError("Build the frontend first: npm --prefix front run build")
        if shutil.which("uvx") is None:
            raise RuntimeError("Install the documented Worker toolchain (uv) before deployment")
        return subprocess.call(command, cwd=ROOT)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
