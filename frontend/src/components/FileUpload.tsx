import { useCallback, useState, useRef } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/Button'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
  accept?: string
}

export function FileUpload({ onFileSelect, isLoading, accept = '.xlsx,.xls' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.match(/\.(xlsx|xls)$/)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        isLoading && 'opacity-50 pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
        disabled={isLoading}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <FileSpreadsheet className="w-12 h-12 text-green-500" />
          <p className="font-medium">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
          <Button variant="outline" size="sm" onClick={handleButtonClick}>
            다른 파일 선택
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-medium">Excel 파일을 드래그하거나</p>
            <p className="text-sm text-muted-foreground">클릭하여 선택하세요</p>
          </div>
          <Button variant="outline" onClick={handleButtonClick}>
            파일 선택
          </Button>
          <p className="text-xs text-muted-foreground">.xlsx, .xls 지원</p>
        </div>
      )}
    </div>
  )
}
