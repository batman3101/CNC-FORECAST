from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_template_db
from app.models.schemas import TemplateResponse, TemplateCreate, TemplateStatsResponse
from app.services.template_service import template_service

router = APIRouter()


@router.get("", response_model=List[TemplateResponse])
async def get_templates(
    db: Session = Depends(get_template_db)
):
    """모든 템플릿 조회"""
    return template_service.get_all_templates(db)


@router.get("/stats", response_model=TemplateStatsResponse)
async def get_template_stats(
    db: Session = Depends(get_template_db)
):
    """템플릿 학습 통계 조회"""
    stats = template_service.get_stats(db)
    return TemplateStatsResponse(**stats)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_template_db)
):
    """템플릿 상세 조회"""
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")
    return template


@router.post("", response_model=TemplateResponse)
async def create_template(
    request: TemplateCreate,
    db: Session = Depends(get_template_db)
):
    """템플릿 수동 생성 (매핑 정보 포함)"""
    # 핑거프린트 생성을 위해 파일이 필요하므로 별도 엔드포인트 사용 권장
    raise HTTPException(
        status_code=400,
        detail="템플릿 생성은 /api/upload/forecast/save-template 엔드포인트를 사용하세요"
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    name: str = None,
    mapping: dict = None,
    is_active: bool = None,
    db: Session = Depends(get_template_db)
):
    """템플릿 수정"""
    template = template_service.update_template(
        db, template_id,
        name=name,
        mapping=mapping,
        is_active=is_active
    )

    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")

    return template


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_template_db)
):
    """템플릿 삭제"""
    if not template_service.delete_template(db, template_id):
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")

    return {"success": True, "deleted_id": template_id}


@router.post("/{template_id}/activate")
async def activate_template(
    template_id: int,
    db: Session = Depends(get_template_db)
):
    """비활성화된 템플릿 다시 활성화"""
    template = template_service.update_template(db, template_id, is_active=True)

    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")

    return {"success": True, "template_id": template_id, "is_active": True}


@router.post("/{template_id}/deactivate")
async def deactivate_template(
    template_id: int,
    db: Session = Depends(get_template_db)
):
    """템플릿 비활성화"""
    template = template_service.update_template(db, template_id, is_active=False)

    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다")

    return {"success": True, "template_id": template_id, "is_active": False}
