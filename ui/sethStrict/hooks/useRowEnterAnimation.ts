import React from 'react';

interface Options {
  durationMs?: number;
  skipInitial?: boolean;
}

export default function useRowEnterAnimation(
  ids: Array<string>,
  options?: Options,
) {
  const durationMs = options?.durationMs ?? 1600;
  const skipInitial = options?.skipInitial ?? true;
  const [enteringIds, setEnteringIds] = React.useState<Array<string>>([]);
  const previousIdsRef = React.useRef<Array<string>>([]);
  const hasHydratedRef = React.useRef(false);

  const idsKey = React.useMemo(() => ids.join('|'), [ids]);
  const normalizedIds = React.useMemo(() => ids.map((id) => String(id)), [idsKey]);
  const enteringSet = React.useMemo(() => new Set(enteringIds), [enteringIds]);

  React.useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      previousIdsRef.current = normalizedIds;

      if (!skipInitial && normalizedIds.length > 0) {
        setEnteringIds(normalizedIds);
      }
      return;
    }

    if (skipInitial && previousIdsRef.current.length === 0) {
      previousIdsRef.current = normalizedIds;
      return;
    }

    const previousIds = new Set(previousIdsRef.current);
    const addedIds = normalizedIds.filter((id) => !previousIds.has(id));
    previousIdsRef.current = normalizedIds;

    if (addedIds.length === 0) {
      return;
    }

    setEnteringIds((current) => Array.from(new Set([ ...current, ...addedIds ])));
    const timer = window.setTimeout(() => {
      setEnteringIds((current) => current.filter((id) => !addedIds.includes(id)));
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [idsKey, normalizedIds, durationMs, skipInitial]);

  return React.useCallback((id: string) => enteringSet.has(id), [enteringSet]);
}
