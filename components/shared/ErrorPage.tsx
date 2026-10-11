import React from 'react';
import { AlertTriangle, WifiOff, Clock, ShieldAlert, FileQuestion, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import type { AppError } from '../../types/index.ts';

interface ErrorPageProps {
  error?: Partial<AppError>;
  onRetry?: () => void;
  showHome?: boolean;
  showBack?: boolean;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  error,
  onRetry,
  showHome = true,
  showBack = true
}) => {
  const category = error?.category || 'UNKNOWN';

  const getIcon = () => {
    switch (category) {
      case 'NETWORK_UNAVAILABLE':
        return <WifiOff className="w-12 h-12 text-amber-400" />;
      case 'REQUEST_TIMEOUT':
        return <Clock className="w-12 h-12 text-amber-400" />;
      case 'FORBIDDEN':
      case 'UNAUTHORIZED':
        return <ShieldAlert className="w-12 h-12 text-rose-400" />;
      case 'NOT_FOUND':
        return <FileQuestion className="w-12 h-12 text-sky-400" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-rose-500" />;
    }
  };

  const title = error?.title || 'Something went wrong';
  const message = error?.message || 'An unexpected issue occurred. Please try again.';
  const correlationId = error?.correlationId;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl space-y-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shadow-inner">
          {getIcon()}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>

        {correlationId && (
          <div className="inline-block px-3 py-1 bg-slate-950/60 border border-slate-800 rounded-full">
            <span className="text-[11px] font-mono text-slate-500">Ref: {correlationId}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}

          {showBack && (
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all active:scale-95 border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}

          {showHome && (
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all active:scale-95 border border-slate-700"
            >
              <Home className="w-4 h-4" />
              Home
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
