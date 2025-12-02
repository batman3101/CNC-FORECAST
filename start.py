"""
CNC Forecast - 통합 실행 스크립트
개발 환경: 백엔드와 프론트엔드를 subprocess로 실행
패키징 환경: 백엔드 직접 실행 + 정적 파일 서빙
"""

import subprocess
import sys
import os
import signal
import time
from pathlib import Path
import webbrowser
import threading


def is_frozen():
    """PyInstaller로 패키징된 환경인지 확인"""
    return getattr(sys, 'frozen', False)


def setup_frozen_stdio():
    """PyInstaller 윈도우 모드에서 stdout/stderr 설정"""
    if is_frozen() and sys.stdout is None:
        # 윈도우 모드에서는 stdout/stderr가 None이므로 devnull로 리다이렉트
        sys.stdout = open(os.devnull, 'w', encoding='utf-8')
        sys.stderr = open(os.devnull, 'w', encoding='utf-8')


def get_base_path():
    """실행 환경에 따른 기본 경로 반환"""
    if is_frozen():
        return Path(sys.executable).parent
    return Path(__file__).parent


# 프로젝트 루트 디렉토리
ROOT_DIR = get_base_path()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

processes = []


def start_backend_dev():
    """개발 환경: 백엔드 서버 시작 (subprocess)"""
    print("[Backend] Starting FastAPI server on http://127.0.0.1:8000")

    env = os.environ.copy()
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        env=env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    return process


def start_frontend_dev():
    """개발 환경: 프론트엔드 서버 시작"""
    print("[Frontend] Starting Vite dev server...")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )
    return process


def run_production_server():
    """프로덕션 환경: 백엔드 직접 실행 (정적 파일 서빙 포함)"""
    # main 모듈 import (패키징 시 main.py가 root에 포함됨)
    import main
    import uvicorn

    # 3초 후 브라우저 자동 열기
    def open_browser():
        time.sleep(3)
        webbrowser.open("http://127.0.0.1:8000")

    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()

    # 윈도우 모드에서는 로깅 설정 비활성화 (stdout이 None이라 오류 발생)
    uvicorn.run(main.app, host="127.0.0.1", port=8000, log_config=None)


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


def main_dev():
    """개발 환경 메인 실행 함수"""
    print("=" * 50)
    print("  CNC Forecast - Development Server")
    print("=" * 50)
    print()

    # 시그널 핸들러 등록
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # 백엔드 시작
    backend_proc = start_backend_dev()
    processes.append(backend_proc)
    time.sleep(2)  # 백엔드가 먼저 시작되도록 대기

    # 프론트엔드 시작
    frontend_proc = start_frontend_dev()
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


def main():
    """메인 함수 - 환경에 따라 분기"""
    # PyInstaller 윈도우 모드에서 stdout/stderr 설정
    setup_frozen_stdio()

    if is_frozen():
        # PyInstaller로 패키징된 환경
        run_production_server()
    else:
        # 개발 환경
        main_dev()


if __name__ == "__main__":
    main()
