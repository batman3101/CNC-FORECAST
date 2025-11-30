from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_history_db
from app.models.actual_models import ActualRecord, ForecastSnapshot
from app.models.schemas import (
    RevenueReportResponse, RevenueItem, RevenueSummary, DashboardMetrics
)

router = APIRouter()


@router.get("", response_model=RevenueReportResponse)
async def get_revenue_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    view_mode: str = Query("combined"),  # actual, forecast, combined
    db: Session = Depends(get_history_db)
):
    """매출 리포트 조회"""
    today = date.today()

    if not start_date:
        start_date = today.replace(day=1)  # 이번 달 1일
    if not end_date:
        end_date = (start_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)

    items = []

    # 실적 데이터 (actual)
    if view_mode in ["actual", "combined"]:
        actual_records = db.query(ActualRecord).filter(
            ActualRecord.date >= start_date,
            ActualRecord.date <= end_date
        ).all()

        for record in actual_records:
            items.append(RevenueItem(
                date=record.date,
                model=record.model,
                process=record.process,
                record_type="actual",
                quantity=record.quantity,
                revenue=record.revenue
            ))

    # 예상 데이터 (forecast)
    if view_mode in ["forecast", "combined"]:
        # 가장 최근 업로드된 forecast 스냅샷 사용
        latest_upload = db.query(func.max(ForecastSnapshot.upload_date)).scalar()

        if latest_upload:
            forecast_records = db.query(ForecastSnapshot).filter(
                ForecastSnapshot.upload_date == latest_upload,
                ForecastSnapshot.forecast_date >= start_date,
                ForecastSnapshot.forecast_date <= end_date,
                ForecastSnapshot.forecast_date > today  # 미래 날짜만
            ).all()

            for record in forecast_records:
                items.append(RevenueItem(
                    date=record.forecast_date,
                    model=record.model,
                    process=record.process,
                    record_type="forecast",
                    quantity=record.quantity,
                    revenue=record.revenue
                ))

    # 날짜순 정렬
    items.sort(key=lambda x: (x.date, x.model))

    # 요약 계산
    actual_revenue = sum(i.revenue for i in items if i.record_type == "actual")
    forecast_revenue = sum(i.revenue for i in items if i.record_type == "forecast")
    total_revenue = actual_revenue + forecast_revenue
    achievement_rate = (actual_revenue / total_revenue * 100) if total_revenue > 0 else 0

    return RevenueReportResponse(
        items=items,
        summary=RevenueSummary(
            actual_revenue=actual_revenue,
            forecast_revenue=forecast_revenue,
            total_revenue=total_revenue,
            achievement_rate=round(achievement_rate, 1)
        ),
        period_start=start_date,
        period_end=end_date
    )


@router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: Session = Depends(get_history_db)
):
    """대시보드 지표 조회"""
    today = date.today()
    month_start = today.replace(day=1)

    # MTD 실적
    mtd_actual = db.query(func.sum(ActualRecord.revenue)).filter(
        ActualRecord.date >= month_start,
        ActualRecord.date <= today
    ).scalar() or 0

    # 최신 forecast에서 남은 달 예상
    latest_upload = db.query(func.max(ForecastSnapshot.upload_date)).scalar()
    mtd_forecast = 0

    if latest_upload:
        mtd_forecast = db.query(func.sum(ForecastSnapshot.revenue)).filter(
            ForecastSnapshot.upload_date == latest_upload,
            ForecastSnapshot.forecast_date > today,
            ForecastSnapshot.forecast_date <= today.replace(day=28) + timedelta(days=4)
        ).scalar() or 0

    monthly_target = mtd_actual + mtd_forecast
    achievement_rate = (mtd_actual / monthly_target * 100) if monthly_target > 0 else 0

    # 오늘 상태
    today_record = db.query(ActualRecord).filter(
        ActualRecord.date == today
    ).first()
    today_status = "입력 완료" if today_record else "대기중"

    return DashboardMetrics(
        mtd_actual=int(mtd_actual),
        mtd_forecast=int(mtd_forecast),
        monthly_target=int(monthly_target),
        achievement_rate=round(achievement_rate, 1),
        today_status=today_status
    )


@router.get("/export")
async def export_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_history_db)
):
    """리포트 Excel 내보내기"""
    # 구현 예정
    return {"message": "Export 기능은 추후 구현 예정입니다"}
