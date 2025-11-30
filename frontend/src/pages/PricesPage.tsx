import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { getPrices, addPrice, deletePrice, downloadPriceTemplate, validatePriceUpload, bulkRegisterPrices } from '@/lib/api'
import { Database, Plus, Trash2, DollarSign, X, Edit, Download, Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'

const processFilterOptions = ['CNC 1 ~ CNC 2', 'CL1 ~ CL2', 'TRI']

interface Price {
  model: string
  process: string
  unit_price: number
  [key: string]: unknown
}

interface ValidationResult {
  valid: boolean
  total_rows: number
  valid_rows: number
  error_rows: number
  errors: Array<{ row: number; field: string; message: string }>
  preview: Array<{ model: string; process: string; unit_price: number }>
}

const processOptions = [
  { value: 'CNC 1 ~ CNC 2', label: 'CNC 1 ~ CNC 2' },
  { value: 'CL1 ~ CL2', label: 'CL1 ~ CL2' },
  { value: 'TRI', label: 'TRI' },
]

export function PricesPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newModel, setNewModel] = useState('')
  const [newProcess, setNewProcess] = useState('')
  const [newPrice, setNewPrice] = useState('')

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [, setEditingPrice] = useState<Price | null>(null)
  const [editModel, setEditModel] = useState('')
  const [editProcess, setEditProcess] = useState('')
  const [editUnitPrice, setEditUnitPrice] = useState('')

  // Bulk upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const { data: prices, isLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: getPrices,
  })

  const addMutation = useMutation({
    mutationFn: ({ model, process, price }: { model: string; process: string; price: number }) =>
      addPrice(model, price, process),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] })
      setNewModel('')
      setNewProcess('')
      setNewPrice('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ model, process }: { model: string; process: string }) => deletePrice(model, process),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ model, process, price }: { model: string; process: string; price: number }) =>
      addPrice(model, price, process),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] })
      closeEditModal()
    },
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const handleAdd = () => {
    if (!newModel.trim() || !newProcess || !newPrice) return
    addMutation.mutate({ model: newModel.trim(), process: newProcess, price: Number(newPrice) })
  }

  const handleDelete = (model: string, process: string) => {
    if (window.confirm(`"${model}" (${process || '공정 없음'}) 단가를 삭제하시겠습니까?`)) {
      deleteMutation.mutate({ model, process })
    }
  }

  const openEditModal = (price: Price) => {
    setEditingPrice(price)
    setEditModel(price.model)
    setEditProcess(price.process || '')
    setEditUnitPrice(String(price.unit_price))
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingPrice(null)
    setEditModel('')
    setEditProcess('')
    setEditUnitPrice('')
  }

  const handleUpdate = () => {
    if (!editModel.trim() || !editProcess || !editUnitPrice) return
    updateMutation.mutate({
      model: editModel.trim(),
      process: editProcess,
      price: Number(editUnitPrice)
    })
  }

  // Bulk upload handlers
  const handleTemplateDownload = async () => {
    try {
      const blob = await downloadPriceTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'price_template.xlsx'
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Template download failed:', error)
      alert('템플릿 다운로드에 실패했습니다.')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setValidationResult(null)
    }
  }

  const handleValidate = async () => {
    if (!uploadedFile) return

    setIsValidating(true)
    try {
      const result = await validatePriceUpload(uploadedFile)
      setValidationResult(result)
    } catch (error) {
      console.error('Validation failed:', error)
      alert('파일 검증에 실패했습니다.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleBulkRegister = async () => {
    if (!validationResult?.valid || !validationResult.preview) return

    setIsRegistering(true)
    try {
      await bulkRegisterPrices(validationResult.preview)
      queryClient.invalidateQueries({ queryKey: ['prices'] })

      // Reset upload state
      setUploadedFile(null)
      setValidationResult(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      alert(`${validationResult.preview.length}개 단가가 성공적으로 등록되었습니다.`)
    } catch (error) {
      console.error('Bulk registration failed:', error)
      alert('일괄 등록에 실패했습니다.')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleClearUpload = () => {
    setUploadedFile(null)
    setValidationResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // prices.items에서 데이터 추출
  const priceItems = prices?.items || []

  const totalModels = priceItems.length
  const avgPrice = priceItems.length
    ? priceItems.reduce((sum: number, p: Price) => sum + p.unit_price, 0) / priceItems.length
    : 0

  // DataTable columns definition
  const columns: Column<Price>[] = useMemo(() => [
    {
      key: 'model',
      header: '모델',
      sortable: true,
      filterable: true,
    },
    {
      key: 'process',
      header: '공정',
      sortable: true,
      filterable: true,
      filterOptions: processFilterOptions,
      render: (value) => (
        <span className="px-2 py-1 rounded bg-muted text-sm">
          {String(value) || '-'}
        </span>
      ),
    },
    {
      key: 'unit_price',
      header: '단가',
      sortable: true,
      align: 'right',
      render: (value) => formatCurrency(Number(value)),
    },
    {
      key: 'actions',
      header: '작업',
      sortable: false,
      align: 'center',
      width: '150px',
      render: (_, row) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditModal(row)}
          >
            <Edit className="h-4 w-4 mr-1" />
            수정
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row.model, row.process)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [deleteMutation.isPending])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">단가 마스터</h1>
        <p className="text-muted-foreground">모델별 단가를 관리합니다</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">등록된 모델</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModels}</div>
            <p className="text-xs text-muted-foreground">총 모델 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">평균 단가</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgPrice)}</div>
            <p className="text-xs text-muted-foreground">모든 모델 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* 새 단가 추가 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            새 단가 추가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="모델명"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              className="flex-1 min-w-[150px]"
            />
            <select
              className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={newProcess}
              onChange={(e) => setNewProcess(e.target.value)}
            >
              <option value="">공정 선택</option>
              {processOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="단가 ($)"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-40"
              step="0.01"
            />
            <Button
              onClick={handleAdd}
              disabled={!newModel.trim() || !newProcess || !newPrice || addMutation.isPending}
            >
              {addMutation.isPending ? '추가 중...' : '추가'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 일괄 등록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            일괄 등록
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Template Download */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">1. 템플릿 다운로드</h4>
              <p className="text-sm text-muted-foreground">
                Excel 템플릿을 다운로드하여 단가 데이터를 입력하세요
              </p>
            </div>
            <Button variant="outline" onClick={handleTemplateDownload}>
              <Download className="h-4 w-4 mr-2" />
              템플릿 다운로드
            </Button>
          </div>

          {/* Step 2: File Upload */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">2. 파일 업로드</h4>
              <p className="text-sm text-muted-foreground">
                작성된 Excel 파일을 업로드하세요
              </p>
              {uploadedFile && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  <span>{uploadedFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={handleClearUpload}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 선택
              </Button>
            </div>
          </div>

          {/* Step 3: Validation */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium">3. 정합성 검증</h4>
              <p className="text-sm text-muted-foreground">
                업로드된 파일의 데이터를 검증합니다
              </p>
            </div>
            <Button
              onClick={handleValidate}
              disabled={!uploadedFile || isValidating}
            >
              {isValidating ? '검증 중...' : '정합성 검증'}
            </Button>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {validationResult.valid ? '검증 완료' : '검증 실패'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-muted rounded">
                  <div className="text-muted-foreground">전체 행</div>
                  <div className="text-lg font-bold">{validationResult.total_rows}</div>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded">
                  <div className="text-muted-foreground">유효 행</div>
                  <div className="text-lg font-bold text-green-600">{validationResult.valid_rows}</div>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded">
                  <div className="text-muted-foreground">오류 행</div>
                  <div className="text-lg font-bold text-red-600">{validationResult.error_rows}</div>
                </div>
              </div>

              {/* Error List */}
              {validationResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    오류 목록
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <div key={index} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="font-medium">행 {error.row}:</span> [{error.field}] {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {validationResult.valid && validationResult.preview.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium">미리보기 (처음 5개)</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">모델</th>
                          <th className="text-left py-2 px-3">공정</th>
                          <th className="text-right py-2 px-3">단가</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.preview.slice(0, 5).map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-3">{item.model}</td>
                            <td className="py-2 px-3">{item.process}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validationResult.preview.length > 5 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ... 외 {validationResult.preview.length - 5}개
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Register */}
              {validationResult.valid && (
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleBulkRegister}
                    disabled={isRegistering}
                    className="min-w-[120px]"
                  >
                    {isRegistering ? '등록 중...' : `${validationResult.preview.length}개 등록`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 단가 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>단가 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Price>
            data={priceItems}
            columns={columns}
            pageSize={20}
            searchable={true}
            searchPlaceholder="모델/공정 검색..."
            emptyMessage="등록된 단가가 없습니다"
            loading={isLoading}
            rowKey={(row, index) => `${row.model}-${row.process}-${index}`}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={closeEditModal}
          />
          <div className="relative z-50 w-full max-w-md bg-background rounded-lg shadow-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">단가 수정</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeEditModal}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">모델명</label>
                <Input
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  placeholder="모델명"
                />
              </div>

              <div>
                <label className="text-sm font-medium">공정</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editProcess}
                  onChange={(e) => setEditProcess(e.target.value)}
                >
                  <option value="">공정 선택</option>
                  {processOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">단가 ($)</label>
                <Input
                  type="number"
                  value={editUnitPrice}
                  onChange={(e) => setEditUnitPrice(e.target.value)}
                  placeholder="단가"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={closeEditModal}
                >
                  취소
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!editModel.trim() || !editProcess || !editUnitPrice || updateMutation.isPending}
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
