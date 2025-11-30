// Forecast
export interface ForecastItem {
  model: string
  period: string
  process?: string
  quantity: number
}

export interface ForecastSaveResponse {
  success: boolean
  created_count: number
  updated_count: number
  total_count: number
  skipped_count: number  // 업로드 날짜 이전 데이터로 스킵된 건수
}

export interface ForecastUploadResponse {
  success: boolean
  data: ForecastItem[]
  confidence: number
  notes?: string
  template_matched: boolean
  template_name?: string
}

// Price
export interface PriceItem {
  model: string
  process: string
  unit_price: number
}

export interface PriceMasterResponse {
  items: PriceItem[]
  total_count: number
}

// Actual Records
export interface ActualRecord {
  id: number
  date: string
  model: string
  process?: string
  quantity: number
  unit_price: number
  revenue: number
  created_at: string
  updated_at: string
}

// Revenue Report
export interface RevenueItem {
  date: string
  model: string
  process?: string
  record_type: 'actual' | 'forecast'
  quantity: number
  revenue: number
}

export interface RevenueSummary {
  actual_revenue: number
  forecast_revenue: number
  total_revenue: number
  achievement_rate: number
}

export interface RevenueReportResponse {
  items: RevenueItem[]
  summary: RevenueSummary
  period_start: string
  period_end: string
}

// Dashboard
export interface DashboardMetrics {
  mtd_actual: number
  mtd_forecast: number
  monthly_target: number
  achievement_rate: number
  today_status: string
}

// Template
export interface TemplateMapping {
  model_column: string
  model_start_row: number
  date_row: number
  date_start_column: string
  quantity_start_cell: string
  header_keywords: string[]
  date_format: string
  skip_rows: number[]
  skip_columns: string[]
}

export interface Template {
  id: number
  name: string
  fingerprint: string
  mapping: Record<string, unknown>
  accuracy_rate: number
  use_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TemplateStats {
  total_templates: number
  active_templates: number
  total_uploads: number
  template_hit_rate: number
  api_cost_saved: number
}
