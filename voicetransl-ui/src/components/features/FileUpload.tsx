import { useState, useRef, useCallback } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { Upload, X, Play, FileAudio, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useFileUpload } from '@/hooks/api'
import { toast } from 'sonner'

// Supported file types for VoiceTransl
const SUPPORTED_EXTENSIONS = [
  '.mp3', '.wav', '.mp4', '.avi', '.mkv', '.flac', '.m4a', '.ogg', '.webm', '.srt', '.lrc', '.txt'
]

const SUPPORTED_TYPES = SUPPORTED_EXTENSIONS.join(',')
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_FILES = 10

interface FileWithPreview extends File {
  id: string
  error?: string
  preview?: string
}

interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  accept?: string
  className?: string
}

export function FileUpload({
  onFilesSelected,
  multiple = true,
  maxFiles = MAX_FILES,
  maxSize = MAX_FILE_SIZE,
  accept = SUPPORTED_TYPES,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [, setDragCounter] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [globalError, setGlobalError] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useFileUpload()

  // File type detection and styling
  const getFileType = (file: File): 'audio' | 'video' | 'subtitle' | 'unknown' => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension) return 'unknown'
    
    const audioTypes = ['mp3', 'wav', 'flac', 'm4a', 'ogg']
    const videoTypes = ['mp4', 'avi', 'mkv', 'webm']
    const subtitleTypes = ['srt', 'lrc', 'txt']
    
    if (audioTypes.includes(extension)) return 'audio'
    if (videoTypes.includes(extension)) return 'video'
    if (subtitleTypes.includes(extension)) return 'subtitle'
    return 'unknown'
  }

  const getFileIcon = (file: File) => {
    const type = getFileType(file)
    const iconProps = { className: "h-5 w-5" }
    
    switch (type) {
      case 'audio': return <FileAudio {...iconProps} />
      case 'video': return <Play {...iconProps} />
      case 'subtitle': return <FileText {...iconProps} />
      default: return <FileText {...iconProps} />
    }
  }

  const getFileTypeColor = (file: File) => {
    if ((file as FileWithPreview).error) return 'bg-gradient-error'
    
    const type = getFileType(file)
    switch (type) {
      case 'audio': return 'bg-gradient-brand'
      case 'video': return 'bg-gradient-to-br from-brand-500 to-brand-700'
      case 'subtitle': return 'bg-gradient-success'
      default: return 'bg-gradient-to-br from-neutral-400 to-neutral-600'
    }
  }

  // File size formatting
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${formatFileSize(maxSize)} limit`
      }
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    const acceptedTypes = accept.split(',').map(type => type.trim().toLowerCase())
    
    if (!acceptedTypes.includes(extension)) {
      return {
        valid: false,
        error: 'File type not supported'
      }
    }

    return { valid: true }
  }

  // Process files after selection or drop
  const processFiles = useCallback((newFiles: FileList | File[]) => {
    setGlobalError('')
    
    const fileArray = Array.from(newFiles)
    
    // Check file count limits
    if (!multiple && fileArray.length > 1) {
      setGlobalError('Only one file can be selected at a time.')
      return
    }

    if (files.length + fileArray.length > maxFiles) {
      setGlobalError(`Maximum ${maxFiles} files allowed. You're trying to add ${fileArray.length} more to ${files.length} existing files.`)
      return
    }

    // Process and validate each file
    const processedFiles: FileWithPreview[] = fileArray.map(file => {
      const validation = validateFile(file)
      return {
        ...file,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        error: validation.valid ? undefined : validation.error
      }
    })

    setFiles(prev => [...prev, ...processedFiles])
    
    // Notify parent component of valid files
    if (onFilesSelected) {
      const validFiles = [...files, ...processedFiles].filter(f => !f.error)
      onFilesSelected(validFiles)
    }
  }, [files, multiple, maxFiles, maxSize, accept, onFilesSelected])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => {
      const newCount = prev - 1
      if (newCount === 0) {
        setDragActive(false)
      }
      return newCount
    })
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setDragCounter(0)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
  }, [processFiles])

  // File input handler
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles)
    }
    // Clear input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFiles])

  // File management
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId)
      if (onFilesSelected) {
        const validFiles = newFiles.filter(f => !f.error)
        onFilesSelected(validFiles)
      }
      return newFiles
    })
    setGlobalError('')
  }, [onFilesSelected])

  const clearAllFiles = useCallback(() => {
    setFiles([])
    setGlobalError('')
    setUploadComplete(false)
    setUploadProgress(0)
    if (onFilesSelected) {
      onFilesSelected([])
    }
  }, [onFilesSelected])

  // Upload handling
  const handleUpload = useCallback(async () => {
    const validFiles = files.filter(f => !f.error)
    if (validFiles.length === 0) {
      setGlobalError('No valid files to upload')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      await uploadMutation.mutateAsync(validFiles, {
        onSuccess: () => {
          setUploadComplete(true)
          setUploading(false)
          toast.success(`Successfully uploaded ${validFiles.length} file(s)`)
        },
        onError: (error: any) => {
          setUploading(false)
          setGlobalError(error.message || 'Upload failed')
          toast.error('Upload failed')
        }
      })
    } catch (error: any) {
      setUploading(false)
      setGlobalError(error.message || 'Upload failed')
      toast.error('Upload failed')
    }
  }, [files, uploadMutation])

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const getTotalSize = () => {
    return files.reduce((total, file) => total + file.size, 0)
  }

  const validFilesCount = files.filter(f => !f.error).length

  return (
    <div className={cn("space-y-6", className)}>
      {/* Premium Upload Area */}
      <Card className="relative group overflow-hidden border-0 bg-surface-elevated shadow-apple-lg hover:shadow-apple-xl transition-shadow-apple">
        <CardContent 
          className={cn(
            "p-10 border-2 border-dashed rounded-2xl transition-apple cursor-pointer min-h-[240px] flex items-center justify-center relative",
            "before:absolute before:inset-0 before:rounded-2xl before:transition-apple",
            dragActive && [
              "border-brand-400 bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900",
              "before:bg-gradient-to-br before:from-brand-100/50 before:to-brand-200/50 dark:before:from-brand-900/50 dark:before:to-brand-800/50",
              "shadow-brand-200/25 shadow-2xl"
            ],
            !dragActive && !globalError && [
              "border-border-secondary hover:border-brand-300",
              "bg-gradient-to-br from-surface-primary to-surface-secondary",
              "hover:bg-gradient-to-br hover:from-brand-50/30 hover:to-brand-100/30",
              "dark:hover:from-brand-950/30 dark:hover:to-brand-900/30",
              "before:opacity-0 hover:before:opacity-100",
              "hover:before:bg-gradient-to-br hover:before:from-brand-100/20 hover:before:to-brand-200/20",
              "dark:hover:before:from-brand-900/20 dark:hover:before:to-brand-800/20"
            ],
            globalError && [
              "border-error-400 bg-gradient-to-br from-error-50 to-error-100 dark:from-error-950 dark:to-error-900",
              "before:bg-gradient-to-br before:from-error-100/50 before:to-error-200/50 dark:before:from-error-900/50 dark:before:to-error-800/50"
            ],
            uploadComplete && [
              "border-success-400 bg-gradient-to-br from-success-50 to-success-100 dark:from-success-950 dark:to-success-900",
              "before:bg-gradient-to-br before:from-success-100/50 before:to-success-200/50 dark:before:from-success-900/50 dark:before:to-success-800/50"
            ]
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          role="button"
          tabIndex={0}
          aria-label={dragActive ? 'Drop files to upload' : 'Click or drag files to upload'}
        >
          {/* Premium Upload States */}
          {!uploading && !uploadComplete && (
            <div className="text-center relative z-10">
              <div className={cn(
                "w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-apple shadow-apple-md",
                "backdrop-blur-sm border border-white/20",
                dragActive && [
                  "bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900",
                  "shadow-brand-200/50 shadow-xl scale-110"
                ],
                !dragActive && !globalError && [
                  "bg-gradient-to-br from-surface-secondary to-surface-tertiary",
                  "hover:from-brand-100/50 hover:to-brand-200/50",
                  "dark:hover:from-brand-800/50 dark:hover:to-brand-900/50",
                  "group-hover:scale-105"
                ],
                globalError && [
                  "bg-gradient-to-br from-error-100 to-error-200 dark:from-error-800 dark:to-error-900",
                  "shadow-error-200/50 shadow-xl"
                ]
              )}>
                <Upload className={cn(
                  "w-9 h-9 transition-apple",
                  dragActive && "text-brand-600 dark:text-brand-400 scale-110",
                  !dragActive && !globalError && "text-text-tertiary group-hover:text-brand-600 dark:group-hover:text-brand-400",
                  globalError && "text-error-600 dark:text-error-400"
                )} />
              </div>
              
              <div className="space-y-3 mb-6">
                <h3 className={cn(
                  "text-heading-md transition-apple",
                  dragActive && "text-brand-700 dark:text-brand-300",
                  !dragActive && !globalError && "text-text-primary",
                  globalError && "text-error-700 dark:text-error-300"
                )}>
                  {dragActive ? "Release to upload files" :
                   globalError ? "Please check your files and try again" :
                   "Drop files here or click to browse"}
                </h3>
                
                <p className={cn(
                  "text-body text-text-secondary max-w-md mx-auto leading-relaxed",
                  dragActive && "text-brand-600 dark:text-brand-400",
                  globalError && "text-error-600 dark:text-error-400"
                )}>
                  {!globalError && (
                    <>
                      Supports audio, video, and subtitle files<br />
                      <span className="text-body-sm text-text-tertiary">
                        Maximum {maxFiles} files • {formatFileSize(maxSize)} each
                      </span>
                    </>
                  )}
                  {globalError && globalError}
                </p>
              </div>
              
              <Button 
                size="lg"
                className={cn(
                  "px-8 py-3 rounded-xl font-semibold shadow-apple-md hover:shadow-apple-lg transition-shadow-apple",
                  dragActive && "bg-gradient-brand hover:opacity-90",
                  !dragActive && !globalError && "bg-surface-secondary hover:bg-surface-tertiary border border-border-primary",
                  globalError && "bg-gradient-error hover:opacity-90"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  triggerFileSelect()
                }}
              >
                <Upload className="w-5 h-5 mr-3" />
                Browse Files
              </Button>
            </div>
          )}

          {/* Premium Uploading State */}
          {uploading && (
            <div className="text-center relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 flex items-center justify-center shadow-apple-lg shadow-brand-200/50 backdrop-blur-sm border border-white/20">
                <Loader2 className="w-9 h-9 text-brand-600 dark:text-brand-400 animate-spin" />
              </div>
              
              <div className="space-y-4 mb-6">
                <h3 className="text-heading-md text-brand-700 dark:text-brand-300">
                  Uploading files...
                </h3>
                
                <div className="max-w-xs mx-auto space-y-3">
                  <Progress 
                    value={uploadProgress} 
                    className="h-2 bg-surface-tertiary shadow-inner rounded-full"
                  />
                  <p className="text-body-sm text-brand-600 dark:text-brand-400 font-medium">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Premium Upload Complete State */}
          {uploadComplete && (
            <div className="text-center relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-900 flex items-center justify-center shadow-apple-lg shadow-success-200/50 backdrop-blur-sm border border-white/20 animate-in zoom-in-50 duration-500">
                <CheckCircle2 className="w-9 h-9 text-success-600 dark:text-success-400" />
              </div>
              
              <div className="space-y-3 mb-6">
                <h3 className="text-heading-md text-success-700 dark:text-success-300">
                  Upload complete!
                </h3>
                <p className="text-body text-success-600 dark:text-success-400">
                  {validFilesCount} file{validFilesCount !== 1 ? 's' : ''} uploaded successfully
                </p>
              </div>
              
              <Button 
                size="lg"
                className="px-8 py-3 rounded-xl font-semibold bg-surface-secondary hover:bg-surface-tertiary border border-border-primary shadow-apple-md hover:shadow-apple-lg transition-shadow-apple"
                onClick={clearAllFiles}
              >
                Upload More Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={accept}
        multiple={multiple}
        className="hidden"
        aria-label={`Select ${multiple ? 'files' : 'file'} to upload`}
      />

      {/* Premium File Preview Area */}
      {files.length > 0 && !uploading && (
        <Card className="border-0 bg-surface-elevated shadow-apple-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h4 className="text-heading-sm text-text-primary">
                  Selected Files
                </h4>
                <p className="text-body-sm text-text-tertiary">
                  {files.length} file{files.length !== 1 ? 's' : ''} • {formatFileSize(getTotalSize())} total
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFiles}
                className="rounded-xl hover:bg-surface-tertiary text-text-secondary hover:text-text-primary transition-colors-apple"
              >
                Clear All
              </Button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className={cn(
                    "group flex items-center justify-between p-4 rounded-xl border transition-apple shadow-sm hover:shadow-apple-md",
                    file.error 
                      ? "bg-gradient-to-r from-error-50 to-error-100 border-error-200 dark:from-error-950 dark:to-error-900 dark:border-error-800" 
                      : "bg-gradient-to-r from-surface-primary to-surface-secondary border-border-primary hover:from-surface-secondary hover:to-surface-tertiary"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center mr-4 text-white shadow-apple-sm",
                      getFileTypeColor(file)
                    )}>
                      {getFileIcon(file)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-text-primary truncate mb-1">
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-3 text-body-sm text-text-tertiary">
                        <span className="font-medium">{formatFileSize(file.size)}</span>
                        <span className="w-1 h-1 rounded-full bg-text-tertiary"></span>
                        <span className="capitalize">{getFileType(file)}</span>
                      </div>
                      {file.error && (
                        <p className="text-body-sm text-error-600 dark:text-error-400 mt-2 font-medium">
                          {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-error-100 dark:hover:bg-error-900 text-text-tertiary hover:text-error-600 dark:hover:text-error-400 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Premium File Stats */}
            <div className="mt-6 p-4 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900 rounded-xl border border-brand-200 dark:border-brand-800">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-body-sm font-medium text-brand-700 dark:text-brand-300">
                    Ready for Processing
                  </p>
                  <p className="text-body-sm text-brand-600 dark:text-brand-400">
                    {validFilesCount} valid file{validFilesCount !== 1 ? 's' : ''} of {files.length} selected
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-heading-sm font-semibold text-brand-700 dark:text-brand-300">
                    {formatFileSize(getTotalSize())}
                  </p>
                  <p className="text-body-sm text-brand-600 dark:text-brand-400">
                    Total size
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Upload Button */}
            {validFilesCount > 0 && !uploadComplete && (
              <div className="mt-6">
                <Button 
                  size="lg"
                  onClick={handleUpload} 
                  disabled={uploading || validFilesCount === 0}
                  className="w-full px-6 py-4 rounded-xl font-semibold bg-gradient-brand hover:opacity-90 shadow-apple-md hover:shadow-apple-lg transition-shadow-apple"
                >
                  {uploading ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Upload className="w-5 h-5 mr-3" />
                      Upload {validFilesCount} File{validFilesCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Premium Error Messages */}
      {globalError && (
        <Card className="border-0 bg-gradient-to-r from-error-50 to-error-100 dark:from-error-950 dark:to-error-900 shadow-apple-lg">
          <CardContent className="p-4">
            <Alert className="border-0 bg-transparent">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-error flex items-center justify-center shadow-apple-sm">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <AlertDescription className="text-body text-error-700 dark:text-error-300 font-medium">
                    {globalError}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}