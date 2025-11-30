import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { getRevenueReport, getPrices } from '@/lib/api'
import { BarChart3, TrendingUp, Calendar, Download, Database } from 'lucide-react'

type ViewMode = 'actual' | 'forecast' | 'combined'

interface ReportItem {
  date: string
  model: string
  quantity: number
  [key: string]: unknown
}

export function ReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // 이번 달 1일
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [viewMode, setViewMode] = useState<ViewMode>('combined')

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['revenue-report', startDate, endDate, viewMode],
    queryFn: () => getRevenueReport({ start_date: startDate, end_date: endDate, view_mode: viewMode }),
  })

  const { data: prices } = useQuery({
    queryKey: ['prices'],
    queryFn: getPrices,
  })

  const priceMap = prices?.items?.reduce((acc: Record<string, number>, p: { model: string; unit_price: number }) => {
    acc[p.model] = p.unit_price
    return acc
  }, {}) || {}

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  // reportData.items에서 데이터 추출
  const reportItems: ReportItem[] = reportData?.items || []

  // 데이터 집계
  const summary = reportItems.reduce(
    (acc: { totalQuantity: number; totalRevenue: number; models: Set<string> }, item: ReportItem) => {
      acc.totalQuantity += item.quantity
      acc.totalRevenue += item.quantity * (priceMap[item.model] || 0)
      acc.models.add(item.model)
      return acc
    },
    { totalQuantity: 0, totalRevenue: 0, models: new Set<string>() }
  )

  // 모델별 집계
  const modelSummary = reportItems.reduce((acc: Record<string, { quantity: number; revenue: number }>, item: ReportItem) => {
    if (!acc[item.model]) {
      acc[item.model] = { quantity: 0, revenue: 0 }
    }
    acc[item.model].quantity += item.quantity
    acc[item.model].revenue += item.quantity * (priceMap[item.model] || 0)
    return acc
  }, {})

  const sortedModels = Object.entries(modelSummary)
    .sort(([, a], [, b]) => (b as { revenue: number }).revenue - (a as { revenue: number }).revenue)

  // DataTable columns definition
  const columns: Column<ReportItem>[] = useMemo(() => [
    {
      key: 'date',
      header: '날짜',
      sortable: true,
      filterable: true,
    },
    {
      key: 'model',
      header: '모델',
      sortable: true,
      filterable: true,
    },
    {
      key: 'quantity',
      header: '수량',
      sortable: true,
      align: 'right',
      render: (value) => formatNumber(Number(value)),
    },
    {
      key: 'unitPrice',
      header: '단가',
      sortable: false,
      align: 'right',
      render: (_, row) => formatCurrency(priceMap[row.model] || 0),
    },
    {
      key: 'revenue',
      header: '매출',
      sortable: false,
      align: 'right',
      render: (_, row) => (
        <span className="font-medium">
          {formatCurrency(row.quantity * (priceMap[row.model] || 0))}
        </span>
      ),
    },
  ], [priceMap])

  const exportToCSV = () => {
    if (!reportItems.length) return

    const headers = ['날짜', '모델', '수량', '단가', '매출']
    const rows = reportItems.map((item: ReportItem) => [
      item.date,
      item.model,
      item.quantity,
      priceMap[item.model] || 0,
      item.quantity * (priceMap[item.model] || 0),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row: (string | number)[]) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `매출리포트_${startDate}_${endDate}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">매출 리포트</h1>
          <p className="text-muted-foreground">기간별 매출 현황을 분석합니다</p>
        </div>
        <Button onClick={exportToCSV} disabled={!reportItems.length}>
          <Download className="h-4 w-4 mr-2" />
          CSV 내보내기
        </Button>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'actual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('actual')}
              >
                실적만
              </Button>
              <Button
                variant={viewMode === 'forecast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('forecast')}
              >
                예측만
              </Button>
              <Button
                variant={viewMode === 'combined' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('combined')}
              >
                전체
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'actual' ? '실적 기준' : viewMode === 'forecast' ? '예측 기준' : '실적 + 예측'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 수량</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalQuantity)}</div>
            <p className="text-xs text-muted-foreground">생산 수량</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">모델 수</CardTitle>
            <Database className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.models.size}</div>
            <p className="text-xs text-muted-foreground">제품 종류</p>
          </CardContent>
        </Card>
      </div>

      {/* 모델별 매출 */}
      <Card>
        <CardHeader>
          <CardTitle>모델별 매출 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : sortedModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 기간에 데이터가 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {sortedModels.map(([model, data]) => {
                const typedData = data as { quantity: number; revenue: number }
                const percentage = summary.totalRevenue > 0
                  ? (typedData.revenue / summary.totalRevenue) * 100
                  : 0
                return (
                  <div key={model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{model}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({formatNumber(typedData.quantity)}개)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(typedData.revenue)}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>상세 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<ReportItem>
            data={reportItems}
            columns={columns}
            pageSize={20}
            searchable={true}
            searchPlaceholder="모델 검색..."
            emptyMessage="데이터가 없습니다"
            loading={isLoading}
            rowKey={(_, index) => `report-${index}`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
