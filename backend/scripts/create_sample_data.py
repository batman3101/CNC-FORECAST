"""
샘플 데이터 생성 스크립트
단가 마스터 Excel 파일 생성
"""
import pandas as pd
from pathlib import Path

# 샘플 단가 데이터
sample_prices = [
    {"모델": "AAA-01", "공정": "CNC", "단가(원)": 1200},
    {"모델": "AAA-02", "공정": "CNC", "단가(원)": 1500},
    {"모델": "BBB-01", "공정": "CNC", "단가(원)": 2000},
    {"모델": "BBB-02", "공정": "CNC", "단가(원)": 1800},
    {"모델": "CCC-01", "공정": "CNC", "단가(원)": 2500},
    {"모델": "CCC-02", "공정": "CNC", "단가(원)": 2200},
    {"모델": "DDD-01", "공정": "CNC", "단가(원)": 3000},
    {"모델": "DDD-02", "공정": "CNC", "단가(원)": 3500},
]

def create_price_master():
    """단가 마스터 Excel 파일 생성"""
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(exist_ok=True)

    df = pd.DataFrame(sample_prices)
    output_path = data_dir / "price_master.xlsx"
    df.to_excel(output_path, index=False)
    print(f"단가 마스터 파일 생성: {output_path}")
    return output_path

def create_sample_forecast():
    """샘플 Forecast Excel 파일 생성"""
    data_dir = Path(__file__).parent.parent / "data"

    # 샘플 forecast 데이터 (4주치)
    forecast_data = []
    models = ["AAA-01", "AAA-02", "BBB-01", "BBB-02"]

    for model in models:
        forecast_data.append({
            "모델": model,
            "1주차": 1000,
            "2주차": 1200,
            "3주차": 1100,
            "4주차": 1300
        })

    df = pd.DataFrame(forecast_data)
    output_path = data_dir / "sample_forecast.xlsx"
    df.to_excel(output_path, index=False)
    print(f"샘플 Forecast 파일 생성: {output_path}")
    return output_path

if __name__ == "__main__":
    create_price_master()
    create_sample_forecast()
    print("샘플 데이터 생성 완료!")
