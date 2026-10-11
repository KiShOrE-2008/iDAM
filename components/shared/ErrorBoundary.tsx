import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorPage } from './ErrorPage';
import { mapToAppError } from '../../lib/error/errorMapper';
import type { AppError } from '../../types/index.ts';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  appError: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    appError: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      appError: mapToAppError(error, 'An unexpected rendering error occurred.')
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, appError: null });
  };

  public render() {
    if (this.state.hasError && this.state.appError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.appError, this.handleReset);
      }

      return (
        <ErrorPage
          error={this.state.appError}
          onRetry={this.handleReset}
          showHome={true}
          showBack={true}
        />
      );
    }

    return this.props.children;
  }
}
