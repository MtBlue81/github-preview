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

vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(() => mockQuery),
  gql: vi.fn(),
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

    it('エラー状態が正しく表示される', () => {
      // エラー状態をモック
      (vi.mocked(mockQuery) as any).loading = false;
      (vi.mocked(mockQuery) as any).error = new Error('Network error');
      (vi.mocked(mockQuery) as any).data = null;

      render(<PullRequestsPage />);

      expect(screen.getByText(/Error/)).toBeInTheDocument();
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
});
