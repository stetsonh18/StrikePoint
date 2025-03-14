/**
 * Main entry point for the StrikePoint trading application.
 * Renders the App component to the DOM with React StrictMode enabled.
 */

// React imports
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// CSS imports
import './index.css'

// Component imports
import App from './App.jsx'

// Create root and render the app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
