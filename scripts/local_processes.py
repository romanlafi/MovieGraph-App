import os
import socket
import subprocess
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "front"
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

def wait_for_local_api(process: subprocess.Popen, port: int) -> None:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Worker exited before its API became ready")
        try:
            with urlopen(f"http://127.0.0.1:{port}/api/health", timeout=2) as response:
                if response.status == 200:
                    break
        except (URLError, TimeoutError):
            pass
        time.sleep(0.25)
    else:
        raise RuntimeError("Worker API did not become ready within 90 seconds")
    try:
        urlopen(f"http://127.0.0.1:{port}/api/v1/users/me", timeout=5).close()
    except HTTPError as error:
        if error.code == 401:
            return
    except (URLError, TimeoutError):
        pass
    raise RuntimeError("Local account routes are not ready; expected protected /api/v1/users/me (401)")
