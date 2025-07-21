import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ReadStatus {
  prId: string;
  lastReadAt: string;
  lastUpdatedAt: string;
}

interface ReadStatusState {
  readStatuses: Map<string, ReadStatus>;
  markAsRead: (prId: string, updatedAt: string) => void;
  isUnread: (prId: string, updatedAt: string) => boolean;
  getUnreadCount: (prs: Array<{ id: string; updatedAt: string }>) => number;
  clearAllReadStatuses: () => void;
}

export const useReadStatusStore = create<ReadStatusState>()(
  persist(
    (set, get) => ({
      readStatuses: new Map<string, ReadStatus>(),

      markAsRead: (prId: string, updatedAt: string) => {
        set(state => {
          const newStatuses = new Map(state.readStatuses);
          newStatuses.set(prId, {
            prId,
            lastReadAt: new Date().toISOString(),
            lastUpdatedAt: updatedAt,
          });
          return { readStatuses: newStatuses };
        });
      },

      isUnread: (prId: string, updatedAt: string) => {
        const status = get().readStatuses.get(prId);
        if (!status) return true; // 初回は未読扱い
        return new Date(updatedAt) > new Date(status.lastUpdatedAt);
      },

      getUnreadCount: (prs: Array<{ id: string; updatedAt: string }>) => {
        const { isUnread } = get();
        return prs.filter(pr => isUnread(pr.id, pr.updatedAt)).length;
      },

      clearAllReadStatuses: () => {
        set({ readStatuses: new Map() });
      },
    }),
    {
      name: 'read-statuses',
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              readStatuses: new Map(Object.entries(state.readStatuses || {})),
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          const serializedState = {
            ...state,
            readStatuses: Object.fromEntries(state.readStatuses),
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
