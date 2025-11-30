import { useState, type ReactNode } from 'react'
import {
  Upload,
  BarChart3,
  Database,
  History,
  Settings,
  Menu,
  X,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/Button'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'dashboard', label: '대시보드', icon: BarChart3 },
  { id: 'upload', label: 'Forecast 업로드', icon: Upload },
  { id: 'actual', label: '실적 입력', icon: FileSpreadsheet },
  { id: 'report', label: '매출 리포트', icon: BarChart3 },
  { id: 'prices', label: '단가 마스터', icon: Database },
  { id: 'history', label: '히스토리', icon: History },
  { id: 'templates', label: '템플릿 관리', icon: Settings },
]

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span className="font-semibold">Forecast 매출 계산기</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-64 border-r bg-background transition-transform duration-200',
            !sidebarOpen && '-translate-x-full'
          )}
        >
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  currentPage === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main
          className={cn(
            'flex-1 p-6 transition-all duration-200',
            sidebarOpen ? 'ml-64' : 'ml-0'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
