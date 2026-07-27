import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  from,
  Observable,
  CombinedGraphQLErrors,
} from '@apollo/client';
import { map } from 'rxjs';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../stores/authStore';

// graphql_request コマンド (src-tauri/src/lib.rs の RequestError) が返すエラー。
// メッセージ文字列ではなく kind / status で判定することで、
// h2 や hyper の文言変更でリトライ判定が黙って壊れるのを防ぐ
type RequestErrorKind = 'timeout' | 'transport' | 'http' | 'client';

type RequestErrorPayload = {
  kind: RequestErrorKind;
  message: string;
  status?: number;
};

const REQUEST_ERROR_KINDS: readonly string[] = [
  'timeout',
  'transport',
  'http',
  'client',
];

const isRequestErrorPayload = (
  value: unknown
): value is RequestErrorPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RequestErrorPayload>;
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.kind === 'string' &&
    REQUEST_ERROR_KINDS.includes(candidate.kind)
  );
};

class GraphQLRequestError extends Error {
  readonly kind: RequestErrorKind;
  readonly status?: number;

  constructor(payload: RequestErrorPayload) {
    super(payload.message, { cause: payload });
    this.name = 'GraphQLRequestError';
    this.kind = payload.kind;
    this.status = payload.status;
  }
}

// Apollo がエラーを包み直すケースに備えて cause も辿る
const readRequestError = (error: unknown): RequestErrorPayload | null => {
  if (error instanceof GraphQLRequestError) {
    return { kind: error.kind, message: error.message, status: error.status };
  }
  if (isRequestErrorPayload(error)) return error;
  const cause = (error as { cause?: unknown } | null | undefined)?.cause;
  if (isRequestErrorPayload(cause)) return cause;
  return null;
};

// Tauriカスタムコマンドを使用したfetch（CORSを回避）
const fetchWithTauri = async (
  uri: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> => {
  const url = typeof uri === 'string' ? uri : uri.toString();

  try {
    // headersをRecord<string, string>に変換
    const headers: Record<string, string> = {};
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    const responseText = await invoke<string>('graphql_request', {
      url,
      body: options?.body as string,
      headers,
    });

    // Apollo Client互換のResponseオブジェクトを返す
    return new Response(responseText, {
      status: 200,
      statusText: 'OK',
    });
  } catch (error) {
    console.error('[Tauri HTTP] Fetch error:', error);
    if (isRequestErrorPayload(error)) {
      throw new GraphQLRequestError(error);
    }
    throw new Error(String(error), { cause: error });
  }
};

const httpLink = createHttpLink({
  uri: 'https://api.github.com/graphql',
  fetch: fetchWithTauri,
});

// GitHub APIの一時的なエラーかどうかを判定
const isRetryableGraphQLError = (message: string): boolean => {
  return (
    message.includes('Something went wrong while executing your query') ||
    message.includes('timedout') ||
    message.includes('timeout') ||
    message.includes('INTERNAL_ERROR')
  );
};

// エラーハンドリングリンク（リトライ機能付き）
const errorLink = onError(({ error, operation, forward }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      console.error(
        `[GraphQL error]: Message: ${err.message}, Location: ${JSON.stringify(err.locations)}, Path: ${err.path}`
      );

      // GitHub APIの一時的なエラーの場合はリトライ
      if (isRetryableGraphQLError(err.message)) {
        const retryCount = (operation.getContext().retryCount as number) || 0;
        if (retryCount < 3) {
          console.log(
            `[GraphQL retry]: Retrying operation ${operation.operationName} (attempt ${retryCount + 1}/3)`
          );
          operation.setContext({ retryCount: retryCount + 1 });
          // 1-3秒のランダム遅延後にリトライ
          return new Observable(observer => {
            const delay = 1000 + Math.random() * 2000;
            setTimeout(() => {
              forward(operation).subscribe(observer);
            }, delay);
          });
        }
      }
    }
  } else if (error.name === 'AbortError') {
    console.error(
      `[Network error]: Request timeout for operation ${operation.operationName}`
    );
  } else {
    console.error(`[Network error]: ${error.message}`);
  }
  return;
});

const RETRYABLE_HTTP_STATUS = new Set([502, 503, 504]);

// リトライ可能なネットワークエラーかどうかを判定
const isRetryableNetworkError = (error: Error): boolean => {
  const requestError = readRequestError(error);
  if (requestError) {
    switch (requestError.kind) {
      // GitHub 側が h2 ストリームを切った場合などが transport。
      // 接続の使い回しで避けられないため、リトライで吸収する
      case 'transport':
      case 'timeout':
        return true;
      case 'http':
        return (
          requestError.status !== undefined &&
          RETRYABLE_HTTP_STATUS.has(requestError.status)
        );
      case 'client':
        return false;
    }
  }

  // graphql_request を経由しないエラー (IPC 自体の失敗など) は文字列で判定するしかない
  const message = error.message || '';
  return (
    error.name === 'AbortError' ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('timeout')
  );
};

// mutation はサーバ側で実行済みの可能性があるためリトライしない。
// transport エラーはボディ受信中にも起きるので、再送すると二重実行になる
const isMutation = (operation: ApolloLink.Operation): boolean =>
  operation.query.definitions.some(
    definition =>
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'mutation'
  );

// リトライリンク（ネットワークエラー時に自動リトライ）
const retryLink = new RetryLink({
  delay: {
    initial: 1000,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, operation) => {
      if (!error) return false;
      if (isMutation(operation)) return false;
      const shouldRetry = isRetryableNetworkError(error);
      if (shouldRetry) {
        console.log(
          `[Network retry]: Will retry due to: ${error.message?.substring(0, 100)}`
        );
      }
      return shouldRetry;
    },
  },
});

const authLink = setContext((_, { headers }) => {
  const token = useAuthStore.getState().token;
  return {
    headers: {
      ...headers,
      authorization: token ? `bearer ${token}` : '',
    },
  };
});

// デバッグ用のロギングリンク
const loggingLink = new ApolloLink((operation, forward) => {
  console.log('GraphQL Request:', {
    operationName: operation.operationName,
    variables: operation.variables,
    headers: operation.getContext().headers,
  });

  return forward(operation).pipe(
    map(response => {
      console.log('GraphQL Response:', response);
      return response;
    })
  );
});

export const githubClient = new ApolloClient({
  link: from([errorLink, retryLink, loggingLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Repository: {
        keyFields: ['owner', 'name'],
      },
      PullRequest: {
        keyFields: ['id'],
      },
    },
  }),
});

// ログイン検証用のクライアント作成関数
export const createAuthTestClient = (token: string) => {
  const testAuthLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: `bearer ${token}`,
      },
    };
  });

  return new ApolloClient({
    link: from([errorLink, retryLink, loggingLink, testAuthLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Repository: {
          keyFields: ['owner', 'name'],
        },
        PullRequest: {
          keyFields: ['id'],
        },
      },
    }),
  });
};
