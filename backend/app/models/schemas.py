from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict, Any


# =============== Actual Records ===============

class ActualRecordBase(BaseModel):
    date: date
    model: str
    process: Optional[str] = None
    quantity: int
    unit_price: float
    revenue: float


class ActualRecordCreate(BaseModel):
    date: date
    model: str
    process: Optional[str] = None
    quantity: int


class ActualRecordResponse(ActualRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============== Forecast ===============

class ForecastItem(BaseModel):
    model: str
    period: str  # 날짜 문자열 (예: "2024-01-15" 또는 "2024-01")
    process: Optional[str] = None
    quantity: int


class ForecastUploadResponse(BaseModel):
    success: bool
    data: List[ForecastItem]
    confidence: float
    notes: Optional[str] = None
    template_matched: bool = False
    template_name: Optional[str] = None


class ForecastSaveItem(BaseModel):
    model: str
    forecast_date: date
    process: Optional[str] = None
    quantity: int


class ForecastSaveRequest(BaseModel):
    items: List[ForecastSaveItem]


class ForecastSaveResponse(BaseModel):
    success: bool
    created_count: int
    updated_count: int
    total_count: int
    skipped_count: int = 0  # 업로드 날짜 이전 데이터로 스킵된 건수


# =============== Price Master ===============

class PriceItem(BaseModel):
    model: str
    process: str
    unit_price: float


class PriceMasterResponse(BaseModel):
    items: List[PriceItem]
    total_count: int


# =============== Revenue Report ===============

class RevenueItem(BaseModel):
    date: date
    model: str
    process: Optional[str] = None
    record_type: str  # "actual" or "forecast"
    quantity: int
    revenue: float


class RevenueSummary(BaseModel):
    actual_revenue: float
    forecast_revenue: float
    total_revenue: float
    achievement_rate: float


class RevenueReportResponse(BaseModel):
    items: List[RevenueItem]
    summary: RevenueSummary
    period_start: date
    period_end: date


# =============== Template ===============

class TemplateMapping(BaseModel):
    model_column: str
    model_start_row: int
    date_row: int
    date_start_column: str
    quantity_start_cell: str
    header_keywords: List[str]
    date_format: str
    skip_rows: List[int] = []
    skip_columns: List[str] = []


class TemplateCreate(BaseModel):
    name: str
    mapping: TemplateMapping


class TemplateResponse(BaseModel):
    id: int
    name: str
    fingerprint: str
    mapping: Dict[str, Any]
    accuracy_rate: float
    use_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateStatsResponse(BaseModel):
    total_templates: int
    active_templates: int
    total_uploads: int
    template_hit_rate: float
    api_cost_saved: float


# =============== Dashboard ===============

class DashboardMetrics(BaseModel):
    mtd_actual: int
    mtd_forecast: int
    monthly_target: int
    achievement_rate: float
    today_status: str
