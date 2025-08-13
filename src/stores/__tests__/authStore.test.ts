import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // 各テスト前にストアの状態をリセット
    const store = useAuthStore.getState();
    store.logout();
    useAuthStore.setState({ token: null, user: null });
  });

  describe('初期状態', () => {
    it('初期状態ではtokenとuserがnull', () => {
      const { token, user } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
    });
  });

  describe('setToken', () => {
    it('トークンを正常に設定できる', () => {
      const testToken = 'test-token-123';
      useAuthStore.getState().setToken(testToken);

      const { token } = useAuthStore.getState();
      expect(token).toBe(testToken);
    });

    it('トークンをnullに設定できる', () => {
      // 一度トークンを設定
      useAuthStore.getState().setToken('test-token');
      // nullに設定
      useAuthStore.getState().setToken(null);

      const { token } = useAuthStore.getState();
      expect(token).toBeNull();
    });
  });

  describe('setUser', () => {
    it('ユーザー情報を正常に設定できる', () => {
      const testUser = {
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://github.com/testuser.png',
      };

      useAuthStore.getState().setUser(testUser);

      const { user } = useAuthStore.getState();
      expect(user).toEqual(testUser);
    });

    it('ユーザー情報をnullに設定できる', () => {
      // 一度ユーザーを設定
      const testUser = {
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://github.com/testuser.png',
      };
      useAuthStore.getState().setUser(testUser);

      // nullに設定
      useAuthStore.getState().setUser(null);

      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });
  });

  describe('logout', () => {
    it('ログアウト時にtokenとuserが両方ともnullになる', () => {
      const testToken = 'test-token-123';
      const testUser = {
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://github.com/testuser.png',
      };

      // 認証情報を設定
      useAuthStore.getState().setToken(testToken);
      useAuthStore.getState().setUser(testUser);

      // ログアウト実行
      useAuthStore.getState().logout();

      const { token, user } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
    });
  });

  describe('永続化', () => {
    it('localStorageに状態が保存される', () => {
      const testToken = 'persistent-token';
      const testUser = {
        login: 'persistentuser',
        name: 'Persistent User',
        avatarUrl: 'https://github.com/persistentuser.png',
      };

      useAuthStore.getState().setToken(testToken);
      useAuthStore.getState().setUser(testUser);

      // LocalStorageに保存されていることを確認
      const stored = localStorage.getItem('github-auth');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.token).toBe(testToken);
        expect(parsedStored.state.user).toEqual(testUser);
      }
    });

    it('ログアウト時にlocalStorageからも削除される', () => {
      // 認証情報を設定
      useAuthStore.getState().setToken('test-token');
      useAuthStore.getState().setUser({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://github.com/testuser.png',
      });

      // LocalStorageに保存されていることを確認
      expect(localStorage.getItem('github-auth')).toBeTruthy();

      // ログアウト実行
      useAuthStore.getState().logout();

      // LocalStorageの状態を確認
      const stored = localStorage.getItem('github-auth');
      if (stored) {
        const parsedStored = JSON.parse(stored);
        expect(parsedStored.state.token).toBeNull();
        expect(parsedStored.state.user).toBeNull();
      }
    });
  });

  describe('複数の操作の組み合わせ', () => {
    it('トークンだけ設定してからユーザー情報を設定', () => {
      const testToken = 'token-first';
      const testUser = {
        login: 'userafter',
        name: 'User After Token',
        avatarUrl: 'https://github.com/userafter.png',
      };

      // トークンを先に設定
      useAuthStore.getState().setToken(testToken);
      expect(useAuthStore.getState().token).toBe(testToken);
      expect(useAuthStore.getState().user).toBeNull();

      // ユーザー情報を後で設定
      useAuthStore.getState().setUser(testUser);
      expect(useAuthStore.getState().token).toBe(testToken);
      expect(useAuthStore.getState().user).toEqual(testUser);
    });

    it('ユーザー情報だけ設定してからトークンを設定', () => {
      const testToken = 'token-after';
      const testUser = {
        login: 'userfirst',
        name: 'User First',
        avatarUrl: 'https://github.com/userfirst.png',
      };

      // ユーザー情報を先に設定
      useAuthStore.getState().setUser(testUser);
      expect(useAuthStore.getState().user).toEqual(testUser);
      expect(useAuthStore.getState().token).toBeNull();

      // トークンを後で設定
      useAuthStore.getState().setToken(testToken);
      expect(useAuthStore.getState().user).toEqual(testUser);
      expect(useAuthStore.getState().token).toBe(testToken);
    });
  });
});
