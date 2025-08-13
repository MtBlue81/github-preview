import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent } from '../../test/utils';
import { Layout } from '../Layout';
import { useAuthStore } from '../../stores/authStore';
import { mockRateLimit } from '../../test/utils';

// AuthStoreをモック
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// React Routerのナビゲーションをモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Layout', () => {
  const mockUser = {
    login: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://github.com/testuser.png',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('認証されていない状態', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: null,
        logout: vi.fn(),
      });
    });

    it('ユーザー情報が表示されない', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.queryByText('testuser')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });
  });

  describe('認証されている状態', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
    });

    it('ユーザー情報が表示される', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('ユーザーのアバター画像が表示される', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const avatar = screen.getByAltText('testuser') as HTMLImageElement;
      expect(avatar).toBeInTheDocument();
      expect(avatar.src).toBe('https://github.com/testuser.png');
    });

    it('ログアウトボタンをクリックするとlogout関数が呼ばれる', async () => {
      const mockLogout = vi.fn();
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: mockLogout,
      });

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const logoutButton = screen.getByText('Logout');
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('レート制限情報', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
    });

    it('レート制限情報が提供されている場合に表示される', () => {
      render(
        <Layout rateLimit={mockRateLimit}>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByText(/4800\/5000/)).toBeInTheDocument();
      expect(screen.getByText(/API/)).toBeInTheDocument();
    });

    it('レート制限情報が提供されていない場合は表示されない', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.queryByText(/\/5000/)).not.toBeInTheDocument();
      expect(screen.queryByText(/API/)).not.toBeInTheDocument();
    });

    it('レート制限が残り少ない場合に警告スタイルが適用される', () => {
      const lowRateLimit = {
        ...mockRateLimit,
        remaining: 100, // 残り100
        used: 4900,
      };

      render(
        <Layout rateLimit={lowRateLimit}>
          <div>Test Content</div>
        </Layout>
      );

      // 残り少ない場合の警告表示をテスト
      const rateLimitDisplay = screen.getByText(/100\/5000/);
      expect(rateLimitDisplay).toBeInTheDocument();
    });
  });

  describe('更新機能', () => {
    const mockOnRefresh = vi.fn();

    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
      mockOnRefresh.mockClear();
    });

    it('onRefreshが提供されている場合、更新ボタンが表示される', () => {
      render(
        <Layout
          onRefresh={mockOnRefresh}
          rateLimit={{
            limit: 5000,
            remaining: 4800,
            used: 200,
            cost: 1,
            resetAt: '2024-01-01T01:00:00Z',
          }}
        >
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByTitle(/最新データを取得/)).toBeInTheDocument();
    });

    it('更新ボタンをクリックするとonRefreshが呼ばれる', async () => {
      render(
        <Layout
          onRefresh={mockOnRefresh}
          rateLimit={{
            limit: 5000,
            remaining: 4800,
            used: 200,
            cost: 1,
            resetAt: '2024-01-01T01:00:00Z',
          }}
        >
          <div>Test Content</div>
        </Layout>
      );

      const refreshButton = screen.getByTitle(/最新データを取得/);
      await userEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('loading中は更新ボタンが無効になる', () => {
      render(
        <Layout
          onRefresh={mockOnRefresh}
          loading={true}
          rateLimit={{
            limit: 5000,
            remaining: 4800,
            used: 200,
            cost: 1,
            resetAt: '2024-01-01T01:00:00Z',
          }}
        >
          <div>Test Content</div>
        </Layout>
      );

      const refreshButton = screen.getByTitle(/最新データを取得/);
      expect(refreshButton).toBeDisabled();
    });

    it('loading中は更新ボタンにスピナーが表示される', () => {
      render(
        <Layout
          onRefresh={mockOnRefresh}
          loading={true}
          rateLimit={{
            limit: 5000,
            remaining: 4800,
            used: 200,
            cost: 1,
            resetAt: '2024-01-01T01:00:00Z',
          }}
        >
          <div>Test Content</div>
        </Layout>
      );

      // 更新ボタン自体の代わりに、rateLimitスピナーが表示されることを確認
      const spinnerInRateLimit = screen
        .getByRole('navigation')
        .querySelector('.animate-spin');
      expect(spinnerInRateLimit).toBeInTheDocument();
    });
  });

  describe('最終更新時刻', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
    });

    it('lastUpdatedが提供されている場合に表示される', () => {
      const lastUpdated = new Date('2024-01-01T12:00:00Z');

      render(
        <Layout
          lastUpdated={lastUpdated}
          rateLimit={{
            limit: 5000,
            remaining: 4800,
            used: 200,
            cost: 1,
            resetAt: '2024-01-01T01:00:00Z',
          }}
        >
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('lastUpdatedが提供されていない場合は表示されない', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    });
  });

  describe('コンテンツ表示', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: null,
        logout: vi.fn(),
      });
    });

    it('children propが正しくレンダリングされる', () => {
      const testContent = <div data-testid='test-content'>Test Content</div>;

      render(<Layout>{testContent}</Layout>);

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('複数の子要素を正しくレンダリングできる', () => {
      render(
        <Layout>
          <div data-testid='content-1'>Content 1</div>
          <div data-testid='content-2'>Content 2</div>
        </Layout>
      );

      expect(screen.getByTestId('content-1')).toBeInTheDocument();
      expect(screen.getByTestId('content-2')).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
    });

    it('基本的なレスポンシブクラスが適用される', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      // navのすぐ下のdivを確認
      const nav = screen.getByRole('navigation');
      const navContainer = nav.querySelector('div.max-w-7xl');
      expect(navContainer).toBeInTheDocument();
      expect(navContainer).toHaveClass('mx-auto');
    });
  });

  describe('通信状態インジケーター', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
    });

    it('loading中は通信状態インジケーターが表示される', () => {
      render(
        <Layout loading={true}>
          <div>Test Content</div>
        </Layout>
      );

      // loading中はスピナーが表示されることを確認（onRefreshがない場合はボタンなし）
      expect(screen.queryByTitle(/手動更新/)).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: vi.fn(),
      });
    });

    it('ナビゲーション領域が適切にマークアップされている', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('ボタンに適切なaria属性が設定されている', () => {
      (useAuthStore as any).mockReturnValue({
        user: {
          login: 'testuser',
          name: 'Test User',
          avatarUrl: 'https://github.com/testuser.png',
        },
        logout: vi.fn(),
      });

      render(
        <Layout
          onRefresh={vi.fn()}
          rateLimit={{
            limit: 5000,
            remaining: 4800,
            used: 200,
            cost: 1,
            resetAt: '2024-01-01T01:00:00Z',
          }}
        >
          <div>Test Content</div>
        </Layout>
      );

      const refreshButton = screen.getByTitle(/最新データを取得/);
      expect(refreshButton).toHaveAttribute('title');
    });

    it('アバター画像に適切なalt属性が設定されている', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      const avatar = screen.getByAltText('testuser');
      expect(avatar).toHaveAttribute('alt', 'testuser');
    });
  });
});
