import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { getActualRecords, getRevenueReport, getPrices } from '@/lib/api'
import { History, Calendar, FileText, TrendingUp, Package } from 'lucide-react'

type TabType = 'forecast' | 'actual'

interface RecordItem {
  id?: number
  date: string
  model: string
  quantity: number
  [key: string]: unknown
}

export function HistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('actual')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const { data: actualRecords, isLoading: isLoadingActual } = useQuery({
    queryKey: ['actual-records', startDate, endDate],
    queryFn: () => getActualRecords({ start_date: startDate, end_date: endDate }),
    enabled: activeTab === 'actual',
  })

  const { data: forecastRecords, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['forecast-records', startDate, endDate],
    queryFn: () => getRevenueReport({ start_date: startDate, end_date: endDate, view_mode: 'forecast' }),
    enabled: activeTab === 'forecast',
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

  const isLoading = activeTab === 'actual' ? isLoadingActual : isLoadingForecast
  const records: RecordItem[] = activeTab === 'actual' ? actualRecords || [] : forecastRecords?.items || []

  // 요약 데이터
  const summary = records.reduce(
    (acc: { totalQuantity: number; totalRevenue: number; models: Set<string> }, item: RecordItem) => {
      acc.totalQuantity += item.quantity
      acc.totalRevenue += item.quantity * (priceMap[item.model] || 0)
      acc.models.add(item.model)
      return acc
    },
    { totalQuantity: 0, totalRevenue: 0, models: new Set<string>() }
  )

  // DataTable columns definition
  const columns: Column<RecordItem>[] = useMemo(() => [
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
      render: (_, row) => (
        <span className="text-muted-foreground">
          {formatCurrency(priceMap[row.model] || 0)}
        </span>
      ),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">히스토리</h1>
        <p className="text-muted-foreground">과거 데이터를 조회합니다</p>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'actual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('actual')}
              >
                <FileText className="h-4 w-4 mr-2" />
                실적 기록
              </Button>
              <Button
                variant={activeTab === 'forecast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('forecast')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                예측 기록
              </Button>
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 수량</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalQuantity)}</div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'actual' ? '실적 기준' : '예측 기준'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">단가 적용</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">모델 수</CardTitle>
            <History className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.models.size}</div>
            <p className="text-xs text-muted-foreground">조회 기간 내</p>
          </CardContent>
        </Card>
      </div>

      {/* 기록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {activeTab === 'actual' ? '실적 기록' : '예측 기록'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<RecordItem>
            data={records}
            columns={columns}
            pageSize={20}
            searchable={true}
            searchPlaceholder="모델 검색..."
            emptyMessage="해당 기간에 데이터가 없습니다"
            loading={isLoading}
            rowKey={(row, index) => `${row.id || row.date}-${row.model}-${index}`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
