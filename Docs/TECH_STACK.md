# Technical Stack Document: AI Agent Web App

## Document Info

| Item | Value |
|------|-------|
| Version | 1.2 |
| Last Updated | 2025-11-29 |
| Related | PRD.md |

---

## 1. Architecture Overview

```
+------------------------------------------------------------------+
|                    WINDOWS EXECUTABLE                             |
|  +------------------------------------------------------------+  |
|  |  ForecastCalculator.exe (PyInstaller)                       |  |
|  |  - Launcher script / System tray / Auto browser open        |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                         CLIENT (Browser)                          |
|  +------------------------------------------------------------+  |
|  |  React + Vite + TailwindCSS                                 |  |
|  |  - Excel Upload / Data Preview / Revenue Dashboard          |  |
|  |  - Actual Entry / History Browser                           |  |
|  |  - Template Manager (NEW v1.2)                              |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                         SERVER (FastAPI)                          |
|  +------------------------------------------------------------+  |
|  |  Services:                                                  |  |
|  |  - Excel Processor / LLM Service / Price Service            |  |
|  |  - Calculator / Actual Service / History Service            |  |
|  |  - Template Service (NEW v1.2)                              |  |
|  |  - Fingerprint Service (NEW v1.2)                           |  |
|  |  - Pattern Matcher (NEW v1.2)                               |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                                |
                                v
+------------------------------------------------------------------+
|                         DATA LAYER                                |
|  - history.db (actual records, forecasts, summaries)             |
|  - templates.db (learned patterns) (NEW v1.2)                    |
|  - price_master.xlsx                                             |
+------------------------------------------------------------------+
```

---

## 2. Technology Stack Summary

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| Vite | 5.x | Build Tool |
| TypeScript | 5.x | Type Safety |
| TailwindCSS | 3.x | Styling |
| shadcn/ui | latest | Components |
| Recharts | 2.x | Charts |
| TanStack Query | 5.x | Data Fetching |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.104+ | Web Framework |
| SQLAlchemy | 2.x | ORM |
| pandas | 2.x | Data Processing |
| openpyxl | 3.1+ | Excel R/W |
| anthropic | 0.39+ | Claude API |

### Template Learning (NEW v1.2)

| Technology | Version | Purpose |
|------------|---------|---------|
| imagehash | 4.3+ | Perceptual hashing |
| scikit-learn | 1.3+ | Similarity calc |
| jellyfish | 1.0+ | String matching |

### Packaging

| Technology | Version | Purpose |
|------------|---------|---------|
| PyInstaller | 6.x | EXE creation |
| pystray | 0.19+ | System tray |

---

## 3. Template Learning System (NEW v1.2)

### 3.1 Database Schema

```sql
-- templates.db

CREATE TABLE excel_templates (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    fingerprint VARCHAR(64) UNIQUE,
    mapping JSON NOT NULL,
    accuracy_rate FLOAT DEFAULT 1.0,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE template_usage (
    id INTEGER PRIMARY KEY,
    template_id INTEGER,
    match_score FLOAT,
    was_successful BOOLEAN,
    processing_time_ms INTEGER,
    created_at TIMESTAMP
);

CREATE TABLE learning_metrics (
    date DATE PRIMARY KEY,
    total_uploads INTEGER,
    template_hits INTEGER,
    llm_calls INTEGER,
    api_cost_saved FLOAT
);
```

### 3.2 Fingerprint Generation

```python
class FingerprintService:
    def generate_fingerprint(self, file_path: str) -> str:
        components = {
            "row_count_range": self._get_range_bucket(sheet.max_row),
            "col_count_range": self._get_range_bucket(sheet.max_column),
            "header_pattern": self._extract_header_pattern(sheet),
            "data_type_pattern": self._extract_data_types(sheet),
            "merged_cells": len(list(sheet.merged_cells.ranges)),
            "keywords": self._extract_keywords(sheet),
        }
        return hashlib.sha256(json.dumps(components).encode()).hexdigest()[:16]
```

### 3.3 Matching Logic

| Score | Action | Speed |
|-------|--------|-------|
| >= 90% | Direct parse | ~100ms |
| 70-89% | Template + LLM verify | ~2-4s |
| < 70% | Full LLM analysis | ~8-15s |

---

## 4. API Endpoints

### Template API (NEW v1.2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/templates | List all templates |
| GET | /api/templates/{id} | Get template detail |
| POST | /api/templates | Create new template |
| PUT | /api/templates/{id} | Update template |
| DELETE | /api/templates/{id} | Delete template |
| GET | /api/templates/stats | Learning statistics |

### Existing APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload/forecast | Upload forecast (now with template matching) |
| GET/POST | /api/prices | Price master CRUD |
| CRUD | /api/actual | Actual records |
| GET | /api/report | Revenue reports |
| GET | /api/history | Historical data |

---

## 5. Project Structure

```
backend/
├── app/
│   ├── api/routes/
│   │   ├── templates.py      # NEW v1.2
│   │   └── ...
│   ├── services/
│   │   ├── template_service.py      # NEW v1.2
│   │   ├── fingerprint_service.py   # NEW v1.2
│   │   ├── pattern_matcher.py       # NEW v1.2
│   │   └── ...
│   ├── models/
│   │   ├── template_models.py       # NEW v1.2
│   │   └── ...
│   └── ...
├── data/
│   ├── history.db
│   ├── templates.db           # NEW v1.2
│   └── price_master.xlsx
└── ...

frontend/
├── src/
│   ├── components/
│   │   ├── TemplateManager.tsx      # NEW v1.2
│   │   ├── TemplatePicker.tsx       # NEW v1.2
│   │   └── ...
│   ├── hooks/
│   │   ├── useTemplates.ts          # NEW v1.2
│   │   └── ...
│   └── ...
└── ...
```

---

## 6. Performance Comparison

| Scenario | Without Template | With Template |
|----------|------------------|---------------|
| New format | 8-15 sec | 8-15 sec |
| Known format | 8-15 sec | 0.1-0.3 sec |
| Similar format | 8-15 sec | 2-4 sec |

**Cost Savings:**
- LLM call: ~$0.02/analysis
- 70% template hit rate = 70% cost reduction

---

## 7. Environment Variables

```bash
# .env

ANTHROPIC_API_KEY=sk-ant-xxxxx
HOST=127.0.0.1
PORT=8000

# Paths
PRICE_MASTER_PATH=./data/price_master.xlsx
HISTORY_DB_PATH=./data/history.db
TEMPLATE_DB_PATH=./data/templates.db

# Template Learning (NEW v1.2)
TEMPLATE_MIN_CONFIDENCE=0.7
TEMPLATE_AUTO_DISABLE_THRESHOLD=0.7
```

---

## 8. Dependencies

### requirements.txt

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pandas==2.1.3
openpyxl==3.1.2
anthropic==0.39.0
Pillow==10.1.0
python-dotenv==1.0.0
pydantic==2.5.2

# Template Learning (NEW v1.2)
imagehash==4.3.1
scikit-learn==1.3.2
jellyfish==1.0.3

# Packaging
pyinstaller==6.3.0
pystray==0.19.5
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-29 | Initial draft |
| 1.1 | 2025-11-29 | Windows exe, SQLite, Actual data |
| 1.2 | 2025-11-29 | Template Learning System |
