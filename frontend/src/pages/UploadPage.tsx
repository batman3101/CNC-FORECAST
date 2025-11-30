import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, AlertCircle, Save, CheckCircle, SkipForward } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FileUpload } from '@/components/FileUpload'
import { uploadForecast, saveTemplate, saveForecast } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import type { ForecastUploadResponse, ForecastSaveResponse } from '@/types'

export default function UploadPage() {
  const queryClient = useQueryClient()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [result, setResult] = useState<ForecastUploadResponse | null>(null)
  const [saveResult, setSaveResult] = useState<ForecastSaveResponse | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [showTemplateForm, setShowTemplateForm] = useState(false)

  // 파일 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: uploadForecast,
    onSuccess: (data: ForecastUploadResponse) => {
      setResult(data)
      setSaveResult(null)
    },
    onError: (error) => {
      console.error('Upload error:', error)
    }
  })

  // Forecast 저장 mutation
  const saveForecastMutation = useMutation({
    mutationFn: saveForecast,
    onSuccess: (data: ForecastSaveResponse) => {
      setSaveResult(data)
      queryClient.invalidateQueries({ queryKey: ['forecasts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-report'] })
    },
    onError: (error) => {
      console.error('Save error:', error)
    }
  })

  // 템플릿 저장 mutation
  const saveTemplateMutation = useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) =>
      saveTemplate(file, name, {}),
    onSuccess: () => {
      setShowTemplateForm(false)
      setTemplateName('')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    }
  })

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
    setResult(null)
    setSaveResult(null)
    uploadMutation.mutate(file)
  }

  const handleConfirmSave = () => {
    if (!result?.data) return

    // period를 forecast_date로 변환하여 저장
    const items = result.data.map(item => ({
      model: item.model,
      forecast_date: item.period,
      process: item.process,
      quantity: item.quantity
    }))

    saveForecastMutation.mutate(items)
  }

  const handleSaveTemplate = () => {
    if (!uploadedFile || !templateName) return
    saveTemplateMutation.mutate({ file: uploadedFile, name: templateName })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Forecast 업로드</h1>
        <p className="text-gray-500 mt-1">Excel 파일을 업로드하면 AI가 자동으로 분석합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>파일 업로드</CardTitle>
          <CardDescription>Excel 파일 (.xlsx, .xls)을 드래그하거나 클릭하여 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFileSelect={handleFileSelect}
            accept=".xlsx,.xls"
            isLoading={uploadMutation.isPending}
          />
        </CardContent>
      </Card>

      {uploadMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>파일 처리 중 오류가 발생했습니다. 다시 시도해주세요.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {result.template_matched ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  분석 결과
                </CardTitle>
                <CardDescription>
                  {result.template_matched
                    ? `템플릿 "${result.template_name}" 매칭됨`
                    : '새로운 형식 - 템플릿 저장을 권장합니다'}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">신뢰도</div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(result.confidence * 100)}%
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">모델</th>
                    <th className="text-left p-3">공정</th>
                    <th className="text-left p-3">기간</th>
                    <th className="text-right p-3">수량</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.model}</td>
                      <td className="p-3 text-gray-600">{item.process || '-'}</td>
                      <td className="p-3 text-gray-600">{item.period}</td>
                      <td className="p-3 text-right">{formatNumber(item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.notes && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                {result.notes}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleConfirmSave}
                disabled={saveForecastMutation.isPending || saveResult?.success}
                className="flex items-center gap-2"
              >
                {saveForecastMutation.isPending ? (
                  <>저장 중...</>
                ) : saveResult?.success ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    저장 완료
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    확인 및 저장
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowTemplateForm(true)}
              >
                {result.template_matched ? '새 템플릿으로 저장' : '템플릿으로 저장'}
              </Button>
            </div>

            {/* 저장 결과 표시 */}
            {saveResult && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <CheckCircle className="h-5 w-5" />
                  Forecast 저장 완료
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">신규 생성:</span>
                    <span className="ml-2 font-medium">{saveResult.created_count}건</span>
                  </div>
                  <div>
                    <span className="text-gray-500">업데이트:</span>
                    <span className="ml-2 font-medium">{saveResult.updated_count}건</span>
                  </div>
                  <div>
                    <span className="text-gray-500">총 처리:</span>
                    <span className="ml-2 font-medium">{saveResult.total_count}건</span>
                  </div>
                  {saveResult.skipped_count > 0 && (
                    <div className="flex items-center gap-1">
                      <SkipForward className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600">스킵 (과거 날짜):</span>
                      <span className="ml-1 font-medium text-orange-700">{saveResult.skipped_count}건</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 템플릿 저장 폼 */}
            {showTemplateForm && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-3">
                  <Input
                    placeholder="템플릿 이름"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={!templateName || saveTemplateMutation.isPending}
                  >
                    {saveTemplateMutation.isPending ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplateForm(false)}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
