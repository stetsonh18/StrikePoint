import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { validateEnvironmentVariables } from './shared/utils/envValidation';
import { initSentry } from './infrastructure/monitoring/sentry';
import { initPerformanceMonitoring } from './infrastructure/monitoring/performance';
import App from './App.tsx';
import './index.css';

/**
 * Display error message to user
 */
function showError(title: string, message: string, details?: string) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #0f172a;
        color: #f1f5f9;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
      ">
        <div style="
          max-width: 600px;
          background: #1e293b;
          padding: 2rem;
          border-radius: 0.5rem;
          border: 1px solid #334155;
        ">
          <h1 style="color: #ef4444; margin-top: 0;">${title}</h1>
          <p>${message}</p>
          ${details ? `<p style="color: #94a3b8; font-size: 0.875rem; margin-top: 1rem;">${details}</p>` : ''}
        </div>
      </div>
    `;
  } else {
    // Fallback if root doesn't exist
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #0f172a;
        color: #f1f5f9;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
      ">
        <div style="
          max-width: 600px;
          background: #1e293b;
          padding: 2rem;
          border-radius: 0.5rem;
          border: 1px solid #334155;
        ">
          <h1 style="color: #ef4444; margin-top: 0;">${title}</h1>
          <p>${message}</p>
          ${details ? `<p style="color: #94a3b8; font-size: 0.875rem; margin-top: 1rem;">${details}</p>` : ''}
        </div>
      </div>
    `;
  }
}

// Wrap initialization in try-catch to catch any startup errors
try {
  // Validate environment variables at startup
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.valid) {
    // In development, show detailed errors
    if (import.meta.env.DEV) {
      console.error('❌ Environment Variable Validation Failed:');
      envValidation.errors.forEach(error => {
        console.error(`  • ${error}`);
      });
      if (envValidation.warnings.length > 0) {
        console.warn('⚠️ Warnings:');
        envValidation.warnings.forEach(warning => {
          console.warn(`  • ${warning}`);
        });
      }
    }
    
    // In production, show user-friendly error
    if (import.meta.env.PROD) {
      const errorDetails = envValidation.errors.join('; ');
      showError(
        'Configuration Error',
        'The application is missing required configuration. Please contact support.',
        `Error: ${errorDetails}`
      );
      throw new Error('Environment validation failed');
    }
  }

  // Log warnings in development
  if (envValidation.warnings.length > 0 && import.meta.env.DEV) {
    console.warn('⚠️ Environment Variable Warnings:');
    envValidation.warnings.forEach(warning => {
      console.warn(`  • ${warning}`);
    });
  }

  // Check if root element exists
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found. Make sure index.html has a <div id="root"></div> element.');
  }

  // Initialize Sentry before React app
  initSentry();

  // Initialize performance monitoring after Sentry
  initPerformanceMonitoring();

  // Render the app
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  // Catch any errors during initialization
  console.error('Failed to initialize application:', error);
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  showError(
    'Application Error',
    'The application failed to start. Please refresh the page or contact support if the problem persists.',
    import.meta.env.DEV ? `Error: ${errorMessage}${errorStack ? `\n\n${errorStack}` : ''}` : 'Please check the browser console for details.'
  );
  
  // Re-throw in development to see full error
  if (import.meta.env.DEV) {
    throw error;
  }
}
