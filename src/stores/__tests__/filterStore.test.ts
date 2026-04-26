import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '../filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({ excludedLabels: new Set() });
    localStorage.clear();
  });

  describe('初期状態', () => {
    it('excludedLabels は空のSet', () => {
      const { excludedLabels } = useFilterStore.getState();
      expect(excludedLabels.size).toBe(0);
    });

    it('getExcludedLabels は空配列を返す', () => {
      expect(useFilterStore.getState().getExcludedLabels()).toEqual([]);
    });
  });

  describe('addExcludedLabel', () => {
    it('ラベルを除外リストに追加できる', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      expect(useFilterStore.getState().excludedLabels.has('wip')).toBe(true);
    });

    it('複数のラベルを追加できる', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().addExcludedLabel('do-not-merge');

      const labels = useFilterStore.getState().getExcludedLabels();
      expect(labels).toContain('wip');
      expect(labels).toContain('do-not-merge');
      expect(labels).toHaveLength(2);
    });

    it('同じラベルを重複追加しても1つだけ保持される', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().addExcludedLabel('wip');

      expect(useFilterStore.getState().excludedLabels.size).toBe(1);
    });
  });

  describe('removeExcludedLabel', () => {
    it('除外リストからラベルを削除できる', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().removeExcludedLabel('wip');

      expect(useFilterStore.getState().excludedLabels.has('wip')).toBe(false);
    });

    it('複数あるラベルから特定の1つだけ削除できる', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().addExcludedLabel('do-not-merge');
      useFilterStore.getState().addExcludedLabel('skip-review');

      useFilterStore.getState().removeExcludedLabel('do-not-merge');

      const labels = useFilterStore.getState().getExcludedLabels();
      expect(labels).toContain('wip');
      expect(labels).not.toContain('do-not-merge');
      expect(labels).toContain('skip-review');
    });

    it('存在しないラベルを削除しても何も変わらない', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().removeExcludedLabel('not-existing');

      expect(useFilterStore.getState().excludedLabels.has('wip')).toBe(true);
      expect(useFilterStore.getState().excludedLabels.size).toBe(1);
    });
  });

  describe('isLabelExcluded', () => {
    it('除外リストに含まれていないラベルは false', () => {
      expect(useFilterStore.getState().isLabelExcluded('wip')).toBe(false);
    });

    it('除外リストに含まれているラベルは true', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      expect(useFilterStore.getState().isLabelExcluded('wip')).toBe(true);
    });
  });

  describe('toggleExcludedLabel', () => {
    it('未追加のラベルをtoggleすると追加される', () => {
      useFilterStore.getState().toggleExcludedLabel('wip');
      expect(useFilterStore.getState().isLabelExcluded('wip')).toBe(true);
    });

    it('追加済みのラベルをtoggleすると削除される', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().toggleExcludedLabel('wip');
      expect(useFilterStore.getState().isLabelExcluded('wip')).toBe(false);
    });

    it('toggleを2回呼ぶと元に戻る', () => {
      useFilterStore.getState().toggleExcludedLabel('wip');
      useFilterStore.getState().toggleExcludedLabel('wip');
      expect(useFilterStore.getState().isLabelExcluded('wip')).toBe(false);
    });
  });

  describe('clearExcludedLabels', () => {
    it('全ラベルを一括削除できる', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().addExcludedLabel('do-not-merge');
      useFilterStore.getState().clearExcludedLabels();

      expect(useFilterStore.getState().excludedLabels.size).toBe(0);
    });
  });

  describe('永続化', () => {
    it('追加したラベルが localStorage に保存される', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().addExcludedLabel('do-not-merge');

      const stored = localStorage.getItem('filter-settings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.excludedLabels).toEqual(
        expect.arrayContaining(['wip', 'do-not-merge'])
      );
    });

    it('localStorage の値は配列形式で保存される (Set ではない)', () => {
      useFilterStore.getState().addExcludedLabel('wip');

      const stored = localStorage.getItem('filter-settings');
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed.state.excludedLabels)).toBe(true);
    });

    it('削除も永続化される', () => {
      useFilterStore.getState().addExcludedLabel('wip');
      useFilterStore.getState().addExcludedLabel('do-not-merge');
      useFilterStore.getState().removeExcludedLabel('wip');

      const stored = localStorage.getItem('filter-settings');
      const parsed = JSON.parse(stored!);
      expect(parsed.state.excludedLabels).not.toContain('wip');
      expect(parsed.state.excludedLabels).toContain('do-not-merge');
    });
  });
});
