import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初期状態', () => {
    it('toasts は空配列', () => {
      expect(useToastStore.getState().toasts).toEqual([]);
    });
  });

  describe('addToast', () => {
    it('toast を追加できる', () => {
      useToastStore.getState().addToast({ message: 'hello', type: 'info' });

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({ message: 'hello', type: 'info' });
      expect(toasts[0].id).toBeTruthy();
    });

    it('複数の toast を順番に追加できる', () => {
      useToastStore.getState().addToast({ message: 'first', type: 'info' });
      vi.advanceTimersByTime(1);
      useToastStore.getState().addToast({ message: 'second', type: 'success' });

      const { toasts } = useToastStore.getState();
      expect(toasts).toHaveLength(2);
      expect(toasts[0].message).toBe('first');
      expect(toasts[1].message).toBe('second');
    });

    it('追加された toast には固有 id が付く', () => {
      useToastStore.getState().addToast({ message: 'a', type: 'info' });
      vi.advanceTimersByTime(1);
      useToastStore.getState().addToast({ message: 'b', type: 'info' });

      const ids = useToastStore.getState().toasts.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('自動消滅', () => {
    it('デフォルト 3秒で削除される', () => {
      useToastStore
        .getState()
        .addToast({ message: 'auto-dismiss', type: 'info' });
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(2999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('duration 指定で削除タイミングを制御できる', () => {
      useToastStore
        .getState()
        .addToast({ message: 'short', type: 'info', duration: 1000 });

      vi.advanceTimersByTime(999);
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('duration 0 だと自動削除されない', () => {
      useToastStore
        .getState()
        .addToast({ message: 'persistent', type: 'info', duration: 0 });

      vi.advanceTimersByTime(60_000);
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('指定 id の toast を削除できる', () => {
      useToastStore
        .getState()
        .addToast({ message: 'a', type: 'info', duration: 0 });
      const targetId = useToastStore.getState().toasts[0].id;

      useToastStore.getState().removeToast(targetId);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });

    it('複数 toast がある中から特定の1つだけ削除できる', () => {
      useToastStore
        .getState()
        .addToast({ message: 'a', type: 'info', duration: 0 });
      vi.advanceTimersByTime(1);
      useToastStore
        .getState()
        .addToast({ message: 'b', type: 'success', duration: 0 });
      vi.advanceTimersByTime(1);
      useToastStore
        .getState()
        .addToast({ message: 'c', type: 'error', duration: 0 });

      const targetId = useToastStore.getState().toasts[1].id;
      useToastStore.getState().removeToast(targetId);

      const remaining = useToastStore.getState().toasts.map(t => t.message);
      expect(remaining).toEqual(['a', 'c']);
    });
  });

  describe('clearAllToasts', () => {
    it('全ての toast を一括削除する', () => {
      useToastStore
        .getState()
        .addToast({ message: 'a', type: 'info', duration: 0 });
      vi.advanceTimersByTime(1);
      useToastStore
        .getState()
        .addToast({ message: 'b', type: 'success', duration: 0 });

      useToastStore.getState().clearAllToasts();
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });
});
