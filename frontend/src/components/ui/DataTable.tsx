import { useState, useMemo, type ReactNode } from 'react'
import { Input } from './Input'
import { Button } from './Button'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X
} from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  filterable?: boolean
  filterOptions?: string[]
  render?: (value: unknown, row: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
  rowKey?: (row: T, index: number) => string
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 20,
  searchable = true,
  searchPlaceholder = '검색...',
  emptyMessage = '데이터가 없습니다',
  loading = false,
  rowKey,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  // Get value from nested key like "user.name"
  const getValue = (row: T, key: string): unknown => {
    const keys = key.split('.')
    let value: unknown = row
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return undefined
      }
    }
    return value
  }

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data]

    // Global search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter((row) =>
        columns.some((col) => {
          const value = getValue(row, String(col.key))
          return String(value ?? '').toLowerCase().includes(lowerSearch)
        })
      )
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter((row) => {
          const value = getValue(row, key)
          return String(value ?? '').toLowerCase().includes(filterValue.toLowerCase())
        })
      }
    })

    return result
  }, [data, searchTerm, columnFilters, columns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, sortKey)
      const bValue = getValue(b, sortKey)

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1

      // Compare
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr)
      }
      return bStr.localeCompare(aStr)
    })
  }, [filteredData, sortKey, sortDirection])

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
    setCurrentPage(1)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setColumnFilters({})
    setSortKey(null)
    setSortDirection(null)
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm || Object.values(columnFilters).some(Boolean)

  // Render sort icon
  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4" />
    }
    return <ArrowDown className="h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      <div className="flex flex-wrap items-center gap-4">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
        )}
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            필터 초기화
          </Button>
        )}
        <div className="text-sm text-muted-foreground ml-auto">
          총 {sortedData.length}건
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`py-3 px-4 font-medium text-sm ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{ width: col.width }}
                >
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''
                      } ${col.sortable !== false ? 'cursor-pointer hover:text-foreground' : ''}`}
                      onClick={() => col.sortable !== false && handleSort(String(col.key))}
                    >
                      <span>{col.header}</span>
                      {col.sortable !== false && renderSortIcon(String(col.key))}
                    </div>
                    {col.filterable && (
                      col.filterOptions ? (
                        <select
                          className="w-full h-7 text-xs rounded border border-input bg-background px-2"
                          value={columnFilters[String(col.key)] || ''}
                          onChange={(e) => handleFilterChange(String(col.key), e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">전체</option>
                          {col.filterOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          className="h-7 text-xs"
                          placeholder={`${col.header} 필터`}
                          value={columnFilters[String(col.key)] || ''}
                          onChange={(e) => handleFilterChange(String(col.key), e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  로딩 중...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row, index) : index}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  {columns.map((col) => {
                    const value = getValue(row, String(col.key))
                    return (
                      <td
                        key={String(col.key)}
                        className={`py-3 px-4 ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {col.render ? col.render(value, row, index) : String(value ?? '-')}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedData.length)} / {sortedData.length}건
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
