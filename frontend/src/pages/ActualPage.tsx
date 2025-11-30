import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { getActualRecords, createActualRecord, deleteActualRecord, getPrices, getForecastModelsProcesses } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ActualRecord, PriceItem } from '@/types'

const DEFAULT_PROCESS_OPTIONS = ['CNC 1 ~ CNC 2', 'CL1 ~ CL2', 'TRI']

export function ActualPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    date: today,
    model: '',
    process: '',
    quantity: '',
  })

  const { data: records = [] } = useQuery({
    queryKey: ['actual-records'],
    queryFn: () => getActualRecords({ start_date: today }),
  })

  const { data: pricesData } = useQuery({
    queryKey: ['prices'],
    queryFn: getPrices,
  })

  const { data: forecastData } = useQuery({
    queryKey: ['forecast-models-processes'],
    queryFn: getForecastModelsProcesses,
  })

  // Combine price master models with forecast models (unique, sorted)
  const combinedModels = useMemo(() => {
    const priceModels = pricesData?.items?.map((item: PriceItem) => item.model) || []
    const forecastModels = forecastData?.models || []
    const allModels = [...new Set([...priceModels, ...forecastModels])]
    return allModels.sort()
  }, [pricesData?.items, forecastData?.models])

  // Combine default process options with forecast processes (unique, sorted)
  const combinedProcesses = useMemo(() => {
    const forecastProcesses = forecastData?.processes || []
    const allProcesses = [...new Set([...DEFAULT_PROCESS_OPTIONS, ...forecastProcesses])]
    return allProcesses.sort()
  }, [forecastData?.processes])

  const createMutation = useMutation({
    mutationFn: createActualRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actual-records'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFormData({ ...formData, model: '', process: '', quantity: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteActualRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actual-records'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.model && formData.process && formData.quantity) {
      createMutation.mutate({
        date: formData.date,
        model: formData.model,
        process: formData.process,
        quantity: parseInt(formData.quantity),
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">실적 입력</h1>
        <p className="text-muted-foreground">오늘의 출하 실적을 입력하세요</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 입력 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 입력</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">날짜</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">모델</label>
                <SearchableSelect
                  options={combinedModels}
                  value={formData.model}
                  onChange={(value) => setFormData({ ...formData, model: value })}
                  placeholder="모델 선택"
                  searchPlaceholder="모델 검색..."
                  emptyMessage="모델을 찾을 수 없습니다"
                />
              </div>
              <div>
                <label className="text-sm font-medium">공정</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm [&>option]:bg-background [&>option]:text-foreground"
                  value={formData.process}
                  onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                >
                  <option value="">공정 선택</option>
                  {combinedProcesses.map((process) => (
                    <option key={process} value={process}>
                      {process}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">수량</label>
                <Input
                  type="number"
                  placeholder="수량 입력"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {createMutation.isPending ? '저장 중...' : '실적 추가'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 오늘 입력된 실적 */}
        <Card>
          <CardHeader>
            <CardTitle>오늘 실적 ({formatDate(today)})</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <div className="space-y-2">
                {records.map((record: ActualRecord) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{record.model}</p>
                      <p className="text-sm text-muted-foreground">
                        공정: {record.process || '-'} | 수량: {record.quantity.toLocaleString()} | 매출: {formatCurrency(record.revenue)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(record.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium">
                    총 매출: {formatCurrency(records.reduce((sum: number, r: ActualRecord) => sum + r.revenue, 0))}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                오늘 입력된 실적이 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
