import { lazy, type ComponentType } from 'react';

/** Like React.lazy, but guarantees the Suspense fallback is shown for at least `min` ms. */
export function lazyMin<T extends { default: ComponentType<any> }>(
  factory: () => Promise<T>,
  min = 10000,
) {
  return lazy(() =>
    Promise.all([factory(), new Promise(resolve => setTimeout(resolve, min))])
      .then(([module]) => module)
  );
}