import { describe, it, expect } from 'vitest';
import { deduplicatePullRequests, buildGitHubSearchQuery } from '../prUtils';
import { PullRequest } from '../../types/github';

// テスト用のモックPRを作成するヘルパー
function createMockPR(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id: 'PR_123',
    number: 123,
    title: 'Test PR',
    url: 'https://github.com/test/repo/pull/123',
    state: 'OPEN',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    isDraft: false,
    author: {
      login: 'testuser',
      avatarUrl: 'https://github.com/testuser.png',
    },
    repository: {
      name: 'test-repo',
      owner: {
        login: 'testorg',
      },
    },
    reviewDecision: null,
    commits: {
      totalCount: 1,
      nodes: [],
    },
    comments: {
      totalCount: 0,
    },
    reviews: {
      totalCount: 0,
    },
    labels: {
      nodes: [],
    },
    mergeable: 'MERGEABLE',
    ...overrides,
  };
}

describe('deduplicatePullRequests', () => {
  describe('基本的な重複除外', () => {
    it('同じPRが複数カテゴリにある場合、1つに統合される', () => {
      const pr1 = createMockPR({ id: 'PR_1' });
      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1] },
        { title: 'アサイン', icon: '📌', prs: [pr1] },
        { title: '作成', icon: '✏️', prs: [pr1] },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('PR_1');
      expect(result[0].categories.length).toBe(3);
      expect(result[0].categories).toContainEqual({ title: 'メンション', icon: '💬' });
      expect(result[0].categories).toContainEqual({ title: 'アサイン', icon: '📌' });
      expect(result[0].categories).toContainEqual({ title: '作成', icon: '✏️' });
    });

    it('異なるPRは別々に保持される', () => {
      const pr1 = createMockPR({ id: 'PR_1', number: 1 });
      const pr2 = createMockPR({ id: 'PR_2', number: 2 });
      const pr3 = createMockPR({ id: 'PR_3', number: 3 });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2] },
        { title: 'アサイン', icon: '📌', prs: [pr2, pr3] },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result.length).toBe(3);
      
      const resultPR1 = result.find(pr => pr.id === 'PR_1');
      expect(resultPR1?.categories.length).toBe(1);
      expect(resultPR1?.categories[0].title).toBe('メンション');

      const resultPR2 = result.find(pr => pr.id === 'PR_2');
      expect(resultPR2?.categories.length).toBe(2);

      const resultPR3 = result.find(pr => pr.id === 'PR_3');
      expect(resultPR3?.categories.length).toBe(1);
      expect(resultPR3?.categories[0].title).toBe('アサイン');
    });
  });

  describe('フィルタリング機能', () => {
    it('無視リストのPRは除外される', () => {
      const pr1 = createMockPR({ 
        id: 'PR_1',
        repository: { name: 'repo1', owner: { login: 'org1' } },
        number: 1
      });
      const pr2 = createMockPR({ 
        id: 'PR_2',
        repository: { name: 'repo2', owner: { login: 'org2' } },
        number: 2
      });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2] },
      ];

      const isIgnored = (prKey: string) => prKey === 'org1:repo1:1';

      const result = deduplicatePullRequests(
        categories,
        isIgnored,
        new Set()
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('PR_2');
    });

    it('除外ラベルを持つPRは除外される', () => {
      const pr1 = createMockPR({ 
        id: 'PR_1',
        labels: { nodes: [{ name: 'bug', color: 'ff0000' }] }
      });
      const pr2 = createMockPR({ 
        id: 'PR_2',
        labels: { nodes: [{ name: 'feature', color: '00ff00' }] }
      });
      const pr3 = createMockPR({ 
        id: 'PR_3',
        labels: { nodes: [] }
      });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2, pr3] },
      ];

      const excludedLabels = new Set(['bug', 'wontfix']);

      const result = deduplicatePullRequests(
        categories,
        () => false,
        excludedLabels
      );

      expect(result.length).toBe(2);
      expect(result.find(pr => pr.id === 'PR_1')).toBeUndefined();
      expect(result.find(pr => pr.id === 'PR_2')).toBeDefined();
      expect(result.find(pr => pr.id === 'PR_3')).toBeDefined();
    });

    it('複数の除外ラベルを持つPRも除外される', () => {
      const pr1 = createMockPR({ 
        id: 'PR_1',
        labels: { 
          nodes: [
            { name: 'bug', color: 'ff0000' },
            { name: 'documentation', color: '0000ff' }
          ] 
        }
      });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1] },
      ];

      const excludedLabels = new Set(['documentation']);

      const result = deduplicatePullRequests(
        categories,
        () => false,
        excludedLabels
      );

      expect(result.length).toBe(0);
    });

    it('無視リストと除外ラベルの両方が適用される', () => {
      const pr1 = createMockPR({ 
        id: 'PR_1',
        repository: { name: 'repo1', owner: { login: 'org1' } },
        number: 1
      });
      const pr2 = createMockPR({ 
        id: 'PR_2',
        labels: { nodes: [{ name: 'bug', color: 'ff0000' }] }
      });
      const pr3 = createMockPR({ 
        id: 'PR_3',
        labels: { nodes: [] }
      });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2, pr3] },
      ];

      const isIgnored = (prKey: string) => prKey === 'org1:repo1:1';
      const excludedLabels = new Set(['bug']);

      const result = deduplicatePullRequests(
        categories,
        isIgnored,
        excludedLabels
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('PR_3');
    });
  });

  describe('ソート機能', () => {
    it('PRは更新日時の新しい順にソートされる', () => {
      const pr1 = createMockPR({ 
        id: 'PR_1',
        updatedAt: '2024-01-01T00:00:00Z'
      });
      const pr2 = createMockPR({ 
        id: 'PR_2',
        updatedAt: '2024-01-03T00:00:00Z'
      });
      const pr3 = createMockPR({ 
        id: 'PR_3',
        updatedAt: '2024-01-02T00:00:00Z'
      });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2, pr3] },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result.length).toBe(3);
      expect(result[0].id).toBe('PR_2'); // 最新
      expect(result[1].id).toBe('PR_3');
      expect(result[2].id).toBe('PR_1'); // 最古
    });

    it('同じ更新日時のPRも正しく処理される', () => {
      const sameTime = '2024-01-01T12:00:00Z';
      const pr1 = createMockPR({ id: 'PR_1', updatedAt: sameTime });
      const pr2 = createMockPR({ id: 'PR_2', updatedAt: sameTime });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2] },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result.length).toBe(2);
      expect(result.map(pr => pr.id)).toContain('PR_1');
      expect(result.map(pr => pr.id)).toContain('PR_2');
    });
  });

  describe('エッジケース', () => {
    it('空のカテゴリ配列を処理できる', () => {
      const result = deduplicatePullRequests(
        [],
        () => false,
        new Set()
      );

      expect(result).toEqual([]);
    });

    it('すべてのPRが空のカテゴリを処理できる', () => {
      const categories = [
        { title: 'メンション', icon: '💬', prs: [] },
        { title: 'アサイン', icon: '📌', prs: [] },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result).toEqual([]);
    });

    it('すべてのPRがフィルタリングされた場合、空配列を返す', () => {
      const pr1 = createMockPR({ id: 'PR_1' });
      const pr2 = createMockPR({ id: 'PR_2' });

      const categories = [
        { title: 'メンション', icon: '💬', prs: [pr1, pr2] },
      ];

      const isIgnored = () => true; // すべて無視

      const result = deduplicatePullRequests(
        categories,
        isIgnored,
        new Set()
      );

      expect(result).toEqual([]);
    });

    it('カテゴリタイトルとアイコンが正しく保持される', () => {
      const pr = createMockPR({ id: 'PR_1' });
      const categories = [
        { title: '特殊カテゴリ🎉', icon: '🚀', prs: [pr] },
        { title: '長いカテゴリ名テスト', icon: '📚', prs: [pr] },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result.length).toBe(1);
      expect(result[0].categories).toContainEqual({ 
        title: '特殊カテゴリ🎉', 
        icon: '🚀' 
      });
      expect(result[0].categories).toContainEqual({ 
        title: '長いカテゴリ名テスト', 
        icon: '📚' 
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のPRを効率的に処理できる', () => {
      const prs = Array.from({ length: 100 }, (_, i) => 
        createMockPR({ 
          id: `PR_${i}`,
          updatedAt: new Date(Date.now() - i * 1000).toISOString()
        })
      );

      const categories = [
        { title: 'メンション', icon: '💬', prs: prs.slice(0, 50) },
        { title: 'アサイン', icon: '📌', prs: prs.slice(25, 75) },
        { title: '作成', icon: '✏️', prs: prs.slice(50, 100) },
      ];

      const result = deduplicatePullRequests(
        categories,
        () => false,
        new Set()
      );

      expect(result.length).toBe(100);
      
      // 重複したPRがカテゴリを複数持つことを確認
      const pr25 = result.find(pr => pr.id === 'PR_25');
      expect(pr25?.categories.length).toBe(2); // メンションとアサイン
      
      const pr50 = result.find(pr => pr.id === 'PR_50');
      expect(pr50?.categories.length).toBe(2); // アサインと作成
    });
  });
});

describe('buildGitHubSearchQuery', () => {
  const username = 'testuser';

  it('author検索クエリを正しく生成する', () => {
    const query = buildGitHubSearchQuery(username, 'author');
    expect(query).toBe('is:pr is:open author:testuser sort:updated-desc');
  });

  it('assignee検索クエリを正しく生成する', () => {
    const query = buildGitHubSearchQuery(username, 'assignee');
    expect(query).toBe('is:pr is:open assignee:testuser sort:updated-desc');
  });

  it('mentions検索クエリを正しく生成する', () => {
    const query = buildGitHubSearchQuery(username, 'mentions');
    expect(query).toBe('is:pr is:open mentions:testuser sort:updated-desc');
  });

  it('review-requested検索クエリを正しく生成する', () => {
    const query = buildGitHubSearchQuery(username, 'review-requested');
    expect(query).toBe('is:pr is:open review-requested:testuser sort:updated-desc');
  });

  it('reviewed-by検索クエリを正しく生成する', () => {
    const query = buildGitHubSearchQuery(username, 'reviewed-by');
    expect(query).toBe('is:pr is:open reviewed-by:testuser sort:updated-desc');
  });

  it('commenter検索クエリを正しく生成する', () => {
    const query = buildGitHubSearchQuery(username, 'commenter');
    expect(query).toBe('is:pr is:open commenter:testuser sort:updated-desc');
  });

  it('特殊文字を含むユーザー名も正しく処理される', () => {
    const specialUsername = 'user-name_123';
    const query = buildGitHubSearchQuery(specialUsername, 'author');
    expect(query).toBe('is:pr is:open author:user-name_123 sort:updated-desc');
  });

  it('空のユーザー名でもクエリが生成される', () => {
    const query = buildGitHubSearchQuery('', 'author');
    expect(query).toBe('is:pr is:open author: sort:updated-desc');
  });

  it('大文字小文字を保持する', () => {
    const mixedCaseUsername = 'TestUser';
    const query = buildGitHubSearchQuery(mixedCaseUsername, 'author');
    expect(query).toBe('is:pr is:open author:TestUser sort:updated-desc');
  });
});