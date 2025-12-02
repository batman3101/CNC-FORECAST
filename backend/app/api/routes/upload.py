import time
import tempfile
import shutil
from datetime import date
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_template_db, get_history_db
from app.models.schemas import (
    ForecastUploadResponse, ForecastItem,
    ForecastSaveRequest, ForecastSaveResponse
)
from app.models.actual_models import ForecastSnapshot
from app.services.template_service import template_service
from app.services.excel_service import excel_service
from app.services.llm_service import llm_service
from app.services.price_service import price_service

router = APIRouter()


@router.post("/forecast", response_model=ForecastUploadResponse)
async def upload_forecast(
    file: UploadFile = File(...),
    db: Session = Depends(get_template_db)
):
    """Forecast Excel 파일 업로드 및 분석"""
    # 파일 검증
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Excel 파일만 업로드 가능합니다")

    # 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        start_time = time.time()

        # 0. CNC Forecast 고정 형식 감지 및 파싱 (우선 처리)
        try:
            is_cnc = excel_service.is_cnc_forecast_format(tmp_path)
            print(f"[DEBUG] CNC format detected: {is_cnc}")

            if is_cnc:
                result = excel_service.parse_cnc_forecast(tmp_path)
                print(f"[DEBUG] CNC parse result: {len(result.get('data', []))} items")

                processing_time = int((time.time() - start_time) * 1000)
                template_service.update_daily_metrics(
                    db, template_hit=True, llm_called=False, cost_saved=0.03
                )

                return ForecastUploadResponse(
                    success=True,
                    data=[ForecastItem(**item) for item in result["data"]],
                    confidence=result["confidence"],
                    notes=result["notes"],
                    template_matched=True,
                    template_name=result["template_name"]
                )
        except Exception as e:
            # CNC 형식 감지/파싱 실패 시 다른 방법 시도
            import traceback
            print(f"[WARN] CNC format check failed: {e}")
            traceback.print_exc()

        # 1. 템플릿 매칭 시도 (다른 형식인 경우)
        try:
            matched_template, match_score = template_service.find_matching_template(db, tmp_path)
        except Exception as e:
            # 유효하지 않은 Excel 파일인 경우
            raise HTTPException(
                status_code=400,
                detail=f"유효하지 않은 Excel 파일입니다: {str(e)}"
            )

        if matched_template and match_score >= 90:
            # 템플릿으로 직접 파싱
            data = excel_service.parse_with_mapping(tmp_path, matched_template.mapping)

            # 사용 기록
            processing_time = int((time.time() - start_time) * 1000)
            template_service.record_usage(
                db, matched_template.id, match_score, True, processing_time
            )
            template_service.update_daily_metrics(
                db, template_hit=True, llm_called=False, cost_saved=0.02
            )

            return ForecastUploadResponse(
                success=True,
                data=[ForecastItem(**item) for item in data],
                confidence=match_score / 100,
                notes=f"템플릿 '{matched_template.name}' 사용",
                template_matched=True,
                template_name=matched_template.name
            )

        elif matched_template and match_score >= 70:
            # 템플릿 + LLM 검증
            data = excel_service.parse_with_mapping(tmp_path, matched_template.mapping)

            # 이미지로 변환 후 LLM 검증
            img_path = excel_service.excel_to_image(tmp_path)
            verification = llm_service.verify_template_result(data, img_path)

            if verification.get("is_valid", False):
                processing_time = int((time.time() - start_time) * 1000)
                template_service.record_usage(
                    db, matched_template.id, match_score, True, processing_time
                )
                template_service.update_daily_metrics(
                    db, template_hit=True, llm_called=True
                )

                return ForecastUploadResponse(
                    success=True,
                    data=[ForecastItem(**item) for item in data],
                    confidence=verification.get("confidence", 0.8),
                    notes="템플릿 + LLM 검증 완료",
                    template_matched=True,
                    template_name=matched_template.name
                )
            else:
                # 검증 실패 - 전체 LLM 분석으로 폴백
                corrections = verification.get("corrections", [])
                if corrections:
                    data = corrections

        # 2. 전체 LLM 분석 (새 형식 또는 검증 실패)
        img_path = excel_service.excel_to_image(tmp_path)
        analysis_result = llm_service.analyze_excel_image(img_path)

        template_service.update_daily_metrics(
            db, template_hit=False, llm_called=True
        )

        return ForecastUploadResponse(
            success=True,
            data=[
                ForecastItem(
                    model=item["model"],
                    period=item["period"],
                    quantity=item["quantity"]
                )
                for item in analysis_result.get("data", [])
            ],
            confidence=analysis_result.get("confidence", 0.0),
            notes=analysis_result.get("notes", "LLM 분석 완료 - 템플릿 저장을 권장합니다"),
            template_matched=False
        )

    finally:
        # 임시 파일 정리
        Path(tmp_path).unlink(missing_ok=True)


@router.post("/forecast/save", response_model=ForecastSaveResponse)
async def save_forecast(
    request: ForecastSaveRequest,
    db: Session = Depends(get_history_db)
):
    """Forecast 데이터 저장 (Upsert: 같은 날 업로드시 기존 데이터 업데이트)

    주의: 업로드 날짜 이전의 forecast 데이터는 저장하지 않음 (과거는 실적 데이터 사용)
    """
    today = date.today()
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for item in request.items:
        # 업로드 날짜 이전의 데이터는 스킵 (과거는 실적 데이터 사용)
        if item.forecast_date < today:
            skipped_count += 1
            continue

        # 단가 조회 (model + process 조합)
        unit_price = price_service.get_price(item.model, item.process or "")
        if unit_price is None:
            unit_price = 0  # 단가 없으면 0으로 설정

        revenue = unit_price * item.quantity

        # 같은 날 업로드된 동일 데이터가 있는지 확인 (upsert)
        existing = db.query(ForecastSnapshot).filter(
            and_(
                ForecastSnapshot.upload_date == today,
                ForecastSnapshot.forecast_date == item.forecast_date,
                ForecastSnapshot.model == item.model,
                ForecastSnapshot.process == item.process
            )
        ).first()

        if existing:
            # 기존 데이터 업데이트
            existing.quantity = item.quantity
            existing.revenue = revenue
            updated_count += 1
        else:
            # 새 데이터 생성
            snapshot = ForecastSnapshot(
                upload_date=today,
                forecast_date=item.forecast_date,
                model=item.model,
                process=item.process,
                quantity=item.quantity,
                revenue=revenue
            )
            db.add(snapshot)
            created_count += 1

    db.commit()

    return ForecastSaveResponse(
        success=True,
        created_count=created_count,
        updated_count=updated_count,
        total_count=created_count + updated_count,
        skipped_count=skipped_count
    )


@router.post("/forecast/save-template")
async def save_as_template(
    file: UploadFile = File(...),
    name: str = "새 템플릿",
    mapping: dict = None,
    db: Session = Depends(get_template_db)
):
    """현재 분석 결과를 템플릿으로 저장"""
    # 임시 파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        template = template_service.create_template(db, name, tmp_path, mapping or {})
        return {
            "success": True,
            "template_id": template.id,
            "fingerprint": template.fingerprint
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)
