from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# History DB (actual records, forecasts, summaries)
HISTORY_DATABASE_URL = f"sqlite:///{settings.HISTORY_DB_PATH}"
history_engine = create_engine(HISTORY_DATABASE_URL, connect_args={"check_same_thread": False})
HistorySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=history_engine)

# Template DB (learned patterns)
TEMPLATE_DATABASE_URL = f"sqlite:///{settings.TEMPLATE_DB_PATH}"
template_engine = create_engine(TEMPLATE_DATABASE_URL, connect_args={"check_same_thread": False})
TemplateSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=template_engine)

Base = declarative_base()


def get_history_db():
    db = HistorySessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_template_db():
    db = TemplateSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize all database tables"""
    from app.models import actual_models, template_models
    Base.metadata.create_all(bind=history_engine)
    Base.metadata.create_all(bind=template_engine)
