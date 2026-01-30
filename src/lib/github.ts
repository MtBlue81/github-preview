import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  from,
  Observable,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { setContext } from '@apollo/client/link/context';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../stores/authStore';

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
    throw new Error(String(error));
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
const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      for (const err of graphQLErrors) {
        console.error(
          `[GraphQL error]: Message: ${err.message}, Location: ${JSON.stringify(err.locations)}, Path: ${err.path}`
        );

        // GitHub APIの一時的なエラーの場合はリトライ
        if (isRetryableGraphQLError(err.message)) {
          const retryCount =
            (operation.getContext().retryCount as number) || 0;
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
    }
    if (networkError) {
      if (networkError.name === 'AbortError') {
        console.error(
          `[Network error]: Request timeout for operation ${operation.operationName}`
        );
      } else {
        console.error(`[Network error]: ${networkError.message}`);
      }
    }
    return;
  }
);

// リトライ可能なネットワークエラーかどうかを判定
const isRetryableNetworkError = (error: Error): boolean => {
  const message = error.message || '';
  return (
    error.name === 'AbortError' ||
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.includes('timeout') ||
    message.includes('HTTP 502') ||
    message.includes('HTTP 503') ||
    message.includes('HTTP 504') ||
    message.includes('Bad Gateway') ||
    message.includes('Service Unavailable') ||
    message.includes('Gateway Timeout')
  );
};

// リトライリンク（ネットワークエラー時に自動リトライ）
const retryLink = new RetryLink({
  delay: {
    initial: 1000,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: error => {
      if (!error) return false;
      const shouldRetry = isRetryableNetworkError(error);
      if (shouldRetry) {
        console.log(`[Network retry]: Will retry due to: ${error.message?.substring(0, 100)}`);
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

  return forward(operation).map(response => {
    console.log('GraphQL Response:', response);
    return response;
  });
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
