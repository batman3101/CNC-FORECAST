# PRD: AI Agent Web App - Forecast Revenue Calculator

## Document Info

| Item | Value |
|------|-------|
| Version | 1.2 |
| Last Updated | 2025-11-29 |
| Author | ALMUS TECH |
| Status | Draft |

---

## 1. Overview

### 1.1 Project Purpose

AI Agent web app that:
1. Uploads unstructured Excel Forecast data
2. LLM auto-analyzes data structure
3. Matches with price DB (Excel)
4. Calculates daily/weekly/monthly revenue
5. Distinguishes actual vs forecast revenue
6. Manages historical data accumulation
7. **[NEW v1.2] Learns Excel patterns for faster processing**

### 1.2 Core Problem

- Forecast Excel files have different formats per person (unstructured)
- Formulas, merged cells, various layouts cause parsing failures
- Manual data cleanup wastes time
- No unified view of actual results + future forecast
- **[NEW v1.2] Repeated LLM calls for same Excel format = slow & costly**

### 1.3 Solution

Use LLM (Claude) to understand the "meaning" of unstructured Excel and auto-extract structured data.
**[NEW v1.2] Save successful patterns as templates for instant reuse.**

---

## 2. User & Environment

### 2.1 Target User

- Single user
- Production management staff

### 2.2 Environment

- Windows PC (Standalone Executable)
- Local execution (localhost)
- Internet required (Claude API)

### 2.3 Usage Frequency

- Weekly (when new forecast arrives)
- Daily (for actual result confirmation)

---

## 3. Deployment & Execution

### 3.1 Executable Package

The application will be packaged as a standalone Windows executable.

**Delivery Format:**
```
ForecastCalculator/
├── ForecastCalculator.exe    # Main launcher (double-click to run)
├── icon.ico                   # Desktop shortcut icon
├── config/
│   └── settings.json          # User settings
├── data/
│   ├── price_master.xlsx      # Price DB
│   ├── history.db             # Historical data (SQLite)
│   └── templates.db           # [NEW] Learned templates
└── README.txt                 # Quick start guide
```

### 3.2 One-Click Execution

**User Experience:**
1. Double-click `ForecastCalculator.exe`
2. System auto-starts backend server
3. Browser opens automatically (http://localhost:8000)
4. Ready to use

**System Tray:**
- App runs in system tray
- Right-click menu: Open Browser / Settings / Exit
- Auto-shutdown when tray icon closed

### 3.3 Desktop Shortcut

**Installation includes:**
- Desktop shortcut creation
- Start menu entry
- Custom icon (forecast chart icon)

---

## 4. Input Data

### 4.1 Forecast Excel (Upload)

- 4-week production forecast
- Unstructured format
- Contains: Model name, Date/Week, Quantity
- May include: formulas, merged cells, various layouts

### 4.2 Price Master Excel (DB)

- Fixed format (structured)
- Location: `./data/price_master.xlsx`
- Contains: Model name, Process, Unit price

**Price Master Structure:**

| Model | Process | Unit Price (KRW) |
|-------|---------|------------------|
| AAA-01 | CNC | 1,200 |
| AAA-01 | Assembly | 800 |
| BBB-02 | CNC | 1,500 |

### 4.3 Actual Production Data

**Data Entry Methods:**
1. Manual input via web UI
2. Excel upload (actual shipment data)
3. Auto-import from ERP (v2.0)

**Actual Data Structure:**

| Date | Model | Shipped Qty | Revenue |
|------|-------|-------------|---------|
| 2025-11-28 | AAA-01 | 980 | 1,960,000 |
| 2025-11-28 | BBB-02 | 510 | 765,000 |

---

## 5. Output Data

### 5.1 Revenue Report

**Report Types:**

| Type | Description | Data Source |
|------|-------------|-------------|
| Actual Revenue | Completed production/shipment | History DB |
| Forecast Revenue | Future planned production | Uploaded Forecast |
| Combined View | Actual + Forecast in one view | Both |

**Time-based Classification:**
```
Past dates (before today)     → Actual Revenue (confirmed)
Today                         → Actual Revenue (if entered) or Forecast
Future dates (after today)    → Forecast Revenue (planned)
```

### 5.2 Report Display

```
+----------------------------------------------------------+
|  Revenue Report: 2025-11 ~ 2025-12                        |
+----------------------------------------------------------+
|  [Actual] [Forecast] [Combined]  ← View Mode Toggle       |
+----------------------------------------------------------+
|                                                           |
|  Date     | Model  | Type     | Qty   | Revenue          |
|-----------|--------|----------|-------|------------------|
|  11/25    | AAA-01 | Actual   | 1,000 | 2,000,000  ✓    |
|  11/26    | AAA-01 | Actual   | 1,100 | 2,200,000  ✓    |
|  11/27    | AAA-01 | Actual   | 950   | 1,900,000  ✓    |
|  11/28    | AAA-01 | Actual   | 980   | 1,960,000  ✓    |
|  11/29    | AAA-01 | TODAY    | -     | (pending)        |
|  11/30    | AAA-01 | Forecast | 1,200 | 2,400,000  ~    |
|  12/01    | AAA-01 | Forecast | 1,300 | 2,600,000  ~    |
+----------------------------------------------------------+
|                                                           |
|  Summary:                                                 |
|  - Actual Revenue (confirmed):    8,060,000 KRW          |
|  - Forecast Revenue (planned):    5,000,000 KRW          |
|  - Total Expected:               13,060,000 KRW          |
|                                                           |
+----------------------------------------------------------+

Legend:  ✓ = Confirmed (Actual)   ~ = Forecast (Planned)
```

### 5.3 Dashboard Metrics

| Metric | Description |
|--------|-------------|
| MTD Actual | Month-to-date actual revenue |
| MTD Forecast | Remaining month forecast |
| Monthly Target | MTD Actual + MTD Forecast |
| Achievement Rate | MTD Actual / Monthly Target |
| Variance | Actual vs Original Forecast |

---

## 6. Template Learning System (NEW v1.2)

### 6.1 Concept Overview

The system "learns" Excel formats by saving successful parsing patterns as reusable templates. This is not true AI learning, but pattern matching that achieves similar results.

**Benefits:**
- Repeated formats processed instantly (no LLM call)
- Reduced API costs
- Improved accuracy over time
- Faster processing speed

### 6.2 How It Works

```
[First Upload - New Format]
┌─────────────────────────────────────────────┐
│ 1. User uploads Excel                       │
│ 2. System checks template DB → No match     │
│ 3. LLM analyzes structure (Vision API)      │
│ 4. User reviews & confirms results          │
│ 5. Prompt: "Save this format?"              │
│ 6. User clicks "Remember This Format"       │
│ 7. Template saved to DB                     │
└─────────────────────────────────────────────┘

[Second Upload - Same Format]
┌─────────────────────────────────────────────┐
│ 1. User uploads Excel                       │
│ 2. System checks template DB → Match found! │
│ 3. Direct parsing using saved template      │
│ 4. No LLM call needed                       │
│ 5. Instant results (< 1 second)             │
└─────────────────────────────────────────────┘
```

### 6.3 Template Matching Logic

**Fingerprint Generation:**
```
Excel Fingerprint = Hash of:
  - Sheet structure (row/column count range)
  - Header patterns (text in row 1-3)
  - Data type patterns (text vs number positions)
  - Merged cell patterns
  - Keyword presence (model codes, date formats)
```

**Matching Process:**
```
1. Generate fingerprint of uploaded file
2. Compare with stored templates
3. Calculate similarity score (0-100%)

Score >= 90%  → Use template directly
Score 70-89%  → Use template + LLM verification
Score < 70%   → Full LLM analysis (new format)
```

### 6.4 Template Data Structure

```json
{
  "template_id": "tpl_001",
  "name": "Weekly Forecast - Production Team",
  "fingerprint": "a1b2c3d4e5...",
  "created_at": "2025-11-29",
  "use_count": 47,
  "last_used": "2025-11-29",
  "accuracy_rate": 0.98,
  "mapping": {
    "model_column": "A",
    "model_start_row": 3,
    "date_row": 1,
    "date_start_column": "B",
    "quantity_start_cell": "B3",
    "header_keywords": ["Model", "Week", "Qty"],
    "date_format": "Week N",
    "skip_rows": [1, 2],
    "skip_columns": ["Total", "Sum"]
  }
}
```

### 6.5 Confidence-Based Automation

| Confidence | Action | User Interaction |
|------------|--------|------------------|
| >= 95% | Auto-process | None (show results only) |
| 80-94% | Auto-process | Review prompt |
| 60-79% | LLM + Template | Confirm mapping |
| < 60% | Full LLM | Manual verification |

### 6.6 Template Management UI

```
+--------------------------------------------------+
|  Saved Templates                                  |
+--------------------------------------------------+
|                                                  |
|  +--------------------------------------------+  |
|  | Name              | Uses | Accuracy | Action| |
|  |-------------------|------|----------|-------| |
|  | Weekly Forecast   | 47   | 98%      | [Edit]| |
|  | Monthly Summary   | 12   | 95%      | [Edit]| |
|  | Daily Production  | 89   | 99%      | [Edit]| |
|  +--------------------------------------------+  |
|                                                  |
|  [Import Template]  [Export All]                 |
|                                                  |
+--------------------------------------------------+
```

### 6.7 Continuous Improvement

**Feedback Loop:**
```
1. User corrects any parsing errors
2. System updates template accuracy score
3. Low accuracy templates flagged for review
4. Templates with < 70% accuracy auto-disabled
5. User can retrain or delete poor templates
```

**Learning Metrics:**
- Template hit rate (% of uploads matched)
- Average processing time
- API calls saved
- Accuracy trend over time

---

## 7. Historical Data Management

### 7.1 Data Storage

**SQLite Database:** `./data/history.db`

**Tables:**

```sql
-- Actual production/shipment records
CREATE TABLE actual_records (
    id INTEGER PRIMARY KEY,
    date DATE NOT NULL,
    model VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    revenue INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forecast snapshots (for variance analysis)
CREATE TABLE forecast_snapshots (
    id INTEGER PRIMARY KEY,
    upload_date DATE NOT NULL,
    forecast_date DATE NOT NULL,
    model VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    revenue INTEGER NOT NULL
);

-- Daily summary cache
CREATE TABLE daily_summary (
    date DATE PRIMARY KEY,
    total_actual_qty INTEGER,
    total_actual_revenue INTEGER,
    total_forecast_qty INTEGER,
    total_forecast_revenue INTEGER
);
```

### 7.2 Data Operations

| Operation | Description |
|-----------|-------------|
| Add Actual | Enter today's production result |
| Edit Actual | Modify past records (with audit log) |
| Delete Actual | Remove erroneous entries |
| View History | Browse past records by date range |
| Export | Download historical data as Excel |

### 7.3 Data Retention

- Default: Keep all historical data
- Optional: Archive data older than 1 year
- Backup: Auto-backup on app startup

---

## 8. Core Features

### 8.1 Excel Upload

- Drag & drop or file select
- Support: .xlsx, .xls
- File size limit: 10MB
- **[NEW v1.2] Template matching before LLM call**

### 8.2 LLM Data Analysis

**Approach: Vision + LLM**

1. Convert Excel sheet to image (screenshot)
2. **[NEW v1.2] Check template DB first**
3. If no match: Send to Claude Vision API
4. LLM identifies: model names, dates, quantities
5. Output: structured JSON
6. **[NEW v1.2] Offer to save as template**

**Why Vision approach?**
- Handles merged cells naturally
- Reads formulas as displayed values
- Works regardless of Excel structure

### 8.3 Price Matching

- Match model name from forecast to price DB
- Calculate: Quantity x Unit Price = Revenue

### 8.4 Revenue Calculation

```
Daily Revenue = SUM(each model's quantity x unit price)
Weekly Revenue = SUM(daily revenues for the week)  
Monthly Revenue = SUM(weekly revenues for the month)
```

### 8.5 Actual Data Entry

**Input Methods:**

1. **Quick Entry Form**
   - Select date (default: today)
   - Enter model + quantity
   - Auto-calculate revenue from price master

2. **Bulk Upload**
   - Upload actual shipment Excel
   - Same LLM analysis as forecast
   - **[NEW v1.2] Can use saved templates**

3. **Copy from Forecast**
   - One-click to copy forecast to actual
   - Edit quantities as needed

---

## 9. UI/UX Design

### 9.1 Main Screen

```
+--------------------------------------------------+
|  [Icon] Forecast Revenue Calculator    [_][X]    |
+--------------------------------------------------+
|                                                  |
|  +--------------------+  +--------------------+  |
|  |    Upload New      |  |   Enter Actual     |  |
|  |    Forecast        |  |   Production       |  |
|  +--------------------+  +--------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  |              Quick Dashboard               |  |
|  |  +----------+  +----------+  +----------+  |  |
|  |  | MTD      |  | Today    |  | Monthly  |  |  |
|  |  | Actual   |  | Status   |  | Target   |  |  |
|  |  | 45.2M    |  | Pending  |  | 120M     |  |  |
|  |  +----------+  +----------+  +----------+  |  |
|  +--------------------------------------------+  |
|                                                  |
|  [View Full Report]  [Price Master]  [History]   |
|  [Templates]  ← NEW v1.2                         |
|                                                  |
+--------------------------------------------------+
```

### 9.2 Upload Screen with Template (NEW v1.2)

```
+--------------------------------------------------+
|  Upload Forecast                                  |
+--------------------------------------------------+
|                                                  |
|  +--------------------------------------------+  |
|  |                                            |  |
|  |     Drag & Drop Excel File                 |  |
|  |         or Click to Select                 |  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  [✓] Auto-detect saved templates                 |
|                                                  |
|  Recent Templates:                               |
|  +--------------------------------------------+  |
|  | [★] Weekly Forecast (98% accuracy)         |  |
|  | [ ] Monthly Summary (95% accuracy)         |  |
|  | [ ] Use new format (LLM analysis)          |  |
|  +--------------------------------------------+  |
|                                                  |
+--------------------------------------------------+
```

### 9.3 Template Save Prompt (NEW v1.2)

```
+--------------------------------------------------+
|  Analysis Complete!                               |
+--------------------------------------------------+
|                                                  |
|  Extracted 24 records with 95% confidence        |
|                                                  |
|  +--------------------------------------------+  |
|  | Model  | Week 1 | Week 2 | Week 3 | Week 4 |  |
|  |--------|--------|--------|--------|--------|  |
|  | AAA-01 | 1,000  | 1,200  | 1,100  | 1,300  |  |
|  | BBB-02 | 500    | 600    | 550    | 650    |  |
|  +--------------------------------------------+  |
|                                                  |
|  +--------------------------------------------+  |
|  |  [★] Remember this format for future use   |  |
|  |                                            |  |
|  |  Template name: [Weekly Forecast________]  |  |
|  +--------------------------------------------+  |
|                                                  |
|  [Edit Data]              [Confirm & Calculate]  |
|                                                  |
+--------------------------------------------------+
```

### 9.4 Actual Entry Screen

```
+--------------------------------------------------+
|  Enter Actual Production                          |
+--------------------------------------------------+
|  Date: [2025-11-29 ▼]                            |
|                                                  |
|  +--------------------------------------------+  |
|  | Model    | Forecast | Actual | Revenue     |  |
|  |----------|----------|--------|-------------|  |
|  | AAA-01   | 1,000    | [    ] | auto-calc   |  |
|  | BBB-02   | 500      | [    ] | auto-calc   |  |
|  | CCC-03   | 300      | [    ] | auto-calc   |  |
|  +--------------------------------------------+  |
|                                                  |
|  [Copy All from Forecast]                        |
|                                                  |
|  [Cancel]                    [Save]              |
+--------------------------------------------------+
```

### 9.5 History Screen

```
+--------------------------------------------------+
|  Historical Data                                  |
+--------------------------------------------------+
|  Period: [2025-11-01] ~ [2025-11-29]  [Search]   |
|                                                  |
|  +--------------------------------------------+  |
|  | Date   | Model  | Qty   | Revenue | Action |  |
|  |--------|--------|-------|---------|--------|  |
|  | 11/28  | AAA-01 | 980   | 1.96M   | [Edit] |  |
|  | 11/28  | BBB-02 | 510   | 0.77M   | [Edit] |  |
|  | 11/27  | AAA-01 | 950   | 1.90M   | [Edit] |  |
|  +--------------------------------------------+  |
|                                                  |
|  Total Records: 156                              |
|  Total Revenue: 45,230,000 KRW                   |
|                                                  |
|  [Export Excel]              [< Prev] [Next >]   |
+--------------------------------------------------+
```

---

## 10. Error Handling

### 10.1 LLM Analysis Failure

If LLM cannot identify data structure:
1. Show preview of uploaded Excel
2. Allow user to manually select columns
3. Save mapping for future use

### 10.2 Price Not Found

If model not in price DB:
1. Highlight missing models
2. Allow user to add price inline
3. Continue calculation with available data

### 10.3 Duplicate Entry

If actual data already exists for date + model:
1. Show warning with existing data
2. Options: Overwrite / Add / Cancel

### 10.4 Template Mismatch (NEW v1.2)

If template match confidence is low:
1. Show side-by-side comparison
2. Highlight differences from expected format
3. Options: Use template anyway / Full LLM analysis / Manual mapping

---

## 11. Future Enhancements (v2.0)

- [ ] Multiple forecast file comparison
- [ ] Trend analysis chart
- [ ] Auto email report
- [ ] Google Sheets integration option
- [ ] ERP auto-sync for actual data
- [ ] Variance analysis (Forecast vs Actual)
- [ ] Multi-user support with login
- [ ] **[NEW v1.2] Template sharing/export between users**
- [ ] **[NEW v1.2] Auto-suggest template improvements**

---

## 12. Development Phases

### Phase 1: MVP (Week 1-2)

- Basic Excel upload
- LLM analysis (Vision approach)
- Simple revenue calculation
- Basic result display
- Windows executable packaging

### Phase 2: Enhancement (Week 3-4)

- Price master CRUD
- Excel download
- Error handling UI
- Chart visualization
- Actual data entry
- Historical data storage

### Phase 3: Polish (Week 5-6)

- Combined Actual + Forecast view
- Dashboard metrics
- Data export features
- System tray integration
- Desktop shortcut installer
- **[NEW v1.2] Basic template learning**

### Phase 4: Intelligence (Week 7-8) (NEW v1.2)

- Template matching engine
- Confidence scoring system
- Template management UI
- Learning metrics dashboard
- Performance optimization

---

## 13. Success Criteria

| Metric | Target |
|--------|--------|
| Data extraction accuracy | > 90% |
| Processing time (new format) | < 30 seconds |
| Processing time (known format) | < 2 seconds |
| User intervention needed | < 10% of uploads |
| App startup time | < 5 seconds |
| One-click execution | Works on first try |
| **[NEW v1.2] Template hit rate** | > 70% after 1 month |
| **[NEW v1.2] API cost reduction** | > 50% after 1 month |

---

## Appendix A: Sample Data

### Forecast Excel Example

Various formats the system should handle:

**Format 1: Simple table**
```
Model  | Week1 | Week2 | Week3 | Week4
AAA-01 | 1000  | 1200  | 1100  | 1300
BBB-02 | 500   | 600   | 550   | 650
```

**Format 2: Date-based**
```
Date       | Model  | Quantity
2025-12-01 | AAA-01 | 200
2025-12-01 | BBB-02 | 100
2025-12-02 | AAA-01 | 250
```

**Format 3: With merged cells**
```
+------------------+------+------+
|      Model       | Week 1      |
|                  | Mon  | Tue  |
+------------------+------+------+
| AAA-01           | 50   | 60   |
+------------------+------+------+
```

---

## Appendix B: Claude API Prompt Template

```
You are analyzing a production forecast Excel screenshot.

Extract the following information as JSON:
1. model_name: Product/model identifiers
2. period: Date or week information  
3. quantity: Production quantities

Rules:
- Ignore header rows and totals
- Handle merged cells by associating values correctly
- If dates are week numbers, note as "Week 1", "Week 2", etc.

Output format:
{
  "data": [
    {
      "model": "AAA-01",
      "period": "2025-12-01",
      "quantity": 1000
    }
  ],
  "confidence": 0.95,
  "notes": "any observations"
}
```

---

## Appendix C: Template Learning Flow (NEW v1.2)

```
┌─────────────────────────────────────────────────────────────┐
│                     UPLOAD EXCEL FILE                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  GENERATE FINGERPRINT                        │
│  - Analyze structure, headers, patterns                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SEARCH TEMPLATE DATABASE                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ >= 90%   │    │ 70-89%   │    │ < 70%    │
       │ Match    │    │ Partial  │    │ No Match │
       └────┬─────┘    └────┬─────┘    └────┬─────┘
            │               │               │
            ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Direct   │    │ Template │    │ Full LLM │
       │ Parse    │    │ + Verify │    │ Analysis │
       └────┬─────┘    └────┬─────┘    └────┬─────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER VERIFICATION                         │
│  - Review extracted data                                     │
│  - Correct any errors                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 UPDATE TEMPLATE (if needed)                  │
│  - Save new template OR                                      │
│  - Update accuracy score OR                                  │
│  - Refine existing mapping                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-29 | Initial draft |
| 1.1 | 2025-11-29 | Added: Windows executable, Actual vs Forecast, Historical data |
| 1.2 | 2025-11-29 | Added: Template Learning System for pattern recognition |
