import { create } from 'zustand';

interface FocusState {
  lastFocusedPRId: string | null;
  setLastFocusedPR: (prId: string) => void;
  clearLastFocusedPR: () => void;
}

export const useFocusStore = create<FocusState>(set => ({
  lastFocusedPRId: null,
  setLastFocusedPR: prId => set({ lastFocusedPRId: prId }),
  clearLastFocusedPR: () => set({ lastFocusedPRId: null }),
}));
