import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Calendar, Target, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { getDashboardMetrics } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export function Dashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardMetrics,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-28 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'MTD 실적',
      value: formatCurrency(metrics?.mtd_actual || 0),
      icon: TrendingUp,
      description: '이번 달 실적 매출',
    },
    {
      title: '오늘 상태',
      value: metrics?.today_status || '대기중',
      icon: Clock,
      description: '오늘 실적 입력 상태',
    },
    {
      title: '월간 목표',
      value: formatCurrency(metrics?.monthly_target || 0),
      icon: Target,
      description: '실적 + 예상 매출',
    },
    {
      title: '달성률',
      value: `${metrics?.achievement_rate || 0}%`,
      icon: Calendar,
      description: 'MTD 실적 / 월간 목표',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
