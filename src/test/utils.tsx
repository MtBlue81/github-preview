import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';

// テスト用のApollo Clientプロバイダーラッパー
interface TestProvidersProps {
  children: React.ReactNode;
  mocks?: MockedResponse[];
}

function TestProviders({ children, mocks = [] }: TestProvidersProps) {
  return (
    <BrowserRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    </BrowserRouter>
  );
}

// カスタムrender関数
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[];
}

const customRender = (ui: ReactElement, options: CustomRenderOptions = {}) => {
  const { mocks, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders mocks={mocks}>{children}</TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// テスト用のモックデータ
export const mockPullRequest = {
  id: 'PR_123',
  number: 123,
  title: 'Test PR Title',
  url: 'https://github.com/test/repo/pull/123',
  state: 'OPEN' as const,
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
    totalCount: 5,
    nodes: [],
  },
  comments: {
    totalCount: 2,
  },
  reviews: {
    totalCount: 1,
  },
  labels: {
    nodes: [
      { name: 'bug', color: 'ff0000' },
      { name: 'frontend', color: '00ff00' },
    ],
  },
  mergeable: 'MERGEABLE' as const,
};

export const mockPullRequestWithConflict = {
  ...mockPullRequest,
  id: 'PR_456',
  number: 456,
  title: 'Conflicted PR',
  mergeable: 'CONFLICTING' as const,
};

export const mockRateLimit = {
  limit: 5000,
  remaining: 4800,
  used: 200,
  cost: 1,
  resetAt: '2024-01-01T01:00:00Z',
};

// re-export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// デフォルトのrender関数をオーバーライド
export { customRender as render };
