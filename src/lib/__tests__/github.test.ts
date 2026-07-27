import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { CombinedGraphQLErrors, gql } from '@apollo/client';
import { githubClient, createAuthTestClient } from '../github';
import { GET_VIEWER } from '../queries';
import { useAuthStore } from '../../stores/authStore';

const VIEWER_RESPONSE = JSON.stringify({
  data: {
    viewer: {
      login: 'testuser',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    },
  },
});

// GitHub が h2 ストリームを RST_STREAM(CANCEL) で切ったときに
// graphql_request が返すエラー
const TRANSPORT_ERROR = {
  kind: 'transport',
  message:
    'error decoding response body for url (https://api.github.com/graphql): request or response body error: error reading a body from connection: stream error received: stream no longer needed',
};

const TEST_MUTATION = gql`
  mutation TestMutation {
    addComment(input: { subjectId: "x", body: "y" }) {
      clientMutationId
    }
  }
`;

describe('github (Apollo Client + Tauri invoke 連携)', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
    githubClient.clearStore();
  });

  afterEach(() => {
    clearMocks();
  });

  describe('graphql_request invoke', () => {
    it('Apollo クエリ実行で graphql_request コマンドが呼ばれる', async () => {
      useAuthStore.getState().setToken('test-token');

      const calls: Array<{ url: string; headers: Record<string, string> }> = [];
      mockIPC((cmd, args) => {
        if (cmd === 'graphql_request') {
          const a = args as {
            url: string;
            body: string;
            headers: Record<string, string>;
          };
          calls.push({ url: a.url, headers: a.headers });
          return Promise.resolve(
            JSON.stringify({
              data: {
                viewer: {
                  login: 'testuser',
                  name: 'Test User',
                  avatarUrl: 'https://example.com/avatar.png',
                },
              },
            })
          );
        }
        return Promise.resolve();
      });

      const result = await githubClient.query({
        query: GET_VIEWER,
        fetchPolicy: 'no-cache',
      });

      expect(result.data?.viewer.login).toBe('testuser');
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://api.github.com/graphql');
    });

    it('authStore の token が Authorization ヘッダに乗る', async () => {
      useAuthStore.getState().setToken('my-secret-token');

      const seenHeaders: Array<Record<string, string>> = [];
      mockIPC((cmd, args) => {
        if (cmd === 'graphql_request') {
          const a = args as { headers: Record<string, string> };
          seenHeaders.push(a.headers);
          return Promise.resolve(
            JSON.stringify({
              data: {
                viewer: {
                  login: 'x',
                  name: 'x',
                  avatarUrl: 'x',
                },
              },
            })
          );
        }
        return Promise.resolve();
      });

      await githubClient.query({
        query: GET_VIEWER,
        fetchPolicy: 'no-cache',
      });

      expect(seenHeaders[0].authorization).toBe('bearer my-secret-token');
    });
  });

  describe('エラーハンドリング', () => {
    it('GraphQL エラーレスポンスは CombinedGraphQLErrors として伝播する', async () => {
      mockIPC((cmd, _args) => {
        if (cmd === 'graphql_request') {
          return Promise.resolve(
            JSON.stringify({
              errors: [
                {
                  message: 'Bad credentials',
                  path: ['viewer'],
                  locations: [{ line: 2, column: 3 }],
                },
              ],
            })
          );
        }
        return Promise.resolve();
      });

      await expect(
        githubClient.query({
          query: GET_VIEWER,
          fetchPolicy: 'no-cache',
        })
      ).rejects.toBeInstanceOf(CombinedGraphQLErrors);
    });

    it('invoke 失敗時はネットワークエラーとして伝播する', async () => {
      // invoke を例外で reject させる
      mockIPC((cmd, _args) => {
        if (cmd === 'graphql_request') {
          return Promise.reject(new Error('IPC failure'));
        }
        return Promise.resolve();
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        githubClient.query({
          query: GET_VIEWER,
          fetchPolicy: 'no-cache',
        })
      ).rejects.toThrow();

      errorSpy.mockRestore();
    });
  });

  describe('transport エラーのリトライ', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('query は transport エラーで再試行され、2回目で成功する', async () => {
      useAuthStore.getState().setToken('test-token');

      let attempts = 0;
      mockIPC((cmd, _args) => {
        if (cmd === 'graphql_request') {
          attempts += 1;
          if (attempts === 1) {
            return Promise.reject(TRANSPORT_ERROR);
          }
          return Promise.resolve(VIEWER_RESPONSE);
        }
        return Promise.resolve();
      });

      const result = await githubClient.query({
        query: GET_VIEWER,
        fetchPolicy: 'no-cache',
      });

      expect(attempts).toBe(2);
      expect(result.data?.viewer.login).toBe('testuser');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('mutation は transport エラーでも再試行しない (二重実行を避ける)', async () => {
      useAuthStore.getState().setToken('test-token');

      let attempts = 0;
      mockIPC((cmd, _args) => {
        if (cmd === 'graphql_request') {
          attempts += 1;
          return Promise.reject(TRANSPORT_ERROR);
        }
        return Promise.resolve();
      });

      await expect(
        githubClient.mutate({ mutation: TEST_MUTATION })
      ).rejects.toThrow();

      expect(attempts).toBe(1);
    });
  });

  describe('createAuthTestClient', () => {
    it('引数のtokenを Authorization ヘッダに使う (authStore は無視)', async () => {
      useAuthStore.getState().setToken('store-token');
      const testClient = createAuthTestClient('explicit-token');

      const seenHeaders: Array<Record<string, string>> = [];
      mockIPC((cmd, args) => {
        if (cmd === 'graphql_request') {
          const a = args as { headers: Record<string, string> };
          seenHeaders.push(a.headers);
          return Promise.resolve(
            JSON.stringify({
              data: {
                viewer: { login: 'x', name: 'x', avatarUrl: 'x' },
              },
            })
          );
        }
        return Promise.resolve();
      });

      await testClient.query({
        query: GET_VIEWER,
        fetchPolicy: 'no-cache',
      });

      expect(seenHeaders[0].authorization).toBe('bearer explicit-token');
    });
  });
});
