// Dictation is not currently implemented.
// Kept as a no-op stub so components can re-enable it later without
// hunting down all the call sites.

export const speechSupported = false;

export function useDictation(_onSegment: (segment: string) => void) {
  return {
    isListening: false,
    interimText: '',
    dictationError: null as string | null,
    toggle: () => {},
  };
}
