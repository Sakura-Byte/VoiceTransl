import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/utils'
import { FileUpload } from './FileUpload'

// Mock the file upload hook
const mockUploadMutation = {
  mutate: vi.fn(),
  isLoading: false,
  error: null,
  data: null,
}

vi.mock('@/hooks/api', () => ({
  useFileUpload: () => mockUploadMutation,
}))

describe('FileUpload', () => {
  const mockOnFilesSelected = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    onFilesSelected: mockOnFilesSelected,
    multiple: true,
    maxFiles: 10,
    maxSize: 100 * 1024 * 1024, // 100MB
  }

  describe('Rendering', () => {
    it('renders the upload area', () => {
      render(<FileUpload {...defaultProps} />)
      
      // Check if the component renders without crashing
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
      expect(screen.getByText(/Browse Files/)).toBeInTheDocument()
    })

    it('renders single file mode correctly', () => {
      render(<FileUpload {...defaultProps} multiple={false} />)
      
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <FileUpload {...defaultProps} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('File Input', () => {
    it('has proper file input attributes', () => {
      render(<FileUpload {...defaultProps} />)
      
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('multiple')
    })

    it('respects single file mode', () => {
      render(<FileUpload {...defaultProps} multiple={false} />)
      
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
      expect(input).not.toHaveAttribute('multiple')
    })

    it('has correct accept attribute', () => {
      render(<FileUpload {...defaultProps} accept=".mp3,.wav" />)
      
      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('accept', '.mp3,.wav')
    })
  })

  describe('Props Handling', () => {
    it('handles maxFiles prop', () => {
      render(<FileUpload {...defaultProps} maxFiles={5} />)
      
      // Component should render without error
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
    })

    it('handles maxSize prop', () => {
      render(<FileUpload {...defaultProps} maxSize={50 * 1024 * 1024} />)
      
      // Component should render without error
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
    })

    it('handles onFilesSelected callback', () => {
      const customCallback = vi.fn()
      render(<FileUpload {...defaultProps} onFilesSelected={customCallback} />)
      
      // Component should render without error
      expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible file input', () => {
      render(<FileUpload {...defaultProps} />)
      
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'file')
    })

    it('maintains keyboard accessibility', () => {
      render(<FileUpload {...defaultProps} />)
      
      const uploadArea = screen.getByLabelText(/click or drag files to upload/i)
      expect(uploadArea).toBeInTheDocument()
      expect(uploadArea).toHaveAttribute('tabIndex')
    })
  })
})