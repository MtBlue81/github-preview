import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useAuthStore } from '../stores/authStore';

const httpLink = createHttpLink({
  uri: 'https://api.github.com/graphql',
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
  link: ApolloLink.from([loggingLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});