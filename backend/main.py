import uvicorn
import sys
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import traceback

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import api_router

# 실행 파일 기준 경로 결정 (PyInstaller 지원)
if getattr(sys, 'frozen', False):
    # PyInstaller로 패키징된 경우
    BASE_DIR = Path(sys.executable).parent
    INTERNAL_DIR = BASE_DIR / "_internal"
else:
    # 개발 환경
    BASE_DIR = Path(__file__).parent
    INTERNAL_DIR = BASE_DIR

# 정적 파일 경로 (PyInstaller는 _internal 폴더에 데이터를 넣음)
STATIC_DIR = INTERNAL_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행"""
    # Startup
    init_db()
    print(f"[START] {settings.APP_NAME} v{settings.APP_VERSION}")
    yield
    # Shutdown
    print(f"[STOP] {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Agent Web App - Forecast 매출 계산 시스템",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api")


# 허용된 Origin 목록
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
]


# 전역 예외 핸들러 - 서버 에러 시에도 CORS 헤더 포함
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """서버 내부 에러 발생 시 로깅 및 JSON 응답 (CORS 헤더 포함)"""
    print(f"[ERROR] {request.method} {request.url}", file=sys.stderr)
    print(f"[ERROR] {type(exc).__name__}: {exc}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.stderr.flush()

    # Origin 헤더 확인
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }

    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=headers
    )


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}


@app.get("/api-status")
async def api_status():
    """API 상태 확인 (개발용)"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


# 정적 파일 서빙 설정 (프로덕션/포터블 모드)
def setup_static_files():
    """정적 파일 서빙 설정"""
    if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
        print(f"[INFO] Static files found at: {STATIC_DIR}")

        # assets 폴더 마운트 (JS, CSS 등)
        assets_dir = STATIC_DIR / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        # 기타 정적 파일들 (favicon, etc.)
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static_root")

        return True
    return False


# 정적 파일 모드 확인
STATIC_MODE = setup_static_files()


@app.get("/")
async def root():
    """루트 - 프론트엔드 또는 API 상태"""
    if STATIC_MODE:
        return FileResponse(STATIC_DIR / "index.html")
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "mode": "development"
    }


# SPA 라우팅 - 정적 파일 모드에서 모든 프론트엔드 경로 처리
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """SPA 라우팅 - 프론트엔드 경로 처리"""
    if not STATIC_MODE:
        return JSONResponse(
            status_code=404,
            content={"detail": "Not found"}
        )

    # API 경로는 이미 위에서 처리됨
    if full_path.startswith("api/"):
        return JSONResponse(
            status_code=404,
            content={"detail": "API endpoint not found"}
        )

    # 정적 파일 확인
    file_path = STATIC_DIR / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)

    # SPA fallback - index.html 반환
    return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import webbrowser
    import threading

    # 포터블 모드에서 브라우저 자동 열기
    if STATIC_MODE:
        def open_browser():
            import time
            time.sleep(1.5)
            webbrowser.open(f"http://127.0.0.1:{settings.PORT}")

        threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=not getattr(sys, 'frozen', False)  # 패키징 시 reload 비활성화
    )
