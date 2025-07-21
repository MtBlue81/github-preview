import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface IgnoreState {
  ignoredPRIds: Set<string>;
  addIgnoredPR: (prId: string) => void;
  removeIgnoredPR: (prId: string) => void;
  isIgnored: (prId: string) => boolean;
  getIgnoredPRs: () => string[];
  clearAllIgnored: () => void;
}

export const useIgnoreStore = create<IgnoreState>()(
  persist(
    (set, get) => ({
      ignoredPRIds: new Set<string>(),

      addIgnoredPR: prId => {
        set(state => ({
          ignoredPRIds: new Set([...state.ignoredPRIds, prId]),
        }));
      },

      removeIgnoredPR: prId => {
        set(state => {
          const newSet = new Set(state.ignoredPRIds);
          newSet.delete(prId);
          return { ignoredPRIds: newSet };
        });
      },

      isIgnored: prId => {
        return get().ignoredPRIds.has(prId);
      },

      getIgnoredPRs: () => {
        return Array.from(get().ignoredPRIds);
      },

      clearAllIgnored: () => {
        set({ ignoredPRIds: new Set() });
      },
    }),
    {
      name: 'ignored-prs',
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              ignoredPRIds: new Set(state.ignoredPRIds || []),
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          const serializedState = {
            ...state,
            ignoredPRIds: Array.from(state.ignoredPRIds),
          };
          localStorage.setItem(
            name,
            JSON.stringify({ state: serializedState })
          );
        },
        removeItem: name => localStorage.removeItem(name),
      },
    }
  )
);
