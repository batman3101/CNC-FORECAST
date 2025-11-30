from pydantic_settings import BaseSettings
from pathlib import Path
import sys
import os


def get_base_path() -> Path:
    """실행 환경에 따른 기본 경로 반환 (데이터 저장용)"""
    if getattr(sys, 'frozen', False):
        # PyInstaller로 패키징된 경우 - exe 파일 옆에 data 폴더 생성
        return Path(sys.executable).parent
    else:
        # 개발 환경 - backend 폴더 기준
        return Path(__file__).parent.parent.parent


def get_internal_path() -> Path:
    """PyInstaller _internal 경로 반환 (패키징된 데이터 접근용)"""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent / "_internal"
    else:
        return Path(__file__).parent.parent.parent


# 기본 경로 설정
BASE_PATH = get_base_path()
INTERNAL_PATH = get_internal_path()


class Settings(BaseSettings):
    # API Keys
    GEMINI_API_KEY: str = ""

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Paths (동적으로 계산)
    @property
    def data_dir(self) -> Path:
        """데이터 디렉토리 경로"""
        data_path = BASE_PATH / "data"
        data_path.mkdir(exist_ok=True)
        return data_path

    @property
    def PRICE_MASTER_PATH(self) -> str:
        return str(self.data_dir / "price_master.xlsx")

    @property
    def HISTORY_DB_PATH(self) -> str:
        return str(self.data_dir / "history.db")

    @property
    def TEMPLATE_DB_PATH(self) -> str:
        return str(self.data_dir / "templates.db")

    # Template Learning
    TEMPLATE_MIN_CONFIDENCE: float = 0.7
    TEMPLATE_AUTO_DISABLE_THRESHOLD: float = 0.7

    # App Info
    APP_NAME: str = "Forecast Calculator"
    APP_VERSION: str = "1.0.0"

    class Config:
        env_file = ".env"
        extra = "ignore"  # 알 수 없는 필드 무시


# .env 파일 경로 설정
env_file_path = BASE_PATH / ".env"
if env_file_path.exists():
    os.environ.setdefault("ENV_FILE", str(env_file_path))

settings = Settings(_env_file=str(env_file_path) if env_file_path.exists() else None)
