import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { render } from '@/test/utils'
import { Form } from './Form'

// Test schema
const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be at least 18'),
  terms: z.boolean().refine(val => val === true, 'Must accept terms'),
})

type TestFormData = z.infer<typeof testSchema>

describe('Form', () => {
  const mockOnSubmit = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    schema: testSchema,
    onSubmit: mockOnSubmit,
    defaultValues: {
      name: '',
      email: '',
      age: 18,
      terms: false,
    } as TestFormData,
  }

  describe('Rendering', () => {
    it('renders form with title and description', () => {
      render(
        <Form
          {...defaultProps}
          title="Test Form"
          description="This is a test form"
        >
          {(form) => (
            <div>
              <input {...form.register('name')} placeholder="Name" />
              <input {...form.register('email')} placeholder="Email" />
            </div>
          )}
        </Form>
      )
      
      expect(screen.getByText('Test Form')).toBeInTheDocument()
      expect(screen.getByText('This is a test form')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    })

    it('renders without card when showCard is false', () => {
      render(
        <Form
          {...defaultProps}
          title="Test Form"
          showCard={false}
        >
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      // Title should not be rendered without card
      expect(screen.queryByText('Test Form')).not.toBeInTheDocument()
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <Form
          {...defaultProps}
          className="custom-form"
        >
          {() => <div>Form content</div>}
        </Form>
      )
      
      const formElement = container.querySelector('form')
      expect(formElement).toHaveClass('custom-form')
    })
  })

  describe('Form Controls', () => {
    it('shows save and reset buttons', () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('hides reset button when showResetButton is false', () => {
      render(
        <Form {...defaultProps} showResetButton={false}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })

    it('uses custom button text', () => {
      render(
        <Form
          {...defaultProps}
          saveButtonText="Update"
          resetButtonText="Clear"
        >
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })
  })

  describe('Form State', () => {
    it('shows unsaved changes indicator when form is dirty', async () => {
      const user = userEvent.setup()
      
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      const nameInput = screen.getByPlaceholderText('Name')
      await user.type(nameInput, 'John Doe')
      
      await waitFor(() => {
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      })
    })

    it('disables save button when form is not dirty', () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
    })

    it('disables reset button when form is not dirty', () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      const resetButton = screen.getByRole('button', { name: /reset/i })
      expect(resetButton).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('renders form inputs correctly', async () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <div>
              <input {...form.register('name')} placeholder="Name" />
              <input {...form.register('email')} placeholder="Email" />
            </div>
          )}
        </Form>
      )
      
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    })

    it('initially disables save button when form is not dirty', () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('email')} placeholder="Email" />
          )}
        </Form>
      )
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('has a submit button', () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('shows loading state when loading prop is true', () => {
      render(
        <Form {...defaultProps} loading={true}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  describe('Form Reset', () => {
    it('has a reset button', () => {
      render(
        <Form {...defaultProps}>
          {(form) => (
            <input {...form.register('name')} placeholder="Name" />
          )}
        </Form>
      )
      
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('shows error alert when error prop is provided', () => {
      render(
        <Form {...defaultProps} error="Something went wrong">
          {() => <div>Form content</div>}
        </Form>
      )
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('does not show error alert when error is null', () => {
      render(
        <Form {...defaultProps} error={null}>
          {() => <div>Form content</div>}
        </Form>
      )
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

})