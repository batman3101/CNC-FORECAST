"""
CNC Forecast - 포터블 빌드 스크립트
Windows 포터블 실행 파일 패키지를 생성합니다.
"""

import subprocess
import shutil
import sys
import os
from pathlib import Path

# 프로젝트 경로
ROOT_DIR = Path(__file__).parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DIST_DIR = ROOT_DIR / "dist"
BUILD_DIR = ROOT_DIR / "build"

# 출력 설정
APP_NAME = "CNC_Forecast"
VERSION = "1.0.0"


def print_step(msg: str):
    """단계 출력"""
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}\n")


def clean_build():
    """이전 빌드 정리"""
    print_step("1. 이전 빌드 정리")

    for dir_path in [DIST_DIR, BUILD_DIR, BACKEND_DIR / "static"]:
        if dir_path.exists():
            print(f"  삭제 중: {dir_path}")
            shutil.rmtree(dir_path)

    print("  완료!")


def build_frontend():
    """프론트엔드 빌드"""
    print_step("2. 프론트엔드 빌드")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    # npm install
    print("  npm install 실행 중...")
    result = subprocess.run(
        [npm_cmd, "install"],
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"  [ERROR] npm install 실패:\n{result.stderr}")
        sys.exit(1)

    # npm run build
    print("  npm run build 실행 중...")
    result = subprocess.run(
        [npm_cmd, "run", "build"],
        cwd=FRONTEND_DIR,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"  [ERROR] npm build 실패:\n{result.stderr}")
        sys.exit(1)

    print("  프론트엔드 빌드 완료!")


def copy_frontend_to_static():
    """빌드된 프론트엔드를 backend/static으로 복사"""
    print_step("3. 정적 파일 복사")

    frontend_dist = FRONTEND_DIR / "dist"
    static_dir = BACKEND_DIR / "static"

    if not frontend_dist.exists():
        print(f"  [ERROR] 프론트엔드 빌드 결과 없음: {frontend_dist}")
        sys.exit(1)

    print(f"  복사: {frontend_dist} -> {static_dir}")
    shutil.copytree(frontend_dist, static_dir)
    print("  완료!")


def install_pyinstaller():
    """PyInstaller 설치"""
    print_step("4. PyInstaller 확인")

    try:
        import PyInstaller
        print(f"  PyInstaller {PyInstaller.__version__} 설치됨")
    except ImportError:
        print("  PyInstaller 설치 중...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
        print("  PyInstaller 설치 완료!")


def create_spec_file():
    """PyInstaller spec 파일 생성"""
    print_step("5. PyInstaller spec 파일 생성")

    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

block_cipher = None

# 프로젝트 경로
backend_dir = Path(r'{BACKEND_DIR}')

# 데이터 파일 수집
datas = [
    # 정적 파일 (빌드된 프론트엔드)
    (str(backend_dir / 'static'), 'static'),
    # 데이터 폴더 구조
    (str(backend_dir / 'data'), 'data'),
    # .env 파일 (있으면)
]

# .env 파일 추가 (있는 경우)
env_file = backend_dir / '.env'
if env_file.exists():
    datas.append((str(env_file), '.'))

a = Analysis(
    [str(backend_dir / 'main.py')],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'app',
        'app.api',
        'app.api.routes',
        'app.core',
        'app.core.config',
        'app.core.database',
        'app.models',
        'app.models.actual_models',
        'app.models.template_models',
        'app.services',
        'app.services.excel_service',
        'app.services.llm_service',
        'google.generativeai',
        'PIL',
        'openpyxl',
        'sqlalchemy',
        'pydantic',
        'pydantic_settings',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='{APP_NAME}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # 콘솔 창 표시 (디버깅용, 나중에 False로 변경 가능)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # 아이콘 파일 경로 지정 가능
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='{APP_NAME}',
)
'''

    spec_path = ROOT_DIR / f"{APP_NAME}.spec"
    spec_path.write_text(spec_content, encoding='utf-8')
    print(f"  생성됨: {spec_path}")
    return spec_path


def ensure_data_folder():
    """데이터 폴더 구조 확인"""
    print_step("6. 데이터 폴더 확인")

    data_dir = BACKEND_DIR / "data"
    data_dir.mkdir(exist_ok=True)

    # 빈 파일들 생성 (PyInstaller가 폴더를 포함하도록)
    placeholder = data_dir / ".gitkeep"
    if not placeholder.exists():
        placeholder.touch()

    print(f"  데이터 폴더: {data_dir}")
    print("  완료!")


def run_pyinstaller(spec_path: Path):
    """PyInstaller 실행"""
    print_step("7. PyInstaller 실행")

    print("  빌드 중... (몇 분 소요될 수 있습니다)")

    result = subprocess.run(
        [sys.executable, "-m", "PyInstaller", str(spec_path), "--clean"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"  [ERROR] PyInstaller 실패:")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)

    print("  PyInstaller 빌드 완료!")


def create_launcher_bat():
    """런처 배치 파일 생성"""
    print_step("8. 런처 스크립트 생성")

    output_dir = DIST_DIR / APP_NAME

    # 시작 배치 파일
    bat_content = f'''@echo off
title CNC Forecast v{VERSION}
echo.
echo  ========================================
echo    CNC Forecast v{VERSION}
echo  ========================================
echo.
echo  서버를 시작합니다...
echo  브라우저가 자동으로 열립니다.
echo.
echo  종료하려면 이 창을 닫으세요.
echo  ========================================
echo.

cd /d "%~dp0"
"{APP_NAME}.exe"
'''

    bat_path = output_dir / "CNC_Forecast_시작.bat"
    bat_path.write_text(bat_content, encoding='cp949')  # Windows 한글 인코딩
    print(f"  생성됨: {bat_path}")


def create_readme():
    """README 파일 생성"""
    print_step("9. README 생성")

    output_dir = DIST_DIR / APP_NAME

    readme_content = f'''CNC Forecast v{VERSION}
========================

사용 방법
---------
1. "CNC_Forecast_시작.bat" 파일을 더블클릭하여 실행
2. 브라우저가 자동으로 열리며 앱이 표시됩니다
3. 종료하려면 콘솔 창을 닫으세요

주의 사항
---------
- 첫 실행 시 Windows 방화벽 경고가 나타날 수 있습니다.
  "개인 네트워크"에 대해 허용해주세요.
- data 폴더에 데이터베이스와 설정 파일이 저장됩니다.

시스템 요구사항
--------------
- Windows 10 이상
- 최소 4GB RAM
- 인터넷 연결 (Gemini API 사용 시)

문의
----
문제가 발생하면 관리자에게 문의하세요.
'''

    readme_path = output_dir / "README.txt"
    readme_path.write_text(readme_content, encoding='utf-8')
    print(f"  생성됨: {readme_path}")


def copy_env_template():
    """환경 설정 템플릿 복사"""
    print_step("10. 환경 설정 파일")

    output_dir = DIST_DIR / APP_NAME

    env_template = '''# CNC Forecast 설정
# Gemini API 키를 입력하세요
GEMINI_API_KEY=your-api-key-here
'''

    # .env.example 생성
    env_example_path = output_dir / ".env.example"
    env_example_path.write_text(env_template, encoding='utf-8')

    # 기존 .env 파일이 있으면 복사
    backend_env = BACKEND_DIR / ".env"
    if backend_env.exists():
        shutil.copy(backend_env, output_dir / ".env")
        print(f"  .env 파일 복사됨")
    else:
        # .env.example을 .env로 복사
        shutil.copy(env_example_path, output_dir / ".env")
        print(f"  .env 템플릿 생성됨 (API 키 설정 필요)")


def print_summary():
    """빌드 결과 요약"""
    print_step("빌드 완료!")

    output_dir = DIST_DIR / APP_NAME

    print(f"  출력 위치: {output_dir}")
    print()
    print("  포함된 파일:")

    if output_dir.exists():
        for item in sorted(output_dir.iterdir()):
            if item.is_file():
                size = item.stat().st_size / 1024 / 1024
                print(f"    - {item.name} ({size:.1f} MB)")
            else:
                print(f"    - {item.name}/ (폴더)")

    print()
    print("  배포 방법:")
    print(f"    1. '{APP_NAME}' 폴더 전체를 ZIP으로 압축")
    print("    2. 사용자에게 전달")
    print("    3. 사용자는 압축 해제 후 'CNC_Forecast_시작.bat' 실행")
    print()


def main():
    """메인 빌드 프로세스"""
    print(f"\n{'#'*60}")
    print(f"  CNC Forecast 포터블 빌드 스크립트")
    print(f"  Version: {VERSION}")
    print(f"{'#'*60}")

    try:
        clean_build()
        build_frontend()
        copy_frontend_to_static()
        install_pyinstaller()
        ensure_data_folder()
        spec_path = create_spec_file()
        run_pyinstaller(spec_path)
        create_launcher_bat()
        create_readme()
        copy_env_template()
        print_summary()

    except Exception as e:
        print(f"\n[ERROR] 빌드 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
