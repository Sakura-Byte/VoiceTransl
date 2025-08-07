import React from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn, SubmitHandler, DefaultValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, RotateCcw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface FormProps<T extends Record<string, any> = Record<string, any>> {
  schema: z.ZodSchema<T>
  onSubmit: SubmitHandler<T>
  defaultValues?: DefaultValues<T>
  title?: string
  description?: string
  children: (form: UseFormReturn<T>) => React.ReactNode
  className?: string
  loading?: boolean
  error?: string | null
  saveButtonText?: string
  resetButtonText?: string
  showResetButton?: boolean
  showCard?: boolean
  cardClassName?: string
}

export function Form<T extends Record<string, any> = Record<string, any>>({
  schema,
  onSubmit,
  defaultValues,
  title,
  description,
  children,
  className,
  loading = false,
  error = null,
  saveButtonText = 'Save Changes',
  resetButtonText = 'Reset',
  showResetButton = true,
  showCard = true,
  cardClassName,
}: FormProps<T>) {
  const form = useForm({
    // @ts-ignore - zodResolver type issues with generic constraints
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  }) as UseFormReturn<T>

  const { handleSubmit, reset, formState: { isDirty, isValid, errors } } = form

  const onSubmitWrapper: SubmitHandler<T> = async (data) => {
    try {
      await onSubmit(data)
      toast.success('Settings saved successfully')
    } catch (error: any) {
      toast.error(`Failed to save settings: ${error.message}`)
    }
  }

  const handleReset = () => {
    reset(defaultValues)
    toast.info('Form reset to default values')
  }

  const hasErrors = Object.keys(errors).length > 0

  const formContent = (
    <form onSubmit={handleSubmit(onSubmitWrapper)} className={cn('space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {children(form)}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2">
          {showResetButton && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading || !isDirty}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {resetButtonText}
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Form Status Indicators */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {isDirty && !hasErrors && (
              <span className="text-blue-600 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Unsaved changes
              </span>
            )}
            {hasErrors && (
              <span className="text-red-600 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''}
              </span>
            )}
            {!isDirty && !hasErrors && (
              <span className="text-green-600 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Saved
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !isDirty || !isValid}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'Saving...' : saveButtonText}
          </Button>
        </div>
      </div>
    </form>
  )

  if (!showCard) {
    return formContent
  }

  return (
    <Card className={cardClassName}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}

// Utility hook for form state management
export function useFormWithToast<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  defaultValues?: DefaultValues<T>
) {
  const form = useForm({
    // @ts-ignore - zodResolver type issues with generic constraints
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  }) as UseFormReturn<T>

  const submitWithToast = (onSubmit: SubmitHandler<T>) => {
    return form.handleSubmit(async (data: T) => {
      try {
        await onSubmit(data)
        toast.success('Settings saved successfully')
      } catch (error: any) {
        toast.error(`Failed to save settings: ${error.message}`)
        throw error
      }
    })
  }

  return {
    ...form,
    submitWithToast,
  }
}