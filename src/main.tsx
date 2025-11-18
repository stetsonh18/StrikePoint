import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { validateEnvironmentVariables } from './shared/utils/envValidation';
import { initSentry } from './infrastructure/monitoring/sentry';
import { initPerformanceMonitoring } from './infrastructure/monitoring/performance';
import App from './App.tsx';
import './index.css';

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
          <h1 style="color: #ef4444; margin-top: 0;">Configuration Error</h1>
          <p>The application is missing required configuration. Please contact support.</p>
          <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 1rem;">
            Error: Missing environment variables
          </p>
        </div>
      </div>
    `;
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

// Initialize Sentry before React app
initSentry();

// Initialize performance monitoring after Sentry
initPerformanceMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
