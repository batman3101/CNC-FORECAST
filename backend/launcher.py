"""
Forecast Calculator Launcher
Windows 실행파일로 패키징되어 원클릭 실행 지원

기능:
- FastAPI 서버 자동 시작
- 브라우저 자동 열기
- 시스템 트레이 아이콘
"""
import os
import sys
import time
import threading
import webbrowser
import subprocess
from pathlib import Path

# 실행 파일 경로 설정
if getattr(sys, 'frozen', False):
    # PyInstaller 빌드된 exe
    BASE_DIR = Path(sys.executable).parent
else:
    # 개발 환경
    BASE_DIR = Path(__file__).parent

# 환경 변수 설정
os.environ['PRICE_MASTER_PATH'] = str(BASE_DIR / 'data' / 'price_master.xlsx')
os.environ['HISTORY_DB_PATH'] = str(BASE_DIR / 'data' / 'history.db')
os.environ['TEMPLATE_DB_PATH'] = str(BASE_DIR / 'data' / 'templates.db')

HOST = '127.0.0.1'
PORT = 8000
URL = f'http://{HOST}:{PORT}'


def start_server():
    """FastAPI 서버 시작"""
    import uvicorn
    from main import app

    uvicorn.run(app, host=HOST, port=PORT, log_level='info')


def open_browser():
    """서버 시작 후 브라우저 열기"""
    # 서버가 시작될 때까지 대기
    time.sleep(2)
    webbrowser.open(URL)


def create_tray_icon():
    """시스템 트레이 아이콘 생성"""
    try:
        import pystray
        from PIL import Image, ImageDraw

        # 아이콘 이미지 생성 (간단한 차트 아이콘)
        def create_icon_image():
            size = 64
            image = Image.new('RGB', (size, size), 'white')
            draw = ImageDraw.Draw(image)

            # 간단한 막대 그래프 그리기
            bar_width = 12
            bars = [30, 45, 35, 50]
            colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']

            for i, (height, color) in enumerate(zip(bars, colors)):
                x = 8 + i * (bar_width + 4)
                draw.rectangle([x, size - 8 - height, x + bar_width, size - 8], fill=color)

            return image

        def on_open(icon, item):
            webbrowser.open(URL)

        def on_quit(icon, item):
            icon.stop()
            os._exit(0)

        menu = pystray.Menu(
            pystray.MenuItem('브라우저 열기', on_open),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('종료', on_quit)
        )

        icon = pystray.Icon(
            'Forecast Calculator',
            create_icon_image(),
            'Forecast 매출 계산기',
            menu
        )

        icon.run()

    except ImportError:
        # pystray가 없으면 콘솔 모드로 실행
        print(f"서버 실행 중: {URL}")
        print("종료하려면 Ctrl+C를 누르세요")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("서버 종료")
            sys.exit(0)


def main():
    """메인 함수"""
    print("=" * 50)
    print("  Forecast 매출 계산기 v1.2.0")
    print("=" * 50)
    print(f"\n서버 시작 중... {URL}\n")

    # 데이터 디렉토리 확인/생성
    data_dir = BASE_DIR / 'data'
    data_dir.mkdir(exist_ok=True)

    # 서버를 별도 스레드에서 시작
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 브라우저 열기 (별도 스레드)
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()

    # 시스템 트레이 아이콘 (메인 스레드)
    create_tray_icon()


if __name__ == '__main__':
    main()
