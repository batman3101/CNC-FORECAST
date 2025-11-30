from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, JSON, func
from app.core.database import Base


class ExcelTemplate(Base):
    """학습된 Excel 템플릿"""
    __tablename__ = "excel_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    fingerprint = Column(String(64), unique=True, index=True)
    mapping = Column(JSON, nullable=False)
    accuracy_rate = Column(Float, default=1.0)
    use_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class TemplateUsage(Base):
    """템플릿 사용 로그"""
    __tablename__ = "template_usage"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, index=True)
    match_score = Column(Float)
    was_successful = Column(Boolean)
    processing_time_ms = Column(Integer)
    created_at = Column(DateTime, default=func.now())


class LearningMetrics(Base):
    """학습 지표 (일별)"""
    __tablename__ = "learning_metrics"

    date = Column(Date, primary_key=True)
    total_uploads = Column(Integer, default=0)
    template_hits = Column(Integer, default=0)
    llm_calls = Column(Integer, default=0)
    api_cost_saved = Column(Float, default=0.0)
