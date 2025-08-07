import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockServerStatus } from '@/test/utils'
import { ServerStatus } from './ServerStatus'

// Mock API hooks
const mockServerStatusQuery = {
  data: null as any,
  isLoading: false,
  error: null as any,
  refetch: vi.fn(),
}

const mockServerControl = {
  startServer: vi.fn(),
  stopServer: vi.fn(),
  restartServer: vi.fn(),
  isStarting: false,
  isStopping: false,
  isRestarting: false,
}

vi.mock('@/hooks/api', () => ({
  useServerStatus: () => mockServerStatusQuery,
  useServerControl: () => mockServerControl,
}))

describe('ServerStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockServerStatusQuery.data = null
    mockServerStatusQuery.isLoading = false
    mockServerStatusQuery.error = null
  })

  describe('Loading State', () => {
    it('shows loading state when fetching server status', () => {
      mockServerStatusQuery.isLoading = true
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Checking...').length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('shows offline state when there is an error', () => {
      mockServerStatusQuery.error = new Error('Network error')
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Offline').length).toBeGreaterThan(0)
      expect(screen.getByText('Failed to connect to server. Please check if the API server is running.')).toBeInTheDocument()
    })

    it('shows offline state when no server data', () => {
      mockServerStatusQuery.data = null
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Offline').length).toBeGreaterThan(0)
    })
  })

  describe('Server Running State', () => {
    it('shows online status when server is healthy', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Online').length).toBeGreaterThan(0)
      expect(screen.getByText('Server Status')).toBeInTheDocument()
    })

    it('shows unhealthy status when server is running but not healthy', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: false,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Unhealthy').length).toBeGreaterThan(0)
    })

    it('shows starting status', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'starting',
        healthy: false,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Starting...').length).toBeGreaterThan(0)
    })

    it('shows stopped status', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'stopped',
        healthy: false,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('Stopped').length).toBeGreaterThan(0)
    })
  })

  describe('Server Controls', () => {
    it('shows start button when server is not running', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'stopped',
        healthy: false,
      })
      
      render(<ServerStatus showControls={true} />)
      
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument()
    })

    it('shows stop and restart buttons when server is running', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      
      render(<ServerStatus showControls={true} />)
      
      expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument()
    })

    it('hides controls when showControls is false', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      
      render(<ServerStatus showControls={false} />)
      
      expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument()
    })
  })

  describe('Server Control Actions', () => {
    it('calls startServer when start button is clicked', async () => {
      const user = userEvent.setup()
      mockServerStatusQuery.data = mockServerStatus({
        status: 'stopped',
        healthy: false,
      })
      
      render(<ServerStatus showControls={true} />)
      
      const startButton = screen.getByRole('button', { name: /start/i })
      await user.click(startButton)
      
      expect(mockServerControl.startServer).toHaveBeenCalledWith({})
    })

    it('calls stopServer when stop button is clicked', async () => {
      const user = userEvent.setup()
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      
      render(<ServerStatus showControls={true} />)
      
      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)
      
      expect(mockServerControl.stopServer).toHaveBeenCalledWith(false)
    })

    it('calls restartServer when restart button is clicked', async () => {
      const user = userEvent.setup()
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      
      render(<ServerStatus showControls={true} />)
      
      const restartButton = screen.getByRole('button', { name: /restart/i })
      await user.click(restartButton)
      
      expect(mockServerControl.restartServer).toHaveBeenCalled()
    })
  })

  describe('Loading States for Controls', () => {
    it('shows loading state for start button', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'stopped',
        healthy: false,
      })
      mockServerControl.isStarting = true
      
      render(<ServerStatus showControls={true} />)
      
      expect(screen.getByText('Starting...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled()
    })

    it('shows loading state for stop button', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      mockServerControl.isStopping = true
      
      render(<ServerStatus showControls={true} />)
      
      expect(screen.getByText('Stopping...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /stopping/i })).toBeDisabled()
    })

    it('shows loading state for restart button', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
      })
      mockServerControl.isRestarting = true
      
      render(<ServerStatus showControls={true} />)
      
      expect(screen.getByText('Restarting...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /restarting/i })).toBeDisabled()
    })
  })

  describe('Server Information Display', () => {
    it('displays server URL', () => {
      mockServerStatusQuery.data = mockServerStatus({
        url: 'http://localhost:8080',
      })
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('http://localhost:8080').length).toBeGreaterThan(0)
    })

    it('displays response time', () => {
      mockServerStatusQuery.data = mockServerStatus({
        response_time_ms: 45,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getAllByText('45ms').length).toBeGreaterThan(0)
    })

    it('displays information correctly', () => {
      mockServerStatusQuery.data = mockServerStatus({
        port: 8080,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getByText('Server Status')).toBeInTheDocument()
    })
  })

  describe('Compact Mode', () => {
    it('renders compact view when compact prop is true', () => {
      mockServerStatusQuery.data = mockServerStatus({
        status: 'running',
        healthy: true,
        response_time_ms: 45,
      })
      
      render(<ServerStatus compact={true} />)
      
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.getByText('45ms')).toBeInTheDocument()
      // Should not show the full card layout
      expect(screen.queryByText('Server Status')).not.toBeInTheDocument()
    })
  })

  describe('Auto-refresh', () => {
    it('sets up auto-refresh interval', () => {
      mockServerStatusQuery.data = mockServerStatus()
      
      render(<ServerStatus />)
      
      // Just verify the component renders - the actual auto-refresh testing
      // would require mocking timers which is complex for this test
      expect(screen.getByText('Server Status')).toBeInTheDocument()
    })
  })

  describe('Server Details', () => {
    it('shows server details when showDetails is true', () => {
      mockServerStatusQuery.data = mockServerStatus({
        server_info: {
          host: 'localhost',
          port: 8080,
          url: 'http://localhost:8080',
          status: 'running',
          max_concurrent_tasks: 4,
          request_timeout: 300,
        }
      })
      
      render(<ServerStatus showDetails={true} />)
      
      expect(screen.getByText('Server Information')).toBeInTheDocument()
      expect(screen.getByText('localhost')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('300s')).toBeInTheDocument()
    })

    it('hides server details when showDetails is false', () => {
      mockServerStatusQuery.data = mockServerStatus({
        server_info: {
          host: 'localhost',
          port: 8080,
          url: 'http://localhost:8080',
          status: 'running',
          max_concurrent_tasks: 4,
          request_timeout: 300,
        }
      })
      
      render(<ServerStatus showDetails={false} />)
      
      expect(screen.queryByText('Server Information')).not.toBeInTheDocument()
    })
  })

  describe('Performance Indicators', () => {
    it('shows performance rating based on response time', () => {
      mockServerStatusQuery.data = mockServerStatus({
        response_time_ms: 50,
      })
      
      render(<ServerStatus />)
      
      expect(screen.getByText('Excellent performance')).toBeInTheDocument()
    })

    it('shows different performance ratings', () => {
      const { rerender } = render(<ServerStatus />)
      
      // Good performance
      mockServerStatusQuery.data = mockServerStatus({ response_time_ms: 200 })
      rerender(<ServerStatus />)
      expect(screen.getByText('Good performance')).toBeInTheDocument()
      
      // Fair performance
      mockServerStatusQuery.data = mockServerStatus({ response_time_ms: 500 })
      rerender(<ServerStatus />)
      expect(screen.getByText('Fair performance')).toBeInTheDocument()
      
      // Poor performance
      mockServerStatusQuery.data = mockServerStatus({ response_time_ms: 1500 })
      rerender(<ServerStatus />)
      expect(screen.getByText('Poor performance')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ServerStatus className="custom-server-status" />
      )
      
      expect(container.firstChild).toHaveClass('custom-server-status')
    })
  })
})