/**
 * Error Boundary Component for Graceful Error Handling
 * 
 * Catches JavaScript errors in child component trees and displays
 * a fallback UI instead of crashing the entire application.
 * 
 * @component ErrorBoundary
 * @description React error boundary for graceful error handling
 */

import React from "react";

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children - Child components to wrap
 * @property {React.ReactNode} [fallback] - Custom fallback UI
 * @property {Function} [onError] - Error callback function
 * @property {string} [componentName] - Name of component being wrapped
 */

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - Whether an error has occurred
 * @property {Error|null} error - The error that occurred
 * @property {Object|null} errorInfo - Additional error information
 */

/**
 * Enhanced Error Boundary component for catching and handling React errors
 * 
 * @class ErrorBoundary
 * @extends React.Component
 */
class ErrorBoundary extends React.Component {
  /**
   * Create an ErrorBoundary instance
   * 
   * @param {ErrorBoundaryProps} props - Component props
   */
  constructor(props) {
    super(props);
    
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  /**
   * Update state when an error is caught
   * 
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state with error information
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  /**
   * Log error information when caught
   * 
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - React error information
   */
  componentDidCatch(error, errorInfo) {
    const { onError, componentName } = this.props;
    
    // Log to console for debugging
    console.error(`ErrorBoundary caught an error in ${componentName || 'Magic Canvas'}:`, {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    // Call custom error handler if provided
    if (onError && typeof onError === 'function') {
      onError(error, errorInfo);
    }

    // Update state with detailed error info
    this.setState({
      error,
      errorInfo
    });
  }

  /**
   * Reset error state to retry rendering
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Render fallback UI when error occurs, otherwise render children
   * 
   * @returns {React.ReactNode} Fallback UI or children
   */
  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback && typeof fallback === 'function') {
        return fallback({ error, errorInfo, retry: this.handleRetry });
      }

      if (fallback && React.isValidElement(fallback)) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-bold text-red-800">
                  Something went wrong with the Magic Canvas
                </h2>
                <p className="text-sm text-red-600">
                  {componentName ? `Error in ${componentName}` : 'Component error'}
                </p>
              </div>
            </div>

            <p className="text-red-700 mb-4">
              The Magic Canvas encountered an error and couldn't be loaded. 
              Please try refreshing the page or using the retry button.
            </p>

            {error && (
              <details className="text-sm text-red-600 mb-4">
                <summary className="cursor-pointer mb-2 font-medium">Error details</summary>
                <pre className="bg-red-100 p-3 rounded overflow-auto text-xs">
                  {error.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200 font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200 font-medium"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Render children normally when no error
    return children;
  }
}

export default ErrorBoundary;