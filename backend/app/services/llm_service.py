import google.generativeai as genai
import base64
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from PIL import Image
import io
from app.core.config import settings


class LLMService:
    """Google Gemini API를 통한 Excel 분석 서비스"""

    ANALYSIS_PROMPT = """당신은 생산 forecast Excel 스크린샷을 분석합니다.

다음 정보를 JSON으로 추출하세요:
1. model_name: 제품/모델 식별자
2. period: 날짜 또는 주차 정보
3. quantity: 생산 수량

규칙:
- 헤더 행과 합계는 무시
- 병합셀은 값을 올바르게 연결
- 날짜가 주차 번호인 경우 "1주차", "2주차" 등으로 표기

출력 형식:
{
  "data": [
    {
      "model": "AAA-01",
      "period": "2025-12-01",
      "quantity": 1000
    }
  ],
  "confidence": 0.95,
  "notes": "관찰 사항"
}"""

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def analyze_excel_image(self, image_path: str) -> Dict[str, Any]:
        """Excel 이미지를 분석하여 데이터 추출"""
        try:
            # 이미지 로드
            image = Image.open(image_path)

            # Gemini Vision API 호출
            response = self.model.generate_content(
                [self.ANALYSIS_PROMPT, image],
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=4096,
                    temperature=0.1
                )
            )

            # 응답 유효성 검사
            if not response.candidates:
                return {
                    "data": [],
                    "confidence": 0.0,
                    "notes": "LLM 응답 없음 - 콘텐츠가 차단되었을 수 있습니다"
                }

            candidate = response.candidates[0]
            if candidate.finish_reason != 1:  # 1 = STOP (정상 완료)
                return {
                    "data": [],
                    "confidence": 0.0,
                    "notes": f"LLM 응답 실패 (finish_reason: {candidate.finish_reason})"
                }

            # 응답 파싱
            response_text = response.text
        except ValueError as e:
            return {
                "data": [],
                "confidence": 0.0,
                "notes": f"LLM API 에러: {str(e)}"
            }
        except Exception as e:
            return {
                "data": [],
                "confidence": 0.0,
                "notes": f"LLM 분석 실패: {str(e)}"
            }

        # JSON 추출 시도
        try:
            # JSON 블록이 있는 경우 추출
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return {
                "data": [],
                "confidence": 0.0,
                "notes": f"JSON 파싱 실패: {response_text[:200]}"
            }

    def verify_template_result(
        self,
        template_data: List[Dict],
        image_path: str
    ) -> Dict[str, Any]:
        """템플릿 파싱 결과를 LLM으로 검증"""
        # 이미지 로드
        image = Image.open(image_path)

        verify_prompt = f"""다음은 Excel에서 추출된 데이터입니다. 이미지와 비교하여 정확도를 검증해주세요.

추출된 데이터:
{json.dumps(template_data, ensure_ascii=False, indent=2)}

다음 형식으로 응답해주세요:
{{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "errors": ["발견된 오류 목록"],
  "corrections": [수정된 데이터 - 필요한 경우만]
}}"""

        response = self.model.generate_content(
            [verify_prompt, image],
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=4096,
                temperature=0.1
            )
        )

        response_text = response.text

        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return {
                "is_valid": False,
                "confidence": 0.0,
                "errors": ["검증 응답 파싱 실패"]
            }


llm_service = LLMService()
