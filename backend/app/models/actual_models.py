from sqlalchemy import Column, Integer, String, Date, Float, DateTime, func
from app.core.database import Base


class ActualRecord(Base):
    """실적 생산/출하 기록"""
    __tablename__ = "actual_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    model = Column(String(50), nullable=False, index=True)
    process = Column(String(20), nullable=True, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    revenue = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ForecastSnapshot(Base):
    """Forecast 스냅샷 (차이 분석용)"""
    __tablename__ = "forecast_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    upload_date = Column(Date, nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)
    model = Column(String(50), nullable=False, index=True)
    process = Column(String(20), nullable=True, index=True)
    quantity = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class DailySummary(Base):
    """일간 요약 캐시"""
    __tablename__ = "daily_summary"

    date = Column(Date, primary_key=True)
    total_actual_qty = Column(Integer, default=0)
    total_actual_revenue = Column(Integer, default=0)
    total_forecast_qty = Column(Integer, default=0)
    total_forecast_revenue = Column(Integer, default=0)
