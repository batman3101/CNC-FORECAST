import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getTemplates, deleteTemplate, activateTemplate, deactivateTemplate, getTemplateStats } from '@/lib/api'
import { Settings, Trash2, Search, Check, X, FileSpreadsheet, Clock, CheckCircle } from 'lucide-react'

interface Template {
  id: number
  name: string
  column_mapping: Record<string, string>
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TemplateStats {
  total: number
  active: number
  inactive: number
}

export function TemplatesPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  })

  const { data: stats } = useQuery<TemplateStats>({
    queryKey: ['template-stats'],
    queryFn: getTemplateStats,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-stats'] })
    },
  })

  const activateMutation = useMutation({
    mutationFn: (id: number) => activateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-stats'] })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deactivateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-stats'] })
    },
  })

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggleActive = (template: Template) => {
    if (template.is_active) {
      deactivateMutation.mutate(template.id)
    } else {
      activateMutation.mutate(template.id)
    }
  }

  const filteredTemplates = templates?.filter((t: Template) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">템플릿 관리</h1>
        <p className="text-muted-foreground">Excel 업로드 템플릿을 관리합니다</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 템플릿</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">등록된 템플릿</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">활성 템플릿</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">사용 가능</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">비활성 템플릿</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inactive || 0}</div>
            <p className="text-xs text-muted-foreground">사용 중지</p>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="템플릿 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* 템플릿 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            템플릿 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? '검색 결과가 없습니다' : '등록된 템플릿이 없습니다'}
              <p className="text-sm mt-2">
                Forecast 업로드 페이지에서 새 템플릿을 생성할 수 있습니다
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((template: Template) => (
                <div
                  key={template.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div className="p-4 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {template.name}
                          {template.is_active && (
                            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded">
                              활성
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          생성: {formatDate(template.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                      >
                        {expandedId === template.id ? '접기' : '상세'}
                      </Button>
                      <Button
                        size="sm"
                        variant={template.is_active ? 'outline' : 'default'}
                        onClick={() => handleToggleActive(template)}
                        disabled={activateMutation.isPending || deactivateMutation.isPending}
                      >
                        {template.is_active ? (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            비활성화
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            활성화
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(template.id, template.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedId === template.id && (
                    <div className="p-4 border-t bg-background">
                      <h4 className="font-medium mb-3">컬럼 매핑</h4>
                      <div className="grid gap-2">
                        {Object.entries(template.column_mapping).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
                          >
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-sm text-muted-foreground">
                        마지막 수정: {formatDate(template.updated_at)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 도움말 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">템플릿 사용 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>템플릿이란?</strong> Excel 파일의 컬럼을 자동으로 매핑하기 위한 설정입니다.
          </p>
          <p>
            <strong>활성 템플릿:</strong> 파일 업로드 시 자동으로 적용됩니다.
          </p>
          <p>
            <strong>새 템플릿 생성:</strong> Forecast 업로드 페이지에서 파일을 업로드하고 &quot;템플릿으로 저장&quot;을 선택하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
