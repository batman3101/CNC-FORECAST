import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { getRevenueReport, getPrices } from '@/lib/api'
import { BarChart3, TrendingUp, Calendar, Download, Database, FileSpreadsheet } from 'lucide-react'

type ViewMode = 'actual' | 'forecast' | 'combined'

interface ReportItem {
  date: string
  model: string
  process: string
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

  // 가격맵: model|process 복합키 사용
  const priceMap = useMemo(() => {
    return prices?.items?.reduce((acc: Record<string, number>, p: { model: string; process: string; unit_price: number }) => {
      const key = `${p.model}|${p.process || ''}`
      acc[key] = p.unit_price
      return acc
    }, {}) || {}
  }, [prices?.items])

  // 가격 조회 함수 (model + process 조합)
  const getPrice = (model: string, process: string = '') => {
    const key = `${model}|${process}`
    if (priceMap[key] !== undefined) return priceMap[key]
    // process 없이 검색 시 해당 모델의 첫 번째 가격 반환
    const fallbackKey = Object.keys(priceMap).find(k => k.startsWith(`${model}|`))
    return fallbackKey ? priceMap[fallbackKey] : 0
  }

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
      acc.totalRevenue += item.quantity * getPrice(item.model, item.process)
      acc.models.add(item.model)
      return acc
    },
    { totalQuantity: 0, totalRevenue: 0, models: new Set<string>() }
  )

  // 공정별 집계
  const processSummary = reportItems.reduce((acc: Record<string, {
    quantity: number;
    revenue: number;
    models: Set<string>
  }>, item: ReportItem) => {
    const process = item.process || '(공정 없음)'
    if (!acc[process]) {
      acc[process] = { quantity: 0, revenue: 0, models: new Set<string>() }
    }
    acc[process].quantity += item.quantity
    acc[process].revenue += item.quantity * getPrice(item.model, item.process)
    acc[process].models.add(item.model)
    return acc
  }, {})

  // 모델별 > 공정별 집계
  interface ProcessData {
    quantity: number
    revenue: number
  }
  interface ModelData {
    totalQuantity: number
    totalRevenue: number
    processes: Record<string, ProcessData>
  }

  // 공정 순서 정의 (고정)
  const PROCESS_ORDER = ['CNC 1 ~ CNC 2', 'CL1 ~ CL2', 'TRI']

  const modelProcessSummary = reportItems.reduce((acc: Record<string, ModelData>, item: ReportItem) => {
    const model = item.model
    const process = item.process || '(공정 없음)'
    const unitPrice = getPrice(item.model, item.process)
    const itemRevenue = item.quantity * unitPrice

    if (!acc[model]) {
      acc[model] = { totalQuantity: 0, totalRevenue: 0, processes: {} }
    }
    if (!acc[model].processes[process]) {
      acc[model].processes[process] = { quantity: 0, revenue: 0 }
    }

    acc[model].totalQuantity += item.quantity
    acc[model].totalRevenue += itemRevenue
    acc[model].processes[process].quantity += item.quantity
    acc[model].processes[process].revenue += itemRevenue

    return acc
  }, {})

  const sortedModels = Object.entries(modelProcessSummary)
    .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)

  // 공정 순서대로 정렬하는 함수
  const sortProcesses = (processes: Record<string, ProcessData>) => {
    return Object.entries(processes)
      .filter(([, data]) => data.quantity > 0) // 수량이 0인 공정 제외
      .sort(([a], [b]) => {
        const indexA = PROCESS_ORDER.indexOf(a)
        const indexB = PROCESS_ORDER.indexOf(b)
        // 정의된 순서에 없으면 맨 뒤로
        const orderA = indexA === -1 ? 999 : indexA
        const orderB = indexB === -1 ? 999 : indexB
        return orderA - orderB
      })
  }

  // 고유 모델 목록 추출
  const uniqueModels = useMemo(() => {
    const models = [...new Set(reportItems.map(item => item.model))]
    return models.sort()
  }, [reportItems])

  // 고유 공정 목록 (고정 순서)
  const uniqueProcesses = PROCESS_ORDER

  // DataTable columns definition
  const columns: Column<ReportItem>[] = useMemo(() => [
    {
      key: 'date',
      header: '날짜',
      sortable: true,
      filterable: true,
      filterType: 'dateRange' as const,
    },
    {
      key: 'model',
      header: '모델',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: uniqueModels,
    },
    {
      key: 'process',
      header: '공정',
      sortable: true,
      filterable: true,
      filterType: 'select' as const,
      filterOptions: uniqueProcesses,
      render: (value) => (value as string) || '-',
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
      render: (_, row) => formatCurrency(getPrice(row.model, row.process)),
    },
    {
      key: 'revenue',
      header: '매출',
      sortable: false,
      align: 'right',
      render: (_, row) => (
        <span className="font-medium">
          {formatCurrency(row.quantity * getPrice(row.model, row.process))}
        </span>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [priceMap, uniqueModels])

  const exportToCSV = () => {
    if (!reportItems.length) return

    const headers = ['날짜', '모델', '공정', '수량', '단가', '매출']
    const rows = reportItems.map((item: ReportItem) => {
      const unitPrice = getPrice(item.model, item.process)
      return [
        item.date,
        item.model,
        item.process || '',
        item.quantity,
        unitPrice,
        item.quantity * unitPrice,
      ]
    })

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

  // Excel 리포트 내보내기 (상세)
  const exportToExcel = async () => {
    if (!reportItems.length) return

    // 공정별 합계 계산
    const getProcessTotal = (process: string) => {
      const data = processSummary[process]
      return data ? { quantity: data.quantity, revenue: data.revenue, modelCount: data.models.size } : { quantity: 0, revenue: 0, modelCount: 0 }
    }

    // HTML 테이블로 Excel 생성 (간단한 방식)
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; }
        th { background-color: #4472C4; color: white; }
        .header { background-color: #2F5496; color: white; font-size: 16px; font-weight: bold; }
        .subheader { background-color: #D6DCE4; font-weight: bold; }
        .number { text-align: right; }
        .total { background-color: #FFF2CC; font-weight: bold; }
      </style>
      </head><body>

      <h2>매출 리포트</h2>
      <p>기간: ${startDate} ~ ${endDate}</p>
      <p>조회 유형: ${viewMode === 'actual' ? '실적' : viewMode === 'forecast' ? '예측' : '전체'}</p>
      <br/>

      <h3>📊 요약</h3>
      <table>
        <tr class="header"><th colspan="4">총계</th></tr>
        <tr><th>구분</th><th>총 매출</th><th>총 수량</th><th>모델 수</th></tr>
        <tr class="total">
          <td>전체</td>
          <td class="number">${formatCurrency(summary.totalRevenue)}</td>
          <td class="number">${formatNumber(summary.totalQuantity)}</td>
          <td class="number">${summary.models.size}</td>
        </tr>
      </table>
      <br/>

      <h3>🔧 공정별 현황</h3>
      <table>
        <tr class="header"><th>공정</th><th>매출</th><th>수량</th><th>모델 수</th><th>매출 비중</th></tr>
        ${PROCESS_ORDER.map(process => {
          const data = getProcessTotal(process)
          const percentage = summary.totalRevenue > 0 ? (data.revenue / summary.totalRevenue * 100).toFixed(1) : '0.0'
          return `<tr>
            <td>${process}</td>
            <td class="number">${formatCurrency(data.revenue)}</td>
            <td class="number">${formatNumber(data.quantity)}</td>
            <td class="number">${data.modelCount}</td>
            <td class="number">${percentage}%</td>
          </tr>`
        }).join('')}
      </table>
      <br/>

      <h3>📦 모델별 공정별 상세</h3>
      <table>
        <tr class="header"><th>모델</th><th>공정</th><th>수량</th><th>매출</th><th>비중</th></tr>
        ${sortedModels.map(([model, modelData]) => {
          const processes = sortProcesses(modelData.processes)
          return processes.map(([process, processData], idx) => `
            <tr>
              <td>${idx === 0 ? model : ''}</td>
              <td>${process}</td>
              <td class="number">${formatNumber(processData.quantity)}</td>
              <td class="number">${formatCurrency(processData.revenue)}</td>
              <td class="number">${summary.totalRevenue > 0 ? (processData.revenue / summary.totalRevenue * 100).toFixed(2) : '0.00'}%</td>
            </tr>
          `).join('') + `
            <tr class="subheader">
              <td>${model} 소계</td>
              <td></td>
              <td class="number">${formatNumber(modelData.totalQuantity)}</td>
              <td class="number">${formatCurrency(modelData.totalRevenue)}</td>
              <td class="number">${summary.totalRevenue > 0 ? (modelData.totalRevenue / summary.totalRevenue * 100).toFixed(2) : '0.00'}%</td>
            </tr>
          `
        }).join('')}
        <tr class="total">
          <td colspan="2">총계</td>
          <td class="number">${formatNumber(summary.totalQuantity)}</td>
          <td class="number">${formatCurrency(summary.totalRevenue)}</td>
          <td class="number">100%</td>
        </tr>
      </table>
      <br/>

      <h3>📋 상세 내역</h3>
      <table>
        <tr class="header"><th>날짜</th><th>모델</th><th>공정</th><th>수량</th><th>단가</th><th>매출</th></tr>
        ${reportItems.map(item => {
          const unitPrice = getPrice(item.model, item.process)
          return `<tr>
            <td>${item.date}</td>
            <td>${item.model}</td>
            <td>${item.process || '-'}</td>
            <td class="number">${formatNumber(item.quantity)}</td>
            <td class="number">${formatCurrency(unitPrice)}</td>
            <td class="number">${formatCurrency(item.quantity * unitPrice)}</td>
          </tr>`
        }).join('')}
      </table>

      </body></html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `매출리포트_${startDate}_${endDate}.xls`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">매출 리포트</h1>
          <p className="text-muted-foreground">기간별 매출 현황을 분석합니다</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} disabled={!reportItems.length} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel 리포트
          </Button>
          <Button onClick={exportToCSV} disabled={!reportItems.length}>
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
        </div>
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
        {/* 총 매출 */}
        <div className="space-y-2">
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
          {/* 공정별 매출 서브카드 */}
          <div className="grid grid-cols-3 gap-1">
            {PROCESS_ORDER.map((process) => {
              const data = processSummary[process]
              const revenue = data?.revenue || 0
              const percentage = summary.totalRevenue > 0 ? (revenue / summary.totalRevenue * 100).toFixed(1) : '0.0'
              return (
                <Card key={`rev-${process}`} className="bg-white dark:bg-green-950/20">
                  <CardContent className="p-2 text-center">
                    <div className="text-[10px] text-muted-foreground truncate" title={process}>{process}</div>
                    <div className="text-xs font-semibold text-foreground">{formatCurrency(revenue)}</div>
                    <div className="text-[10px] text-muted-foreground">{percentage}%</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 총 수량 */}
        <div className="space-y-2">
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
          {/* 공정별 수량 서브카드 */}
          <div className="grid grid-cols-3 gap-1">
            {PROCESS_ORDER.map((process) => {
              const data = processSummary[process]
              const quantity = data?.quantity || 0
              const percentage = summary.totalQuantity > 0 ? (quantity / summary.totalQuantity * 100).toFixed(1) : '0.0'
              return (
                <Card key={`qty-${process}`} className="bg-white dark:bg-blue-950/20">
                  <CardContent className="p-2 text-center">
                    <div className="text-[10px] text-muted-foreground truncate" title={process}>{process}</div>
                    <div className="text-xs font-semibold text-foreground">{formatNumber(quantity)}</div>
                    <div className="text-[10px] text-muted-foreground">{percentage}%</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 모델 수 */}
        <div className="space-y-2">
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
          {/* 공정별 모델 수 서브카드 */}
          <div className="grid grid-cols-3 gap-1">
            {PROCESS_ORDER.map((process) => {
              const data = processSummary[process]
              const modelCount = data?.models.size || 0
              return (
                <Card key={`model-${process}`} className="bg-white dark:bg-purple-950/20">
                  <CardContent className="p-2 text-center">
                    <div className="text-[10px] text-muted-foreground truncate" title={process}>{process}</div>
                    <div className="text-xs font-semibold text-foreground">{modelCount}</div>
                    <div className="text-[10px] text-muted-foreground">모델</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* 모델별 공정별 매출 */}
      <Card>
        <CardHeader>
          <CardTitle>모델별 공정별 매출 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : sortedModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 기간에 데이터가 없습니다
            </div>
          ) : (
            <div className="space-y-6">
              {sortedModels.map(([model, modelData]) => {
                const percentage = summary.totalRevenue > 0
                  ? (modelData.totalRevenue / summary.totalRevenue) * 100
                  : 0
                const processes = sortProcesses(modelData.processes)

                return (
                  <div key={model} className="space-y-3 pb-4 border-b last:border-b-0">
                    {/* 모델 헤더 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-lg">{model}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          (총 {formatNumber(modelData.totalQuantity)}개)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(modelData.totalRevenue)}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* 공정별 내역 */}
                    <div className="ml-4 space-y-2">
                      {processes.map(([process, processData]) => {
                        const processPercentage = modelData.totalRevenue > 0
                          ? (processData.revenue / modelData.totalRevenue) * 100
                          : 0
                        return (
                          <div key={`${model}-${process}`} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary/60" />
                              <span className="text-muted-foreground">{process}</span>
                              <span className="text-muted-foreground">
                                ({formatNumber(processData.quantity)}개)
                              </span>
                            </div>
                            <div className="text-right">
                              <span>{formatCurrency(processData.revenue)}</span>
                              <span className="text-muted-foreground ml-2">
                                ({processPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* 진행바 */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* 총합계 */}
              <div className="pt-4 border-t-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg">총합계</span>
                    <span className="text-muted-foreground ml-2">
                      ({summary.models.size}개 모델)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-primary">
                      {formatCurrency(summary.totalRevenue)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(summary.totalQuantity)}개
                    </div>
                  </div>
                </div>
              </div>
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
