# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

block_cipher = None

# 프로젝트 경로
backend_dir = Path(r'C:\WORK\app_management\CNC FORECAST\backend')

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
    hooksconfig={},
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
    name='CNC_Forecast',
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
    name='CNC_Forecast',
)
