import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call the optional onReset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md border border-red-200">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-red-700 mb-2 text-center">Something went wrong</h2>
          <div className="bg-red-50 p-4 rounded-md mb-4 overflow-auto max-h-[200px]">
            <p className="text-sm text-red-800 font-medium">{this.state.error?.name}: {this.state.error?.message}</p>
            {this.state.errorInfo && (
              <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>
          <div className="flex flex-col space-y-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
            >
              Reload page
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            If this problem persists, please refresh the page or try again later.
          </p>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorHandlingProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  return (props: P) => (
    <ErrorBoundary {...errorHandlingProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

// Hook for functional components to throw errors safely
export function useErrorHandler(error: unknown): void {
  if (error) {
    throw error;
  }
}