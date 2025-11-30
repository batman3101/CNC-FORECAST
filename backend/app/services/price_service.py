import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
from app.core.config import settings


class PriceService:
    """단가 마스터 관리 서비스 (모델+공정 복합키)"""

    def __init__(self):
        self.price_master_path = Path(settings.PRICE_MASTER_PATH)
        # 키: "model|process" 형식의 복합키
        self._price_cache: Dict[str, Dict] = {}
        self._load_price_master()

    def _make_key(self, model: str, process: str = "") -> str:
        """모델+공정 복합키 생성"""
        return f"{model}|{process}"

    def _parse_key(self, key: str) -> tuple:
        """복합키에서 모델, 공정 분리"""
        parts = key.split("|", 1)
        return parts[0], parts[1] if len(parts) > 1 else ""

    def _load_price_master(self):
        """단가 마스터 파일 로드"""
        if not self.price_master_path.exists():
            return

        df = pd.read_excel(self.price_master_path)
        # Expected columns: 모델, 공정, 단가($)
        for _, row in df.iterrows():
            model = str(row.get("모델", row.get("model", "")))
            process = str(row.get("공정", row.get("process", "")))
            price = float(row.get("단가($)", row.get("unit_price", 0)))
            if model:
                key = self._make_key(model, process)
                self._price_cache[key] = {
                    "model": model,
                    "process": process,
                    "unit_price": price
                }

    def get_price(self, model: str, process: str = "") -> Optional[float]:
        """모델+공정의 단가 조회"""
        key = self._make_key(model, process)
        item = self._price_cache.get(key)
        if item:
            return item["unit_price"]
        # process 없이 검색한 경우, 해당 모델의 첫 번째 단가 반환
        if not process:
            for k, v in self._price_cache.items():
                if v["model"] == model:
                    return v["unit_price"]
        return None

    def get_price_info(self, model: str, process: str = "") -> Optional[Dict]:
        """모델+공정의 전체 가격 정보 조회"""
        key = self._make_key(model, process)
        item = self._price_cache.get(key)
        if item:
            return item
        # process 없이 검색한 경우, 해당 모델의 첫 번째 정보 반환
        if not process:
            for k, v in self._price_cache.items():
                if v["model"] == model:
                    return v
        return None

    def get_all_prices(self) -> List[Dict]:
        """전체 단가 목록 조회"""
        return [
            {
                "model": v["model"],
                "process": v["process"],
                "unit_price": v["unit_price"]
            }
            for v in self._price_cache.values()
        ]

    def add_price(self, model: str, unit_price: float, process: str = ""):
        """단가 추가/수정"""
        key = self._make_key(model, process)
        self._price_cache[key] = {
            "model": model,
            "process": process,
            "unit_price": unit_price
        }
        self._save_price_master()

    def delete_price(self, model: str, process: str = "") -> bool:
        """단가 삭제"""
        key = self._make_key(model, process)
        if key in self._price_cache:
            del self._price_cache[key]
            self._save_price_master()
            return True
        return False

    def _save_price_master(self):
        """단가 마스터 파일 저장"""
        data = [
            {
                "모델": v["model"],
                "공정": v["process"],
                "단가($)": v["unit_price"]
            }
            for v in self._price_cache.values()
        ]
        df = pd.DataFrame(data)
        self.price_master_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_excel(self.price_master_path, index=False)

    def calculate_revenue(self, model: str, quantity: int) -> float:
        """매출 계산"""
        price = self.get_price(model)
        if price is None:
            return 0
        return price * quantity


price_service = PriceService()
