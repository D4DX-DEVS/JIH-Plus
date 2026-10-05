import { useSyncExternalStore } from 'react';

// Live `window.matchMedia(query).matches`, for mounting a component at one
// breakpoint only instead of rendering it and hiding it with CSS.
export default function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
