"""
CNC Forecast - 통합 실행 스크립트
백엔드와 프론트엔드를 동시에 실행합니다.
"""

import subprocess
import sys
import os
import signal
import time
from pathlib import Path

# 프로젝트 루트 디렉토리
ROOT_DIR = Path(__file__).parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

processes = []


def start_backend():
    """백엔드 서버 시작"""
    print("[Backend] Starting FastAPI server on http://127.0.0.1:8000")

    env = os.environ.copy()
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        env=env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    return process


def start_frontend():
    """프론트엔드 서버 시작"""
    print("[Frontend] Starting Vite dev server...")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    return process


def cleanup(signum=None, frame=None):
    """모든 프로세스 종료"""
    print("\n[System] Shutting down all servers...")

    for proc in processes:
        try:
            if sys.platform == "win32":
                proc.terminate()
            else:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except Exception:
            pass

    print("[System] All servers stopped.")
    sys.exit(0)


def main():
    """메인 실행 함수"""
    print("=" * 50)
    print("  CNC Forecast - Development Server")
    print("=" * 50)
    print()

    # 시그널 핸들러 등록
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # 백엔드 시작
    backend_proc = start_backend()
    processes.append(backend_proc)
    time.sleep(2)  # 백엔드가 먼저 시작되도록 대기

    # 프론트엔드 시작
    frontend_proc = start_frontend()
    processes.append(frontend_proc)

    print()
    print("-" * 50)
    print("  Servers are running:")
    print("  - Backend:  http://127.0.0.1:8000")
    print("  - Frontend: http://localhost:5173 (or next available port)")
    print("  - API Docs: http://127.0.0.1:8000/docs")
    print("-" * 50)
    print("  Press Ctrl+C to stop all servers")
    print("-" * 50)
    print()

    # 프로세스 상태 모니터링
    try:
        while True:
            # 프로세스 상태 확인
            backend_alive = backend_proc.poll() is None
            frontend_alive = frontend_proc.poll() is None

            if not backend_alive and not frontend_alive:
                print("[System] All servers have stopped.")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
