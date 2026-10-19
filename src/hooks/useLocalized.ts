import { useCallback } from 'react';

import type { LocalizedText } from '@/features/catalog/types';
import { useAppSelector } from '@/store/hooks';

/** Server texts come as { fr, en }: pick the app language, fall back to French. */
export function useLocalized() {
  const language = useAppSelector((s) => s.prefs.language);
  return useCallback(
    (text?: LocalizedText | null): string => (text ? (text[language] || text.fr || text.en || '') : ''),
    [language],
  );
}
