import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { CombinedGraphQLErrors, gql } from '@apollo/client';
import { githubClient, createAuthTestClient, classifyError } from '../github';
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

  // 本アプリの「エラー時も一覧を出し続ける」設計は、Apollo が
  // ネットワークエラー時に前回の data を保持することに依存している。
  // Apollo のバージョンアップで前提が壊れたら気付けるように固定する。
  describe('ネットワークエラー時の data 保持 (設計前提の固定)', () => {
    // client kind はリトライ対象外 (isRetryableNetworkError) なので
    // RetryLink のバックオフを待たずにエラーが確定する
    const CLIENT_ERROR = {
      kind: 'client',
      message: 'invoke failed',
    };

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('refetch が失敗しても直前に取得した data は保持される', async () => {
      let attempts = 0;
      mockIPC(cmd => {
        if (cmd === 'graphql_request') {
          attempts += 1;
          if (attempts === 1) {
            return Promise.resolve(VIEWER_RESPONSE);
          }
          return Promise.reject(CLIENT_ERROR);
        }
        return Promise.resolve();
      });

      const client = createAuthTestClient('test-token');
      const observable = client.watchQuery({
        query: GET_VIEWER,
        notifyOnNetworkStatusChange: true,
      });

      const results: Array<{
        data?: { viewer: { login: string } };
        error?: unknown;
      }> = [];
      const subscription = observable.subscribe(result => {
        results.push(result as (typeof results)[number]);
      });

      await vi.waitFor(() => {
        expect(results.at(-1)?.data?.viewer.login).toBe('testuser');
      });

      await expect(observable.refetch()).rejects.toThrow();

      const last = results.at(-1);
      expect(last?.error).toBeDefined();
      expect(last?.data?.viewer.login).toBe('testuser');

      subscription.unsubscribe();
    });
  });

  describe('classifyError', () => {
    it('401 は auth (トークン失効なのでリトライしても直らない)', () => {
      expect(
        classifyError({ kind: 'http', message: 'Unauthorized', status: 401 })
      ).toBe('auth');
    });

    // GitHub は secondary rate limit で 403 / 429 を返す。
    // これを auth 扱いにすると一時的な流量制限で作業がブロックされ、
    // かつ不要なトークン再発行をユーザーに促してしまう
    it('403 は auth ではなく transient', () => {
      expect(
        classifyError({ kind: 'http', message: 'Forbidden', status: 403 })
      ).toBe('transient');
    });

    it('429 は transient', () => {
      expect(
        classifyError({
          kind: 'http',
          message: 'Too Many Requests',
          status: 429,
        })
      ).toBe('transient');
    });

    it('5xx は transient', () => {
      expect(
        classifyError({ kind: 'http', message: 'Bad Gateway', status: 502 })
      ).toBe('transient');
      expect(
        classifyError({ kind: 'http', message: 'Server Error', status: 500 })
      ).toBe('transient');
    });

    it('404 のような回復しない 4xx は unknown', () => {
      expect(
        classifyError({ kind: 'http', message: 'Not Found', status: 404 })
      ).toBe('unknown');
    });

    it('timeout と transport は transient', () => {
      expect(classifyError({ kind: 'timeout', message: 'timed out' })).toBe(
        'transient'
      );
      expect(classifyError(TRANSPORT_ERROR)).toBe('transient');
    });

    it('client は unknown', () => {
      expect(classifyError({ kind: 'client', message: 'invoke failed' })).toBe(
        'unknown'
      );
    });

    it('cause チェーン経由の payload も分類できる', () => {
      const wrapped = new Error('wrapped', {
        cause: { kind: 'http', message: 'Unauthorized', status: 401 },
      });
      expect(classifyError(wrapped)).toBe('auth');
    });

    it('コントラクト外のエラーは unknown', () => {
      expect(classifyError(new Error('boom'))).toBe('unknown');
      expect(classifyError(null)).toBe('unknown');
    });

    it('Apollo 経由で実際に飛んできた 401 を auth と分類する', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      useAuthStore.getState().setToken('test-token');

      mockIPC(cmd => {
        if (cmd === 'graphql_request') {
          return Promise.reject({
            kind: 'http',
            message: 'HTTP 401: Bad credentials',
            status: 401,
          });
        }
        return Promise.resolve();
      });

      const caught = await githubClient
        .query({ query: GET_VIEWER, fetchPolicy: 'no-cache' })
        .then(() => null)
        .catch((e: unknown) => e);

      expect(caught).not.toBeNull();
      expect(classifyError(caught)).toBe('auth');

      vi.restoreAllMocks();
    });
  });
});
