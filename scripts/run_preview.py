import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "front"
PYTHON = ROOT / ".venv" / "Scripts" / "python.exe"
WORKER_PORT = 8787
FRONTEND_PORT = 5173


def port_is_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.25):
            return True
    except OSError:
        return False


def wait_for_port(process: subprocess.Popen, port: int, label: str) -> None:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"{label} exited during startup with code {process.returncode}.")
        if port_is_open(port):
            return
        time.sleep(0.25)
    raise RuntimeError(f"{label} did not open port {port} within 60 seconds.")


def stop_process_tree(process: subprocess.Popen) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            check=False,
            capture_output=True,
            text=True,
        )
    else:
        process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def main() -> int:
    if not PYTHON.is_file():
        print(f"Project Python environment not found: {PYTHON}", flush=True)
        return 1
    if not (FRONTEND / "node_modules").is_dir():
        print("Frontend dependencies are missing. Run npm ci in the front directory once.", flush=True)
        return 1
    if shutil.which("npm.cmd" if os.name == "nt" else "npm") is None:
        print("npm was not found on PyCharm's PATH. Configure the Node.js interpreter in PyCharm and retry.", flush=True)
        return 1
    for port in (WORKER_PORT, FRONTEND_PORT):
        if port_is_open(port):
            print(f"Port {port} is already in use. Stop the process using it and run this configuration again.", flush=True)
            return 1

    environment = os.environ.copy()
    scripts_directory = str(PYTHON.parent)
    environment["PATH"] = scripts_directory + os.pathsep + environment.get("PATH", "")
    environment["PYTHONUNBUFFERED"] = "1"
    environment["VITE_API_PROD_URL"] = f"http://127.0.0.1:{FRONTEND_PORT}/api/v1"

    processes: list[subprocess.Popen] = []
    try:
        print("Starting MovieGraph Worker on http://127.0.0.1:8787 ...", flush=True)
        worker = subprocess.Popen(
            [str(PYTHON), "-m", "pywrangler", "dev", "--ip", "127.0.0.1", "--port", str(WORKER_PORT)],
            cwd=ROOT,
            env=environment,
        )
        processes.append(worker)
        wait_for_port(worker, WORKER_PORT, "Worker")

        print("Starting MovieGraph frontend on http://127.0.0.1:5173 ...", flush=True)
        frontend_command = "npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort" if os.name == "nt" else "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
        frontend = subprocess.Popen(
            ["cmd.exe", "/d", "/s", "/c", frontend_command] if os.name == "nt" else frontend_command,
            cwd=FRONTEND,
            env=environment,
            shell=os.name != "nt",
        )
        processes.append(frontend)
        wait_for_port(frontend, FRONTEND_PORT, "Frontend")
        print("MovieGraph preview is ready at http://127.0.0.1:5173/", flush=True)
        print("TMDB search is enabled; database-backed features are not mounted in this preview.", flush=True)

        while True:
            for process in processes:
                if process.poll() is not None:
                    raise RuntimeError(f"A MovieGraph process exited with code {process.returncode}.")
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("Stopping MovieGraph preview...", flush=True)
    except RuntimeError as error:
        print(str(error), flush=True)
        return 1
    finally:
        for process in reversed(processes):
            stop_process_tree(process)
    return 0


if __name__ == "__main__":
    sys.exit(main())
