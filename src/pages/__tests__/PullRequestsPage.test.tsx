import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { PullRequestsPage } from '../PullRequestsPage';
import { mockPullRequest, mockPullRequestWithConflict } from '../../test/utils';
import { useAuthStore } from '../../stores/authStore';
import { useIgnoreStore } from '../../stores/ignoreStore';
import { useReadStatusStore } from '../../stores/readStatusStore';

// Storeをモック
vi.mock('../../stores/authStore');
vi.mock('../../stores/ignoreStore');
vi.mock('../../stores/readStatusStore');
vi.mock('../../stores/toastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
    toasts: [],
    removeToast: vi.fn(),
  })),
}));

// Apollo Clientのクエリをモック
const mockQuery = {
  loading: false,
  error: null,
  data: {
    rateLimit: {
      limit: 5000,
      remaining: 4800,
      used: 200,
      cost: 1,
      resetAt: '2024-01-01T01:00:00Z',
    },
    authored: { nodes: [mockPullRequest] },
    assigned: { nodes: [] },
    mentions: { nodes: [] },
    reviewRequested: { nodes: [mockPullRequestWithConflict] },
  },
  refetch: vi.fn().mockResolvedValue({}),
};

vi.mock('@apollo/client/react', async importOriginal => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: vi.fn(() => mockQuery),
}));

// Tauri APIをモック
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}));

// Tauri Window APIをモック
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    outerPosition: vi.fn().mockResolvedValue({ x: 100, y: 100 }),
    outerSize: vi.fn().mockResolvedValue({ width: 1200, height: 800 }),
    onFocusChanged: vi.fn().mockResolvedValue(() => {}),
  })),
}));

// Tauri WebViewWindow APIをモック
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: vi.fn().mockImplementation(() => ({
    once: vi.fn(),
    show: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('PullRequestsPage', () => {
  const mockUser = {
    login: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://github.com/testuser.png',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのストアモック
    (useAuthStore as any).mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    });

    (useIgnoreStore as any).mockReturnValue({
      isIgnored: vi.fn(() => false),
      addIgnoredPR: vi.fn(),
      ignoredPRIds: new Set(),
    });

    (useReadStatusStore as any).mockReturnValue({
      isUnread: vi.fn(() => true),
      markAsRead: vi.fn(),
      getUnreadCount: vi.fn(() => 2),
    });
  });

  describe('基本レンダリング', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      render(<PullRequestsPage />);

      expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    });

    it('ローディング状態が正しく表示される', () => {
      // ローディング状態をモック
      (vi.mocked(mockQuery) as any).loading = true;
      (vi.mocked(mockQuery) as any).data = null;

      render(<PullRequestsPage />);

      expect(screen.getByText(/Loading pull requests/)).toBeInTheDocument();
    });

    it('データが無いままエラーになったら全画面エラーと再試行ボタンを出す', () => {
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = new Error('Network error');
      (vi.mocked(mockQuery) as any).data = null;

      render(<PullRequestsPage />);

      expect(
        screen.getByText(/PR一覧の取得に失敗しました/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '再試行' })
      ).toBeInTheDocument();
    });
  });

  describe('データありの状態', () => {
    beforeEach(() => {
      // 正常状態にリセット
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = null;
      (vi.mocked(mockQuery) as any).data = {
        rateLimit: {
          limit: 5000,
          remaining: 4800,
          used: 200,
          cost: 1,
          resetAt: '2024-01-01T01:00:00Z',
        },
        authored: { nodes: [mockPullRequest] },
        assigned: { nodes: [] },
        mentions: { nodes: [] },
        reviewRequested: { nodes: [mockPullRequestWithConflict] },
      };
    });

    it('PRが表示される', () => {
      render(<PullRequestsPage />);

      expect(screen.getByText('Test PR Title')).toBeInTheDocument();
      expect(screen.getByText('Conflicted PR')).toBeInTheDocument();
    });

    it('レート制限情報が表示される', () => {
      render(<PullRequestsPage />);

      expect(screen.getByText(/4800\/5000/)).toBeInTheDocument();
    });

    it('未読カウントが表示される', () => {
      render(<PullRequestsPage />);

      expect(screen.getByText(/未読 2/)).toBeInTheDocument();
    });
  });

  describe('空の状態', () => {
    beforeEach(() => {
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = null;
      (vi.mocked(mockQuery) as any).data = {
        rateLimit: {
          limit: 5000,
          remaining: 4800,
          used: 200,
          cost: 1,
          resetAt: '2024-01-01T01:00:00Z',
        },
        authored: { nodes: [] },
        assigned: { nodes: [] },
        mentions: { nodes: [] },
        reviewRequested: { nodes: [] },
      };
    });

    it('PRが存在しない場合の表示', () => {
      render(<PullRequestsPage />);

      expect(screen.getByText('該当するPRはありません')).toBeInTheDocument();
    });
  });

  describe('エラー時の非ブロッキング表示', () => {
    const dataWithPR = {
      rateLimit: {
        limit: 5000,
        remaining: 4800,
        used: 200,
        cost: 1,
        resetAt: '2024-01-01T01:00:00Z',
      },
      authored: { nodes: [mockPullRequest] },
      assigned: { nodes: [] },
      mentions: { nodes: [] },
      reviewRequested: { nodes: [] },
    };

    it('データがあるエラーでは一覧を残してバナーを出す', () => {
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = {
        kind: 'transport',
        message: 'stream no longer needed',
        name: 'GraphQLRequestError',
      };
      (vi.mocked(mockQuery) as any).data = dataWithPR;

      render(<PullRequestsPage />);

      expect(screen.getByText('Test PR Title')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(
        'PR一覧の更新に失敗しました'
      );
    });

    it('401 はデータがあっても全画面にして再ログインへ誘導する', () => {
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = {
        kind: 'http',
        status: 401,
        message: 'Bad credentials',
        name: 'GraphQLRequestError',
      };
      (vi.mocked(mockQuery) as any).data = dataWithPR;

      render(<PullRequestsPage />);

      expect(screen.queryByText('Test PR Title')).not.toBeInTheDocument();
      expect(screen.getByText(/認証に失敗しました/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'ログアウトして再ログイン' })
      ).toBeInTheDocument();
    });

    // Apollo はポーリング開始時に error を一旦 undefined にする。
    // バナーがそれで消えると毎分チラつくので、loading 中は保持する
    it('ポーリング再開 (loading 中) でもバナーが消えない', () => {
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = {
        kind: 'timeout',
        message: 'timed out',
        name: 'GraphQLRequestError',
      };
      (vi.mocked(mockQuery) as any).data = dataWithPR;

      const { rerender } = render(<PullRequestsPage />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      (vi.mocked(mockQuery) as any).loading = true;
      (vi.mocked(mockQuery) as any).error = null;
      rerender(<PullRequestsPage />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('取得に成功したらバナーが消える', () => {
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = {
        kind: 'timeout',
        message: 'timed out',
        name: 'GraphQLRequestError',
      };
      (vi.mocked(mockQuery) as any).data = dataWithPR;

      const { rerender } = render(<PullRequestsPage />);
      expect(screen.getByRole('alert')).toBeInTheDocument();

      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = null;
      rerender(<PullRequestsPage />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
