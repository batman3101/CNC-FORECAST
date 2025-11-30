from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
import pandas as pd
from io import BytesIO

from app.services.price_service import price_service
from app.models.schemas import PriceItem, PriceMasterResponse

router = APIRouter()

VALID_PROCESSES = ['CNC 1 ~ CNC 2', 'CL1 ~ CL2', 'TRI']


class PriceCreateRequest(BaseModel):
    model: str
    unit_price: float
    process: Optional[str] = ""


class BulkPriceItem(BaseModel):
    model: str
    process: str
    unit_price: float


class BulkPriceRequest(BaseModel):
    prices: List[BulkPriceItem]


class ValidationError(BaseModel):
    row: int
    field: str
    message: str


class ValidationResult(BaseModel):
    valid: bool
    total_rows: int
    valid_rows: int
    error_rows: int
    errors: List[ValidationError]
    preview: List[BulkPriceItem]


@router.get("", response_model=PriceMasterResponse)
async def get_prices():
    """전체 단가 목록 조회"""
    items = price_service.get_all_prices()
    return PriceMasterResponse(
        items=[
            PriceItem(
                model=i["model"],
                process=i.get("process", ""),
                unit_price=i["unit_price"]
            )
            for i in items
        ],
        total_count=len(items)
    )


@router.get("/template/download")
async def download_template():
    """단가 일괄 등록용 Excel 템플릿 다운로드"""
    # Create template DataFrame
    template_data = {
        "모델": ["MODEL-001", "MODEL-002", "MODEL-003"],
        "공정": ["CNC 1 ~ CNC 2", "CL1 ~ CL2", "TRI"],
        "단가($)": [10.50, 25.00, 15.00]
    }
    df = pd.DataFrame(template_data)

    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='단가목록')

        # Add instructions sheet
        instructions = pd.DataFrame({
            "설명": [
                "이 템플릿을 사용하여 단가를 일괄 등록할 수 있습니다.",
                "",
                "컬럼 설명:",
                "- 모델: 제품 모델명 (필수)",
                "- 공정: CNC 1 ~ CNC 2, CL1 ~ CL2, TRI 중 선택 (필수)",
                "- 단가($): 단가 (USD, 필수, 숫자만 입력)",
                "",
                "주의사항:",
                "- 첫 번째 행(헤더)은 수정하지 마세요",
                "- 샘플 데이터(2-4행)는 삭제 후 사용하세요",
                "- 모든 필드는 필수입니다"
            ]
        })
        instructions.to_excel(writer, index=False, sheet_name='사용방법', header=False)

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=price_template.xlsx"}
    )


@router.post("/upload/validate", response_model=ValidationResult)
async def validate_upload(file: UploadFile = File(...)):
    """업로드된 Excel 파일 검증"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Excel 파일(.xlsx, .xls)만 지원합니다")

    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파일을 읽을 수 없습니다: {str(e)}")

    # Check required columns
    required_columns = {"모델", "공정", "단가($)"}
    actual_columns = set(df.columns)

    if not required_columns.issubset(actual_columns):
        missing = required_columns - actual_columns
        raise HTTPException(
            status_code=400,
            detail=f"필수 컬럼이 누락되었습니다: {', '.join(missing)}"
        )

    errors = []
    valid_items = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel row number (1-indexed + header)

        # Validate model
        model = str(row.get("모델", "")).strip()
        if not model or model == "nan":
            errors.append(ValidationError(row=row_num, field="모델", message="모델명이 비어있습니다"))
            continue

        # Validate process
        process = str(row.get("공정", "")).strip().upper()
        if not process or process == "NAN":
            errors.append(ValidationError(row=row_num, field="공정", message="공정이 비어있습니다"))
            continue
        if process not in VALID_PROCESSES:
            errors.append(ValidationError(
                row=row_num,
                field="공정",
                message=f"유효하지 않은 공정입니다. ({', '.join(VALID_PROCESSES)} 중 선택)"
            ))
            continue

        # Validate price
        try:
            price_value = row.get("단가($)")
            if pd.isna(price_value):
                errors.append(ValidationError(row=row_num, field="단가($)", message="단가가 비어있습니다"))
                continue
            unit_price = float(price_value)
            if unit_price <= 0:
                errors.append(ValidationError(row=row_num, field="단가($)", message="단가는 0보다 커야 합니다"))
                continue
        except (ValueError, TypeError):
            errors.append(ValidationError(row=row_num, field="단가($)", message="단가는 숫자여야 합니다"))
            continue

        valid_items.append(BulkPriceItem(model=model, process=process, unit_price=unit_price))

    total_rows = len(df)
    error_rows = len(errors)
    valid_rows = len(valid_items)
    is_valid = error_rows == 0 and valid_rows > 0

    return ValidationResult(
        valid=is_valid,
        total_rows=total_rows,
        valid_rows=valid_rows,
        error_rows=error_rows,
        errors=errors,
        preview=valid_items
    )


@router.post("/bulk")
async def bulk_register(request: BulkPriceRequest):
    """단가 일괄 등록"""
    if not request.prices:
        raise HTTPException(status_code=400, detail="등록할 단가 데이터가 없습니다")

    registered = 0
    errors = []

    for item in request.prices:
        try:
            price_service.add_price(item.model, item.unit_price, item.process)
            registered += 1
        except Exception as e:
            errors.append({"model": item.model, "error": str(e)})

    return {
        "success": True,
        "registered_count": registered,
        "error_count": len(errors),
        "errors": errors
    }


@router.get("/{model}")
async def get_price(model: str):
    """모델별 단가 조회"""
    price_info = price_service.get_price_info(model)
    if price_info is None:
        raise HTTPException(status_code=404, detail="단가 정보가 없습니다")
    return {
        "model": model,
        "unit_price": price_info["unit_price"],
        "process": price_info["process"]
    }


@router.post("")
async def add_price(request: PriceCreateRequest):
    """단가 추가/수정"""
    price_service.add_price(request.model, request.unit_price, request.process or "")
    return {
        "success": True,
        "model": request.model,
        "unit_price": request.unit_price,
        "process": request.process
    }


@router.delete("/{model}")
async def delete_price(model: str, process: Optional[str] = ""):
    """단가 삭제 (모델+공정)"""
    if not price_service.delete_price(model, process or ""):
        raise HTTPException(status_code=404, detail="단가 정보가 없습니다")
    return {"success": True, "model": model, "process": process}
