import React, { ComponentType, lazy, Suspense } from 'react';

export default function dynamic<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> } | ComponentType<T>>,
  options?: { ssr?: boolean; loading?: React.ComponentType }
) {
  const LazyComponent = lazy(async () => {
    const mod = await importFn();
    if ('default' in mod) {
      return mod;
    }
    return { default: mod as ComponentType<T> };
  });

  const Loading = options?.loading || (() => null);

  return function DynamicWrapper(props: T) {
    return (
      <Suspense fallback={<Loading />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
