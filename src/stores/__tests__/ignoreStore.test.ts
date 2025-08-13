import { describe, it, expect, beforeEach } from 'vitest';
import { useIgnoreStore } from '../ignoreStore';

describe('ignoreStore', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useIgnoreStore.setState({ ignoredPRIds: new Set() });
    localStorage.clear();
  });

  describe('初期状態', () => {
    it('初期状態ではignoredPRIdsが空配列', () => {
      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toEqual([]);
    });
  });

  describe('addIgnoredPR', () => {
    it('PRを無視リストに追加できる', () => {
      const prKey = 'owner:repo:123';

      useIgnoreStore.getState().addIgnoredPR(prKey);

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toContain(prKey);
      expect(ignoredPRIds.size).toBe(1);
    });

    it('複数のPRを無視リストに追加できる', () => {
      const pr1Key = 'owner1:repo1:123';
      const pr2Key = 'owner2:repo2:456';

      useIgnoreStore.getState().addIgnoredPR(pr1Key);
      useIgnoreStore.getState().addIgnoredPR(pr2Key);

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toContain(pr1Key);
      expect(Array.from(ignoredPRIds)).toContain(pr2Key);
      expect(ignoredPRIds.size).toBe(2);
    });

    it('同じPRを重複して追加しても1つだけ保持される', () => {
      const prKey = 'owner:repo:123';

      useIgnoreStore.getState().addIgnoredPR(prKey);
      useIgnoreStore.getState().addIgnoredPR(prKey);
      useIgnoreStore.getState().addIgnoredPR(prKey);

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toContain(prKey);
      expect(ignoredPRIds.size).toBe(1);
    });
  });

  describe('removeIgnoredPR', () => {
    it('無視リストからPRを削除できる', () => {
      const prKey = 'owner:repo:123';

      // まず追加
      useIgnoreStore.getState().addIgnoredPR(prKey);
      expect(useIgnoreStore.getState().ignoredPRIds).toContain(prKey);

      // 削除
      useIgnoreStore.getState().removeIgnoredPR(prKey);
      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).not.toContain(prKey);
      expect(ignoredPRIds.size).toBe(0);
    });

    it('複数のPRがある中から特定のPRだけを削除できる', () => {
      const pr1Key = 'owner1:repo1:123';
      const pr2Key = 'owner2:repo2:456';
      const pr3Key = 'owner3:repo3:789';

      // 複数追加
      useIgnoreStore.getState().addIgnoredPR(pr1Key);
      useIgnoreStore.getState().addIgnoredPR(pr2Key);
      useIgnoreStore.getState().addIgnoredPR(pr3Key);

      // 1つだけ削除
      useIgnoreStore.getState().removeIgnoredPR(pr2Key);

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toContain(pr1Key);
      expect(Array.from(ignoredPRIds)).not.toContain(pr2Key);
      expect(Array.from(ignoredPRIds)).toContain(pr3Key);
      expect(ignoredPRIds.size).toBe(2);
    });

    it('存在しないPRを削除しようとしても何も変わらない', () => {
      const pr1Key = 'owner1:repo1:123';
      const nonExistentKey = 'nonexistent:repo:999';

      // 1つ追加
      useIgnoreStore.getState().addIgnoredPR(pr1Key);

      // 存在しないものを削除
      useIgnoreStore.getState().removeIgnoredPR(nonExistentKey);

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toContain(pr1Key);
      expect(ignoredPRIds.size).toBe(1);
    });
  });

  describe('isIgnored', () => {
    it('無視リストに含まれていないPRはfalseを返す', () => {
      // 初期状態を確実にリセット
      useIgnoreStore.setState({ ignoredPRIds: new Set() });

      const prKey = 'owner:repo:123';
      const isIgnored = useIgnoreStore.getState().isIgnored(prKey);
      expect(isIgnored).toBe(false);
    });

    it('無視リストに含まれているPRはtrueを返す', () => {
      const prKey = 'owner:repo:123';

      useIgnoreStore.getState().addIgnoredPR(prKey);

      const isIgnored = useIgnoreStore.getState().isIgnored(prKey);
      expect(isIgnored).toBe(true);
    });

    it('削除されたPRはfalseを返す', () => {
      const prKey = 'owner:repo:123';

      // 追加
      useIgnoreStore.getState().addIgnoredPR(prKey);
      expect(useIgnoreStore.getState().isIgnored(prKey)).toBe(true);

      // 削除
      useIgnoreStore.getState().removeIgnoredPR(prKey);
      expect(useIgnoreStore.getState().isIgnored(prKey)).toBe(false);
    });
  });

  describe('永続化', () => {
    it('無視リストがlocalStorageに保存される', () => {
      const prKey = 'owner:repo:123';

      useIgnoreStore.getState().addIgnoredPR(prKey);

      const stored = localStorage.getItem('ignored-prs');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.ignoredPRIds).toContain(prKey);
      }
    });

    it('複数の無視項目が保存される', () => {
      const pr1Key = 'owner1:repo1:123';
      const pr2Key = 'owner2:repo2:456';

      useIgnoreStore.getState().addIgnoredPR(pr1Key);
      useIgnoreStore.getState().addIgnoredPR(pr2Key);

      const stored = localStorage.getItem('ignored-prs');
      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.ignoredPRIds).toContain(pr1Key);
        expect(parsedStored.state.ignoredPRIds).toContain(pr2Key);
      }
    });

    it('削除も永続化される', () => {
      const pr1Key = 'owner1:repo1:123';
      const pr2Key = 'owner2:repo2:456';

      // 2つ追加
      useIgnoreStore.getState().addIgnoredPR(pr1Key);
      useIgnoreStore.getState().addIgnoredPR(pr2Key);

      // 1つ削除
      useIgnoreStore.getState().removeIgnoredPR(pr1Key);

      const stored = localStorage.getItem('ignored-prs');
      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.ignoredPRIds).not.toContain(pr1Key);
        expect(parsedStored.state.ignoredPRIds).toContain(pr2Key);
      }
    });
  });

  describe('PRキーの形式', () => {
    it('正しいキー形式(owner:repo:number)で動作する', () => {
      const prKey = 'facebook:react:12345';

      useIgnoreStore.getState().addIgnoredPR(prKey);
      expect(useIgnoreStore.getState().isIgnored(prKey)).toBe(true);
    });

    it('特殊文字を含むowner/repo名でも動作する', () => {
      const prKey = 'my-org:my-repo-name:999';

      useIgnoreStore.getState().addIgnoredPR(prKey);
      expect(useIgnoreStore.getState().isIgnored(prKey)).toBe(true);
    });

    it('大きなPR番号でも動作する', () => {
      const prKey = 'owner:repo:999999';

      useIgnoreStore.getState().addIgnoredPR(prKey);
      expect(useIgnoreStore.getState().isIgnored(prKey)).toBe(true);
    });
  });

  describe('エッジケース', () => {
    it('空文字列のキーも技術的には追加される', () => {
      const emptyKey = '';

      useIgnoreStore.getState().addIgnoredPR(emptyKey);

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(Array.from(ignoredPRIds)).toContain(emptyKey);
      expect(ignoredPRIds.size).toBe(1);
    });

    it('大量のPRを無視リストに追加できる', () => {
      const prKeys = Array.from({ length: 100 }, (_, i) => `owner:repo:${i}`);

      prKeys.forEach(key => {
        useIgnoreStore.getState().addIgnoredPR(key);
      });

      const { ignoredPRIds } = useIgnoreStore.getState();
      expect(ignoredPRIds.size).toBe(100);

      prKeys.forEach(key => {
        expect(Array.from(ignoredPRIds)).toContain(key);
      });
    });
  });
});
