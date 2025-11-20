import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;

  const plugins = [
    react(),
  ];

  // Add Sentry plugin for source maps upload (production only)
  if (isProduction && sentryAuthToken && sentryOrg && sentryProject) {
    plugins.push(
      sentryVitePlugin({
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
        // Upload source maps to Sentry
        sourcemaps: {
          assets: './dist/**',
          ignore: ['node_modules'],
          filesToDeleteAfterUpload: './dist/**/*.map',
        },
        // Don't fail build if Sentry upload fails
        errorHandler: (err, invokeErr, compilation) => {
          console.warn('[Sentry] Failed to upload source maps:', err);
        },
      })
    );
  }

  // Add bundle analyzer (only when ANALYZE env var is set)
  if (process.env.ANALYZE === 'true') {
    plugins.push(
      visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: ['react', 'react-dom'],
    },
    build: {
      // Generate source maps for production (will be uploaded to Sentry)
      sourcemap: isProduction ? 'hidden' : false, // 'hidden' = source maps exist but aren't referenced

      // Target modern browsers for smaller bundle
      target: 'esnext',

      // Optimize chunk splitting
      rollupOptions: {
        output: {
          // Ensure proper chunk dependencies
          chunkFileNames: (_chunkInfo) => {
            return isProduction
              ? 'assets/js/[name]-[hash].js'
              : 'assets/js/[name].js';
          },
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (id.includes('node_modules')) {
              // React ecosystem - must be first to ensure React is available
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('@tanstack/react-query') ||
                id.includes('@tanstack/react-table') ||
                id.includes('zustand')
              ) {
                return 'react-vendor';
              }
              // UI libraries (may depend on React)
              if (id.includes('lucide-react') || id.includes('sonner')) {
                return 'react-vendor'; // Put in react-vendor to ensure React is available
              }
              // Charts (may depend on React)
              if (id.includes('recharts')) {
                return 'react-vendor'; // Put in react-vendor to ensure React is available
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // Sentry
              if (id.includes('@sentry')) {
                return 'sentry-vendor';
              }
              // Everything else - put in react-vendor to ensure React is available
              // This prevents issues where vendor code tries to access React before it's loaded
              return 'react-vendor';
            }
          },
          entryFileNames: isProduction
            ? 'assets/js/[name]-[hash].js'
            : 'assets/js/[name].js',
          assetFileNames: isProduction
            ? 'assets/[ext]/[name]-[hash].[ext]'
            : 'assets/[ext]/[name].[ext]',
        },
      },

      // Minify with terser for better compression
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true, // Remove console.log in production
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
          passes: 2, // Multiple passes for better optimization
        },
        format: {
          comments: false, // Remove comments
        },
      } : undefined,

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // Warn if chunk exceeds 1MB

      // CSS code splitting
      cssCodeSplit: true,

      // Report compressed size
      reportCompressedSize: true,
    },
    // Note: API calls go through Supabase Edge Functions
    // No proxy needed - Edge Functions are accessed directly via Supabase URL
  };
});
