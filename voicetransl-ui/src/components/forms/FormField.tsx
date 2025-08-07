import { useController } from 'react-hook-form'
import type { UseControllerProps, FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export interface BaseFieldProps {
  label: string
  description?: string
  className?: string
  required?: boolean
}

export interface FormFieldProps<T extends FieldValues> extends UseControllerProps<T>, BaseFieldProps {
  type?: 'text' | 'email' | 'url' | 'password' | 'number' | 'textarea' | 'select' | 'switch' | 'slider'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
}

export function FormField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  description,
  className,
  required,
  type = 'text',
  placeholder,
  options = [],
  min,
  max,
  step
}: FormFieldProps<T>) {
  const {
    field,
    fieldState: { error, isDirty },
  } = useController({
    name,
    control,
    rules,
  })

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...field}
            placeholder={placeholder}
            className={cn(error && 'border-red-500')}
            rows={3}
          />
        )

      case 'select':
        return (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className={cn(error && 'border-red-500')}>
              <SelectValue placeholder={placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              id={name}
            />
            <Label
              htmlFor={name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </Label>
          </div>
        )

      case 'slider':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{min}</span>
              <span className="text-sm font-medium">{field.value}</span>
              <span className="text-sm text-muted-foreground">{max}</span>
            </div>
            <Slider
              value={[field.value]}
              onValueChange={(values) => field.onChange(values[0])}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
          </div>
        )

      case 'number':
        return (
          <Input
            {...field}
            type="number"
            placeholder={placeholder}
            className={cn(error && 'border-red-500')}
            min={min}
            max={max}
            step={step}
            value={field.value || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : Number(e.target.value)
              field.onChange(value)
            }}
          />
        )

      default:
        return (
          <Input
            {...field}
            type={type}
            placeholder={placeholder}
            className={cn(error && 'border-red-500')}
            value={field.value || ''}
          />
        )
    }
  }

  if (type === 'switch') {
    return (
      <div className={cn('space-y-2', className)}>
        {renderInput()}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {isDirty && <span className="text-blue-500 ml-1">•</span>}
      </Label>
      {renderInput()}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  )
}

// Specialized field components
export function TextField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="text" />
}

export function EmailField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="email" />
}

export function NumberField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="number" />
}

export function TextareaField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="textarea" />
}

export function SelectField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="select" />
}

export function SwitchField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="switch" />
}

export function SliderField<T extends FieldValues>(props: Omit<FormFieldProps<T>, 'type'>) {
  return <FormField {...props} type="slider" />
}