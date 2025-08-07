import { z } from 'zod'
import type { UseFormReturn, FieldValues } from 'react-hook-form'

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  url: z.string().url('Invalid URL format'),
  port: z.number().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonEmptyString: z.string().min(1, 'This field is required'),
  optionalString: z.string().optional(),
  boolean: z.boolean(),
}

// Server configuration schema
export const serverConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: commonSchemas.port,
  maxConcurrentTasks: commonSchemas.positiveNumber.optional(),
  requestTimeout: commonSchemas.positiveNumber.optional(),
  enableCors: commonSchemas.boolean,
  logLevel: z.enum(['debug', 'info', 'warning', 'error']),
  autoRestart: commonSchemas.boolean,
})

// Transcription settings schema
export const transcriptionConfigSchema = z.object({
  backend: z.enum(['whisper', 'anime_whisper', 'hybrid']),
  model: z.string().min(1, 'Model is required'),
  language: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  beamSize: commonSchemas.positiveNumber.optional(),
  wordTimestamps: commonSchemas.boolean,
  initialPrompt: commonSchemas.optionalString,
})

// Translation settings schema
export const translationConfigSchema = z.object({
  translator: z.string().min(1, 'Translator is required'),
  sourceLanguage: z.string().min(1, 'Source language is required'),
  targetLanguage: z.string().min(1, 'Target language is required'),
  apiKey: commonSchemas.optionalString,
  endpoint: commonSchemas.optionalString,
  model: commonSchemas.optionalString,
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: commonSchemas.positiveNumber.optional(),
  systemPrompt: commonSchemas.optionalString,
})

// File upload schema
export const fileUploadSchema = z.object({
  files: z.array(z.instanceof(File)).min(1, 'At least one file is required'),
  transcriptionSettings: transcriptionConfigSchema.partial(),
  translationSettings: translationConfigSchema.partial(),
  outputFormat: z.enum(['srt', 'lrc', 'txt', 'json']),
  outputPath: commonSchemas.optionalString,
})

// Type exports
export type ServerConfig = z.infer<typeof serverConfigSchema>
export type TranscriptionConfig = z.infer<typeof transcriptionConfigSchema>
export type TranslationConfig = z.infer<typeof translationConfigSchema>
export type FileUploadConfig = z.infer<typeof fileUploadSchema>

// Form utility functions
export const getFieldError = (form: UseFormReturn<FieldValues>, fieldName: string): string | undefined => {
  return form.formState.errors[fieldName]?.message as string | undefined
}

export const isFieldDirty = (form: UseFormReturn<FieldValues>, fieldName: string): boolean => {
  return form.formState.dirtyFields[fieldName] ?? false
}

export const hasFormErrors = (form: UseFormReturn<FieldValues>): boolean => {
  return Object.keys(form.formState.errors).length > 0
}

export const getFormData = <T extends FieldValues>(form: UseFormReturn<T>): T => {
  return form.getValues()
}

// Default values
export const defaultServerConfig: Partial<ServerConfig> = {
  host: 'localhost',
  port: 8080,
  maxConcurrentTasks: 4,
  requestTimeout: 300,
  enableCors: true,
  logLevel: 'info',
  autoRestart: false,
}

export const defaultTranscriptionConfig: Partial<TranscriptionConfig> = {
  backend: 'hybrid',
  model: 'whisper-large-v3',
  temperature: 0.0,
  beamSize: 5,
  wordTimestamps: true,
  initialPrompt: '',
}

export const defaultTranslationConfig: Partial<TranslationConfig> = {
  translator: 'openai',
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  temperature: 0.1,
  maxTokens: 2000,
  systemPrompt: 'You are a professional translator. Translate the following text accurately while preserving the original meaning and tone.',
}