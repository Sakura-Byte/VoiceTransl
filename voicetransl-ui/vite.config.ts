import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import compression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const isDevelopment = command === 'serve'
  
  return {
    plugins: [
      react({
        // JSX runtime optimization for production
        jsxRuntime: 'automatic'
      }),
      tailwindcss(),
      
      // Compression plugin for production
      ...(isProduction ? [
        compression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024,
        }),
        compression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024,
        })
      ] : []),
      
      // Bundle analyzer for build analysis
      ...(env.ANALYZE ? [
        visualizer({
          filename: 'dist/bundle-analysis.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ] : [])
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    // Environment variables
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || 'http://localhost:8000'),
    },
    
    build: {
      // Generate sourcemaps only in development or when explicitly enabled
      sourcemap: isDevelopment || env.VITE_SOURCEMAP === 'true',
      
      // Production optimizations
      minify: isProduction ? 'esbuild' : false,
      cssMinify: isProduction,
      
      // Report compressed file sizes
      reportCompressedSize: true,
      
      // Optimize chunks
      rollupOptions: {
        output: {
          // Dynamic chunk naming for better caching
          chunkFileNames: (chunkInfo) => {
            const name = chunkInfo.name
            if (name?.endsWith('-vendor')) {
              return 'vendor/[name].[hash].js'
            }
            return 'chunks/[name].[hash].js'
          },
          entryFileNames: 'entry/[name].[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || ''
            if (name.endsWith('.css')) {
              return 'styles/[name].[hash][extname]'
            }
            if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(name)) {
              return 'images/[name].[hash][extname]'
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/i.test(name)) {
              return 'fonts/[name].[hash][extname]'
            }
            return 'assets/[name].[hash][extname]'
          },
          
          manualChunks: {
            // React ecosystem - heavy and stable
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // UI components and styling - large but stable
            'ui-vendor': [
              '@radix-ui/react-avatar',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-progress',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tooltip',
              'lucide-react',
              'next-themes',
            ],
            
            // Form and validation - medium size, stable
            'form-vendor': [
              'react-hook-form',
              '@hookform/resolvers',
              'zod',
            ],
            
            // Data fetching and state management - critical for app
            'data-vendor': [
              '@tanstack/react-query',
              'axios',
              'zustand',
            ],
            
            // Utilities - small but frequently used
            'utils-vendor': [
              'clsx',
              'class-variance-authority',
              'tailwind-merge',
              'sonner',
              'react-dropzone',
            ],
          },
        },
        
        // External dependencies that should not be bundled
        external: isProduction ? [] : undefined,
      },
      
      // Optimize build performance
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Adjust chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // Optimize assets
      assetsInlineLimit: 4096, // 4KB inline threshold
    },
    
    // Development server optimization
    server: {
      port: 5175,
      host: true, // Listen on all addresses
      strictPort: true,
      open: true,
      
      // API proxy for development
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url);
            });
          },
        },
      },
      
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..'],
      },
      
      // Hot Module Replacement
      hmr: {
        port: 5176,
      },
    },
    
    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
      strictPort: true,
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'zustand',
        'react-hook-form',
        '@hookform/resolvers',
        'zod',
        'lucide-react',
        'sonner',
        'react-dropzone',
      ],
      // Pre-bundle these dependencies for faster dev startup
      force: isDevelopment,
    },
    
    // CSS configuration
    css: {
      devSourcemap: isDevelopment,
      preprocessorOptions: {
        scss: {
          charset: false,
        },
      },
    },
    
    // JSON configuration
    json: {
      namedExports: true,
      stringify: false,
    },
    
    // Worker configuration
    worker: {
      format: 'es',
    },
  }
})
