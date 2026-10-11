import React, { ReactNode } from 'react';
import { SkeletonCard } from './SkeletonCard';
import { ErrorPage } from './ErrorPage';
import { Inbox } from 'lucide-react';
import type { AppError, RequestState } from '../../types/index.ts';

interface RequestStateHandlerProps {
  state: RequestState;
  error?: AppError | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  loadingComponent?: ReactNode;
  children: ReactNode;
}

export const RequestStateHandler: React.FC<RequestStateHandlerProps> = ({
  state,
  error,
  onRetry,
  emptyTitle = 'No Items Found',
  emptyMessage = 'There are no records matching your current request.',
  emptyAction,
  loadingComponent = <SkeletonCard count={3} />,
  children
}) => {
  if (state === 'loading') {
    return <>{loadingComponent}</>;
  }

  if (state === 'error') {
    return (
      <ErrorPage
        error={error || undefined}
        onRetry={onRetry}
        showHome={true}
        showBack={true}
      />
    );
  }

  if (state === 'empty') {
    return (
      <div className="py-16 px-4 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
          <Inbox className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">{emptyTitle}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{emptyMessage}</p>
        </div>
        {emptyAction && (
          <button
            onClick={emptyAction.onClick}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all active:scale-95"
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
