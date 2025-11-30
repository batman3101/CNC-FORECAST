from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, distinct

from app.core.database import get_history_db
from app.models.actual_models import ActualRecord, ForecastSnapshot
from app.models.schemas import ActualRecordCreate, ActualRecordResponse
from app.services.price_service import price_service

router = APIRouter()


@router.get("/models-processes")
async def get_forecast_models_processes(
    db: Session = Depends(get_history_db)
):
    """Forecast에서 등록된 고유 모델과 공정 목록 조회"""
    # Forecast에서 고유 모델 조회
    forecast_models = db.query(distinct(ForecastSnapshot.model)).all()
    models = sorted([m[0] for m in forecast_models if m[0]])

    # Forecast에서 고유 공정 조회
    forecast_processes = db.query(distinct(ForecastSnapshot.process)).all()
    processes = sorted([p[0] for p in forecast_processes if p[0]])

    return {
        "models": models,
        "processes": processes
    }


@router.get("", response_model=List[ActualRecordResponse])
async def get_actual_records(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    model: Optional[str] = Query(None),
    db: Session = Depends(get_history_db)
):
    """실적 데이터 조회"""
    query = db.query(ActualRecord)

    if start_date:
        query = query.filter(ActualRecord.date >= start_date)
    if end_date:
        query = query.filter(ActualRecord.date <= end_date)
    if model:
        query = query.filter(ActualRecord.model == model)

    return query.order_by(ActualRecord.date.desc()).all()


@router.get("/{record_id}", response_model=ActualRecordResponse)
async def get_actual_record(
    record_id: int,
    db: Session = Depends(get_history_db)
):
    """실적 데이터 상세 조회"""
    record = db.query(ActualRecord).filter(ActualRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다")
    return record


@router.post("", response_model=ActualRecordResponse)
async def create_actual_record(
    request: ActualRecordCreate,
    db: Session = Depends(get_history_db)
):
    """실적 데이터 입력"""
    # 단가 조회
    unit_price = price_service.get_price(request.model)
    if unit_price is None:
        raise HTTPException(status_code=400, detail=f"모델 '{request.model}'의 단가 정보가 없습니다")

    # 매출 계산
    revenue = unit_price * request.quantity

    # 중복 체크 (날짜, 모델, 공정 조합)
    existing = db.query(ActualRecord).filter(
        and_(
            ActualRecord.date == request.date,
            ActualRecord.model == request.model,
            ActualRecord.process == request.process
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"해당 날짜({request.date})에 모델 '{request.model}' 공정 '{request.process}'의 기록이 이미 있습니다"
        )

    # 저장
    record = ActualRecord(
        date=request.date,
        model=request.model,
        process=request.process,
        quantity=request.quantity,
        unit_price=unit_price,
        revenue=revenue
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.put("/{record_id}", response_model=ActualRecordResponse)
async def update_actual_record(
    record_id: int,
    request: ActualRecordCreate,
    db: Session = Depends(get_history_db)
):
    """실적 데이터 수정"""
    record = db.query(ActualRecord).filter(ActualRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다")

    # 단가 조회
    unit_price = price_service.get_price(request.model)
    if unit_price is None:
        raise HTTPException(status_code=400, detail=f"모델 '{request.model}'의 단가 정보가 없습니다")

    record.date = request.date
    record.model = request.model
    record.process = request.process
    record.quantity = request.quantity
    record.unit_price = unit_price
    record.revenue = unit_price * request.quantity

    db.commit()
    db.refresh(record)

    return record


@router.delete("/{record_id}")
async def delete_actual_record(
    record_id: int,
    db: Session = Depends(get_history_db)
):
    """실적 데이터 삭제"""
    record = db.query(ActualRecord).filter(ActualRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="기록을 찾을 수 없습니다")

    db.delete(record)
    db.commit()

    return {"success": True, "deleted_id": record_id}


@router.post("/batch")
async def create_batch_records(
    records: List[ActualRecordCreate],
    db: Session = Depends(get_history_db)
):
    """실적 데이터 일괄 입력"""
    created = []
    errors = []

    for req in records:
        try:
            unit_price = price_service.get_price(req.model)
            if unit_price is None:
                errors.append({"model": req.model, "error": "단가 정보 없음"})
                continue

            record = ActualRecord(
                date=req.date,
                model=req.model,
                process=req.process,
                quantity=req.quantity,
                unit_price=unit_price,
                revenue=unit_price * req.quantity
            )
            db.add(record)
            created.append(req.model)
        except Exception as e:
            errors.append({"model": req.model, "error": str(e)})

    db.commit()

    return {
        "success": True,
        "created_count": len(created),
        "error_count": len(errors),
        "errors": errors
    }
