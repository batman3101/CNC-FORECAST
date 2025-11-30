import { Dashboard } from '@/components/Dashboard'
import { Card, CardContent } from '@/components/ui/Card'
import { Upload, FileSpreadsheet, BarChart3, Database } from 'lucide-react'

interface DashboardPageProps {
  onNavigate: (page: string) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const quickActions = [
    {
      id: 'upload',
      label: '새 Forecast 업로드',
      icon: Upload,
      description: 'Excel 파일 분석',
    },
    {
      id: 'actual',
      label: '실적 입력',
      icon: FileSpreadsheet,
      description: '오늘 생산 실적',
    },
    {
      id: 'report',
      label: '전체 리포트',
      icon: BarChart3,
      description: '매출 상세 분석',
    },
    {
      id: 'prices',
      label: '단가 마스터',
      icon: Database,
      description: '단가 정보 관리',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">매출 현황을 한눈에 확인하세요</p>
      </div>

      {/* 대시보드 지표 */}
      <Dashboard />

      {/* 빠른 작업 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onNavigate(action.id)}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{action.label}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
