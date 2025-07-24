import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useToastStore = create<ToastStore>(set => ({
  toasts: [],
  addToast: toast => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };

    set(state => ({
      toasts: [...state.toasts, newToast],
    }));

    // デフォルト3秒後に削除
    const duration = toast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({
          toasts: state.toasts.filter(t => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    })),
  clearAllToasts: () => set({ toasts: [] }),
}));
