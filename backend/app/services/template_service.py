from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional, Tuple
from datetime import date

from app.models.template_models import ExcelTemplate, TemplateUsage, LearningMetrics
from app.services.fingerprint_service import fingerprint_service
from app.services.excel_service import excel_service
from app.core.config import settings


class TemplateService:
    """템플릿 학습 및 매칭 서비스"""

    def find_matching_template(
        self,
        db: Session,
        file_path: str
    ) -> Tuple[Optional[ExcelTemplate], float]:
        """업로드된 파일과 매칭되는 템플릿 찾기"""
        fingerprint = fingerprint_service.generate_fingerprint(file_path)

        # 정확한 핑거프린트 매칭
        exact_match = db.query(ExcelTemplate).filter(
            ExcelTemplate.fingerprint == fingerprint,
            ExcelTemplate.is_active == True
        ).first()

        if exact_match:
            return exact_match, 100.0

        # 유사 템플릿 검색
        all_templates = db.query(ExcelTemplate).filter(
            ExcelTemplate.is_active == True
        ).all()

        best_match = None
        best_score = 0.0

        for template in all_templates:
            score = fingerprint_service.calculate_similarity(
                fingerprint,
                template.fingerprint
            )
            if score > best_score:
                best_score = score
                best_match = template

        if best_score >= settings.TEMPLATE_MIN_CONFIDENCE * 100:
            return best_match, best_score

        return None, 0.0

    def create_template(
        self,
        db: Session,
        name: str,
        file_path: str,
        mapping: Dict[str, Any]
    ) -> ExcelTemplate:
        """새 템플릿 생성"""
        fingerprint = fingerprint_service.generate_fingerprint(file_path)

        template = ExcelTemplate(
            name=name,
            fingerprint=fingerprint,
            mapping=mapping,
            accuracy_rate=1.0,
            use_count=0,
            is_active=True
        )

        db.add(template)
        db.commit()
        db.refresh(template)

        return template

    def get_all_templates(self, db: Session) -> List[ExcelTemplate]:
        """모든 템플릿 조회"""
        return db.query(ExcelTemplate).order_by(
            ExcelTemplate.use_count.desc()
        ).all()

    def get_template(self, db: Session, template_id: int) -> Optional[ExcelTemplate]:
        """템플릿 상세 조회"""
        return db.query(ExcelTemplate).filter(
            ExcelTemplate.id == template_id
        ).first()

    def update_template(
        self,
        db: Session,
        template_id: int,
        name: Optional[str] = None,
        mapping: Optional[Dict[str, Any]] = None,
        is_active: Optional[bool] = None
    ) -> Optional[ExcelTemplate]:
        """템플릿 수정"""
        template = self.get_template(db, template_id)
        if not template:
            return None

        if name:
            template.name = name
        if mapping:
            template.mapping = mapping
        if is_active is not None:
            template.is_active = is_active

        db.commit()
        db.refresh(template)
        return template

    def delete_template(self, db: Session, template_id: int) -> bool:
        """템플릿 삭제"""
        template = self.get_template(db, template_id)
        if not template:
            return False

        db.delete(template)
        db.commit()
        return True

    def record_usage(
        self,
        db: Session,
        template_id: int,
        match_score: float,
        was_successful: bool,
        processing_time_ms: int
    ):
        """템플릿 사용 기록"""
        usage = TemplateUsage(
            template_id=template_id,
            match_score=match_score,
            was_successful=was_successful,
            processing_time_ms=processing_time_ms
        )
        db.add(usage)

        # 템플릿 통계 업데이트
        template = self.get_template(db, template_id)
        if template:
            template.use_count += 1

            # 정확도 업데이트 (이동 평균)
            if was_successful:
                template.accuracy_rate = (
                    template.accuracy_rate * 0.9 + 1.0 * 0.1
                )
            else:
                template.accuracy_rate = (
                    template.accuracy_rate * 0.9 + 0.0 * 0.1
                )

            # 정확도 임계값 미달 시 비활성화
            if template.accuracy_rate < settings.TEMPLATE_AUTO_DISABLE_THRESHOLD:
                template.is_active = False

        db.commit()

    def update_daily_metrics(
        self,
        db: Session,
        template_hit: bool,
        llm_called: bool,
        cost_saved: float = 0.0
    ):
        """일간 지표 업데이트"""
        today = date.today()
        metrics = db.query(LearningMetrics).filter(
            LearningMetrics.date == today
        ).first()

        if not metrics:
            metrics = LearningMetrics(
                date=today,
                total_uploads=0,
                template_hits=0,
                llm_calls=0,
                api_cost_saved=0.0
            )
            db.add(metrics)

        metrics.total_uploads += 1
        if template_hit:
            metrics.template_hits += 1
        if llm_called:
            metrics.llm_calls += 1
        metrics.api_cost_saved += cost_saved

        db.commit()

    def get_stats(self, db: Session) -> Dict[str, Any]:
        """학습 통계 조회"""
        total_templates = db.query(ExcelTemplate).count()
        active_templates = db.query(ExcelTemplate).filter(
            ExcelTemplate.is_active == True
        ).count()

        # 최근 30일 지표
        from datetime import timedelta
        thirty_days_ago = date.today() - timedelta(days=30)

        metrics = db.query(LearningMetrics).filter(
            LearningMetrics.date >= thirty_days_ago
        ).all()

        total_uploads = sum(m.total_uploads for m in metrics)
        template_hits = sum(m.template_hits for m in metrics)
        api_cost_saved = sum(m.api_cost_saved for m in metrics)

        hit_rate = (template_hits / total_uploads * 100) if total_uploads > 0 else 0

        return {
            "total_templates": total_templates,
            "active_templates": active_templates,
            "total_uploads": total_uploads,
            "template_hit_rate": round(hit_rate, 1),
            "api_cost_saved": round(api_cost_saved, 2)
        }


template_service = TemplateService()
