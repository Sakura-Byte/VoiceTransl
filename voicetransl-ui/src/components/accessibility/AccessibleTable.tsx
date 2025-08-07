import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { useScreenReader, useAccessibilityPreferences } from '@/hooks/useAccessibility'
import { KeyboardKeys } from '@/utils/accessibility'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface TableColumn<T = any> {
  id: string
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  ariaLabel?: string
}

interface TableRow {
  id: string | number
  [key: string]: any
}

interface AccessibleTableProps<T = TableRow> {
  data: T[]
  columns: TableColumn<T>[]
  caption?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onRowSelect?: (row: T, index: number) => void
  selectedRows?: Set<string | number>
  selectable?: boolean
  className?: string
  emptyMessage?: string
  loading?: boolean
  pageSize?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  totalPages?: number
}

export function AccessibleTable<T extends TableRow>({
  data,
  columns,
  caption,
  sortBy,
  sortDirection,
  onSort,
  onRowSelect,
  selectedRows = new Set(),
  selectable = false,
  className,
  emptyMessage = "No data available",
  loading = false,
  pageSize,
  currentPage = 1,
  onPageChange,
  totalPages
}: AccessibleTableProps<T>) {
  const { announce } = useScreenReader()
  const preferences = useAccessibilityPreferences()
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const cellRefs = useRef<(HTMLElement | null)[][]>([])

  const handleSort = useCallback((columnId: string) => {
    if (!onSort) return
    
    const newDirection = sortBy === columnId && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(columnId, newDirection)
    
    const column = columns.find(col => col.id === columnId)
    announce(`Table sorted by ${column?.header} ${newDirection}ending`)
  }, [sortBy, sortDirection, onSort, columns, announce])

  const handleCellKeyDown = useCallback((e: KeyboardEvent, rowIndex: number, colIndex: number) => {
    let newRow = rowIndex
    let newCol = colIndex
    
    switch (e.key) {
      case KeyboardKeys.ARROW_RIGHT:
        e.preventDefault()
        newCol = Math.min(colIndex + 1, columns.length - 1)
        break
      case KeyboardKeys.ARROW_LEFT:
        e.preventDefault()
        newCol = Math.max(colIndex - 1, 0)
        break
      case KeyboardKeys.ARROW_DOWN:
        e.preventDefault()
        newRow = Math.min(rowIndex + 1, data.length - 1)
        break
      case KeyboardKeys.ARROW_UP:
        e.preventDefault()
        newRow = Math.max(rowIndex - 1, 0)
        break
      case KeyboardKeys.HOME:
        e.preventDefault()
        newCol = 0
        break
      case KeyboardKeys.END:
        e.preventDefault()
        newCol = columns.length - 1
        break
      case KeyboardKeys.ENTER:
      case KeyboardKeys.SPACE:
        if (selectable && onRowSelect) {
          e.preventDefault()
          onRowSelect(data[rowIndex], rowIndex)
          const isSelected = selectedRows.has(data[rowIndex].id)
          announce(`Row ${rowIndex + 1} ${isSelected ? 'deselected' : 'selected'}`)
        }
        break
    }
    
    if (newRow !== rowIndex || newCol !== colIndex) {
      setFocusedCell({ row: newRow, col: newCol })
      const cell = cellRefs.current[newRow]?.[newCol]
      if (cell) {
        cell.focus()
      }
    }
  }, [columns.length, data, selectable, onRowSelect, selectedRows, announce])

  const getCellValue = useCallback((row: T, column: TableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    return row[column.accessor as string]
  }, [])

  const renderCell = useCallback((row: T, column: TableColumn<T>, rowIndex: number, colIndex: number) => {
    const value = getCellValue(row, column)
    const isSelected = selectedRows.has(row.id)
    const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex
    
    return (
      <td
        key={column.id}
        ref={(el) => {
          if (!cellRefs.current[rowIndex]) {
            cellRefs.current[rowIndex] = []
          }
          cellRefs.current[rowIndex][colIndex] = el
        }}
        className={cn(
          "px-4 py-3 text-sm border-b border-gray-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50",
          column.align === 'center' && "text-center",
          column.align === 'right' && "text-right",
          isSelected && "bg-blue-50",
          preferences.reducedMotion ? "" : "transition-colors duration-150"
        )}
        style={{ width: column.width }}
        tabIndex={isFocused ? 0 : -1}
        role={selectable ? "gridcell" : "cell"}
        aria-selected={selectable ? isSelected : undefined}
        onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
        onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
        onClick={selectable && onRowSelect ? () => onRowSelect(row, rowIndex) : undefined}
      >
        {value}
      </td>
    )
  }, [selectedRows, focusedCell, handleCellKeyDown, selectable, onRowSelect, preferences.reducedMotion])

  if (loading) {
    return (
      <div className="w-full" role="status" aria-live="polite">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded mb-1"></div>
          ))}
        </div>
        <span className="sr-only">Loading table data</span>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Table Container */}
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table
          ref={tableRef}
          className="w-full divide-y divide-gray-200"
          role={selectable ? "grid" : "table"}
          aria-label={caption}
          aria-rowcount={data.length + 1} // +1 for header
          aria-colcount={columns.length}
        >
          {caption && (
            <caption className="sr-only">
              {caption}
              {data.length > 0 && `. ${data.length} rows displayed.`}
              {selectable && " Use arrow keys to navigate, Enter or Space to select rows."}
            </caption>
          )}
          
          {/* Header */}
          <thead className="bg-gray-50">
            <tr role="row" aria-rowindex={1}>
              {columns.map((column, index) => (
                <th
                  key={column.id}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.sortable && "cursor-pointer select-none hover:bg-gray-100",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    preferences.reducedMotion ? "" : "transition-colors duration-150"
                  )}
                  style={{ width: column.width }}
                  role="columnheader"
                  aria-sort={
                    sortBy === column.id 
                      ? sortDirection === 'asc' ? 'ascending' : 'descending'
                      : column.sortable ? 'none' : undefined
                  }
                  aria-colindex={index + 1}
                  tabIndex={column.sortable ? 0 : -1}
                  onClick={column.sortable ? () => handleSort(column.id) : undefined}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === KeyboardKeys.ENTER || e.key === KeyboardKeys.SPACE)) {
                      e.preventDefault()
                      handleSort(column.id)
                    }
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={cn(
                            "w-3 h-3 -mb-1",
                            sortBy === column.id && sortDirection === 'asc' 
                              ? "text-gray-900" 
                              : "text-gray-300"
                          )}
                          aria-hidden="true"
                        />
                        <ChevronDown 
                          className={cn(
                            "w-3 h-3",
                            sortBy === column.id && sortDirection === 'desc' 
                              ? "text-gray-900" 
                              : "text-gray-300"
                          )}
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-500"
                  role="cell"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={cn(
                    selectable && "cursor-pointer hover:bg-gray-50",
                    selectedRows.has(row.id) && "bg-blue-50",
                    preferences.reducedMotion ? "" : "transition-colors duration-150"
                  )}
                  role="row"
                  aria-rowindex={rowIndex + 2} // +2 because header is row 1
                  aria-selected={selectable ? selectedRows.has(row.id) : undefined}
                >
                  {columns.map((column, colIndex) => 
                    renderCell(row, column, rowIndex, colIndex)
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center text-sm text-gray-700">
            <span>
              Page {currentPage} of {totalPages}
              {pageSize && ` (${pageSize} per page)`}
            </span>
          </div>
          
          <nav className="flex items-center space-x-2" aria-label="Table pagination">
            <button
              type="button"
              className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Go to previous page"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Go to next page"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

// Accessible Table Row Selection Summary
interface TableSelectionSummaryProps {
  totalRows: number
  selectedCount: number
  onSelectAll?: () => void
  onClearSelection?: () => void
  className?: string
}

export function AccessibleTableSelectionSummary({
  totalRows,
  selectedCount,
  onSelectAll,
  onClearSelection,
  className
}: TableSelectionSummaryProps) {
  const { announce } = useScreenReader()
  
  const handleSelectAll = () => {
    onSelectAll?.()
    announce(`All ${totalRows} rows selected`)
  }
  
  const handleClearSelection = () => {
    onClearSelection?.()
    announce("Selection cleared")
  }
  
  if (selectedCount === 0) return null
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md mb-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="text-sm text-blue-800">
        {selectedCount} of {totalRows} rows selected
      </span>
      
      <div className="flex items-center space-x-2">
        {selectedCount < totalRows && onSelectAll && (
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
            onClick={handleSelectAll}
          >
            Select all {totalRows}
          </button>
        )}
        
        {onClearSelection && (
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
            onClick={handleClearSelection}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  )
}