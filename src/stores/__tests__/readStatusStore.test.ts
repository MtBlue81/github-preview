import { describe, it, expect, beforeEach } from 'vitest';
import { useReadStatusStore } from '../readStatusStore';

describe('readStatusStore', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useReadStatusStore.setState({ readStatuses: new Map() });
    localStorage.clear();
  });

  describe('初期状態', () => {
    it('初期状態ではreadStatusesが空のMap', () => {
      const { readStatuses } = useReadStatusStore.getState();
      expect(readStatuses.size).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('PRを既読としてマークできる', () => {
      const prId = 'PR_123';
      const updatedAt = '2024-01-01T12:00:00Z';

      useReadStatusStore.getState().markAsRead(prId, updatedAt);

      const { readStatuses } = useReadStatusStore.getState();
      const status = readStatuses.get(prId);
      expect(status?.lastUpdatedAt).toBe(updatedAt);
    });

    it('複数のPRを既読としてマークできる', () => {
      const pr1 = { id: 'PR_123', updatedAt: '2024-01-01T12:00:00Z' };
      const pr2 = { id: 'PR_456', updatedAt: '2024-01-02T12:00:00Z' };

      useReadStatusStore.getState().markAsRead(pr1.id, pr1.updatedAt);
      useReadStatusStore.getState().markAsRead(pr2.id, pr2.updatedAt);

      const { readStatuses } = useReadStatusStore.getState();
      const status1 = readStatuses.get(pr1.id);
      const status2 = readStatuses.get(pr2.id);
      expect(status1?.lastUpdatedAt).toBe(pr1.updatedAt);
      expect(status2?.lastUpdatedAt).toBe(pr2.updatedAt);
    });

    it('同じPRの既読ステータスを更新できる', () => {
      const prId = 'PR_123';
      const oldUpdatedAt = '2024-01-01T12:00:00Z';
      const newUpdatedAt = '2024-01-02T12:00:00Z';

      // 最初に古い日時で既読マーク
      useReadStatusStore.getState().markAsRead(prId, oldUpdatedAt);
      const status1 = useReadStatusStore.getState().readStatuses.get(prId);
      expect(status1?.lastUpdatedAt).toBe(oldUpdatedAt);

      // 新しい日時で更新
      useReadStatusStore.getState().markAsRead(prId, newUpdatedAt);
      const status2 = useReadStatusStore.getState().readStatuses.get(prId);
      expect(status2?.lastUpdatedAt).toBe(newUpdatedAt);
    });
  });

  describe('isUnread', () => {
    it('マークされていないPRは未読として判定される', () => {
      const prId = 'PR_123';
      const updatedAt = '2024-01-01T12:00:00Z';

      const isUnread = useReadStatusStore.getState().isUnread(prId, updatedAt);
      expect(isUnread).toBe(true);
    });

    it('既読としてマークされたPRは既読として判定される', () => {
      const prId = 'PR_123';
      const updatedAt = '2024-01-01T12:00:00Z';

      // 既読としてマーク
      useReadStatusStore.getState().markAsRead(prId, updatedAt);

      const isUnread = useReadStatusStore.getState().isUnread(prId, updatedAt);
      expect(isUnread).toBe(false);
    });

    it('PRが更新された場合は未読として判定される', () => {
      const prId = 'PR_123';
      const oldUpdatedAt = '2024-01-01T12:00:00Z';
      const newUpdatedAt = '2024-01-02T12:00:00Z';

      // 古い日時で既読マーク
      useReadStatusStore.getState().markAsRead(prId, oldUpdatedAt);

      // 新しい日時で未読チェック
      const isUnread = useReadStatusStore
        .getState()
        .isUnread(prId, newUpdatedAt);
      expect(isUnread).toBe(true);
    });

    it('PRが更新されていない場合は既読として判定される', () => {
      const prId = 'PR_123';
      const oldUpdatedAt = '2024-01-01T12:00:00Z';
      const sameUpdatedAt = '2024-01-01T12:00:00Z';

      // 既読マーク
      useReadStatusStore.getState().markAsRead(prId, oldUpdatedAt);

      // 同じ日時で未読チェック
      const isUnread = useReadStatusStore
        .getState()
        .isUnread(prId, sameUpdatedAt);
      expect(isUnread).toBe(false);
    });

    it('より古い日時でチェックした場合は既読として判定される', () => {
      const prId = 'PR_123';
      const newUpdatedAt = '2024-01-02T12:00:00Z';
      const oldUpdatedAt = '2024-01-01T12:00:00Z';

      // 新しい日時で既読マーク
      useReadStatusStore.getState().markAsRead(prId, newUpdatedAt);

      // 古い日時で未読チェック
      const isUnread = useReadStatusStore
        .getState()
        .isUnread(prId, oldUpdatedAt);
      expect(isUnread).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('空の配列の場合は0を返す', () => {
      const pullRequests: Array<{ id: string; updatedAt: string }> = [];

      const count = useReadStatusStore.getState().getUnreadCount(pullRequests);
      expect(count).toBe(0);
    });

    it('すべて未読の場合は配列の長さを返す', () => {
      const pullRequests = [
        { id: 'PR_123', updatedAt: '2024-01-01T12:00:00Z' },
        { id: 'PR_456', updatedAt: '2024-01-02T12:00:00Z' },
        { id: 'PR_789', updatedAt: '2024-01-03T12:00:00Z' },
      ];

      const count = useReadStatusStore.getState().getUnreadCount(pullRequests);
      expect(count).toBe(3);
    });

    it('すべて既読の場合は0を返す', () => {
      const pullRequests = [
        { id: 'PR_123', updatedAt: '2024-01-01T12:00:00Z' },
        { id: 'PR_456', updatedAt: '2024-01-02T12:00:00Z' },
      ];

      // すべて既読としてマーク
      pullRequests.forEach(pr => {
        useReadStatusStore.getState().markAsRead(pr.id, pr.updatedAt);
      });

      const count = useReadStatusStore.getState().getUnreadCount(pullRequests);
      expect(count).toBe(0);
    });

    it('一部既読の場合は未読の数を返す', () => {
      const pullRequests = [
        { id: 'PR_123', updatedAt: '2024-01-01T12:00:00Z' },
        { id: 'PR_456', updatedAt: '2024-01-02T12:00:00Z' },
        { id: 'PR_789', updatedAt: '2024-01-03T12:00:00Z' },
      ];

      // 2つ目だけ既読としてマーク
      useReadStatusStore
        .getState()
        .markAsRead(pullRequests[1].id, pullRequests[1].updatedAt);

      const count = useReadStatusStore.getState().getUnreadCount(pullRequests);
      expect(count).toBe(2);
    });

    it('更新されたPRがある場合は正しくカウントする', () => {
      const pullRequests = [
        { id: 'PR_123', updatedAt: '2024-01-01T12:00:00Z' },
        { id: 'PR_456', updatedAt: '2024-01-02T14:00:00Z' }, // 更新された
      ];

      // 古い日時で既読マーク
      useReadStatusStore
        .getState()
        .markAsRead('PR_123', '2024-01-01T12:00:00Z');
      useReadStatusStore
        .getState()
        .markAsRead('PR_456', '2024-01-02T12:00:00Z'); // 古い時刻

      const count = useReadStatusStore.getState().getUnreadCount(pullRequests);
      expect(count).toBe(1); // PR_456が更新されているので未読扱い
    });
  });

  describe('永続化', () => {
    it('既読ステータスがlocalStorageに保存される', () => {
      const prId = 'PR_123';
      const updatedAt = '2024-01-01T12:00:00Z';

      useReadStatusStore.getState().markAsRead(prId, updatedAt);

      const stored = localStorage.getItem('read-statuses');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.readStatuses[prId]).toBeDefined();
        expect(parsedStored.state.readStatuses[prId].lastUpdatedAt).toBe(
          updatedAt
        );
      }
    });

    it('複数の既読ステータスが保存される', () => {
      const pr1 = { id: 'PR_123', updatedAt: '2024-01-01T12:00:00Z' };
      const pr2 = { id: 'PR_456', updatedAt: '2024-01-02T12:00:00Z' };

      useReadStatusStore.getState().markAsRead(pr1.id, pr1.updatedAt);
      useReadStatusStore.getState().markAsRead(pr2.id, pr2.updatedAt);

      const stored = localStorage.getItem('read-statuses');
      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.readStatuses[pr1.id]).toBeDefined();
        expect(parsedStored.state.readStatuses[pr1.id].lastUpdatedAt).toBe(
          pr1.updatedAt
        );
        expect(parsedStored.state.readStatuses[pr2.id]).toBeDefined();
        expect(parsedStored.state.readStatuses[pr2.id].lastUpdatedAt).toBe(
          pr2.updatedAt
        );
      }
    });
  });
});
