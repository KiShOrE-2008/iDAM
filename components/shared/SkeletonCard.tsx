import React from 'react';

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 animate-pulse flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <div className="flex items-center gap-4 w-full sm:w-2/3">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 shrink-0" />
            <div className="space-y-2 w-full">
              <div className="h-4 bg-slate-800 rounded-md w-3/4" />
              <div className="h-3 bg-slate-800/70 rounded-md w-1/2" />
              <div className="flex gap-2 pt-1">
                <div className="h-4 w-12 bg-slate-800/50 rounded-full" />
                <div className="h-4 w-16 bg-slate-800/50 rounded-full" />
              </div>
            </div>
          </div>
          <div className="w-full sm:w-auto flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
            <div className="h-5 w-16 bg-slate-800 rounded-md" />
            <div className="h-8 w-24 bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden animate-pulse flex flex-col"
        >
          <div className="h-48 w-full bg-slate-800" />
          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-slate-800 rounded-md w-3/4" />
              <div className="h-3 bg-slate-800/70 rounded-md w-1/2" />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
              <div className="h-4 w-16 bg-slate-800 rounded-md" />
              <div className="h-8 w-20 bg-slate-800 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
