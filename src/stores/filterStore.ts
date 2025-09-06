import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  excludedLabels: Set<string>;
  addExcludedLabel: (label: string) => void;
  removeExcludedLabel: (label: string) => void;
  isLabelExcluded: (label: string) => boolean;
  clearExcludedLabels: () => void;
  getExcludedLabels: () => string[];
  toggleExcludedLabel: (label: string) => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      excludedLabels: new Set<string>(),

      addExcludedLabel: label => {
        set(state => ({
          excludedLabels: new Set([...state.excludedLabels, label]),
        }));
      },

      removeExcludedLabel: label => {
        set(state => {
          const newSet = new Set(state.excludedLabels);
          newSet.delete(label);
          return { excludedLabels: newSet };
        });
      },

      isLabelExcluded: label => {
        return get().excludedLabels.has(label);
      },

      clearExcludedLabels: () => {
        set({ excludedLabels: new Set() });
      },

      getExcludedLabels: () => {
        return Array.from(get().excludedLabels);
      },

      toggleExcludedLabel: label => {
        const state = get();
        if (state.isLabelExcluded(label)) {
          state.removeExcludedLabel(label);
        } else {
          state.addExcludedLabel(label);
        }
      },
    }),
    {
      name: 'filter-settings',
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              excludedLabels: new Set(state.excludedLabels || []),
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          const serializedState = {
            ...state,
            excludedLabels: Array.from(state.excludedLabels),
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