import React from 'react';
import { AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import type { AppError } from '../../types/index.ts';

interface InlineErrorProps {
  error: string | Partial<AppError> | null | undefined;
  onRetry?: () => void;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, onRetry, className = '' }) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message || 'An error occurred';
  const title = typeof error === 'object' && error.title ? error.title : null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-semibold text-rose-200 text-xs uppercase tracking-wider">{title}</p>}
        <p className="leading-snug">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 p-1 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-colors"
          title="Retry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
