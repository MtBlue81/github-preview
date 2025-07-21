import { useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { GET_PULL_REQUESTS } from '../lib/queries';
import { PullRequest } from '../types/github';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

interface PRGroup {
  title: string;
  icon: string;
  pullRequests: PullRequest[];
}

export function PullRequestsPage() {
  const { user } = useAuthStore();
  const { setAllPullRequests, setCurrentPR } = useNavigationStore();
  
  // 複数のクエリを並列実行
  const authorQuery = useQuery(GET_PULL_REQUESTS, {
    variables: { query: `is:pr is:open author:${user?.login}` },
    pollInterval: 60000,
  });
  
  const assigneeQuery = useQuery(GET_PULL_REQUESTS, {
    variables: { query: `is:pr is:open assignee:${user?.login}` },
    pollInterval: 60000,
  });
  
  const mentionsQuery = useQuery(GET_PULL_REQUESTS, {
    variables: { query: `is:pr is:open mentions:${user?.login}` },
    pollInterval: 60000,
  });
  
  const reviewRequestedQuery = useQuery(GET_PULL_REQUESTS, {
    variables: { query: `is:pr is:open review-requested:${user?.login}` },
    pollInterval: 60000,
  });

  const loading = authorQuery.loading || assigneeQuery.loading || mentionsQuery.loading || reviewRequestedQuery.loading;
  const error = authorQuery.error || assigneeQuery.error || mentionsQuery.error || reviewRequestedQuery.error;

  // PRをIDでユニークにする関数
  const getUniquePRs = useCallback((prs: PullRequest[]): PullRequest[] => {
    const seen = new Set<string>();
    return prs.filter(pr => {
      if (seen.has(pr.id)) return false;
      seen.add(pr.id);
      return true;
    });
  }, []);

  const groups: PRGroup[] = useMemo(() => [
    {
      title: '作成したPR',
      icon: '✏️',
      pullRequests: getUniquePRs(authorQuery.data?.search?.nodes?.filter(Boolean) || []),
    },
    {
      title: 'レビュー依頼',
      icon: '👀',
      pullRequests: getUniquePRs(reviewRequestedQuery.data?.search?.nodes?.filter(Boolean) || []),
    },
    {
      title: 'アサインされたPR',
      icon: '📌',
      pullRequests: getUniquePRs(assigneeQuery.data?.search?.nodes?.filter(Boolean) || []),
    },
    {
      title: 'メンションされたPR',
      icon: '💬',
      pullRequests: getUniquePRs(mentionsQuery.data?.search?.nodes?.filter(Boolean) || []),
    },
  ], [authorQuery.data, reviewRequestedQuery.data, assigneeQuery.data, mentionsQuery.data]);

  const totalPRs = groups.reduce((sum, group) => sum + group.pullRequests.length, 0);
  
  // 全PRのフラットなリストを作成（useMemoで最適化）
  const allPRs = useMemo(() => {
    return groups.flatMap(group => group.pullRequests);
  }, [groups]);
  
  // PRリストが更新されたらナビゲーションストアに保存
  useEffect(() => {
    if (allPRs.length > 0) {
      setAllPullRequests(allPRs);
    }
  }, [allPRs, setAllPullRequests]);

  // 早期リターンはすべてのフックの後に配置
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading pull requests...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-red-600">Error: {error.message}</div>
        </div>
      </Layout>
    );
  }

  const renderPRItem = (pr: PullRequest) => (
    <Link
      key={pr.id}
      to={`/pr/${pr.repository.owner.login}/${pr.repository.name}/${pr.number}`}
      className="block hover:bg-gray-50 px-4 py-3 border-b last:border-b-0"
      onClick={() => setCurrentPR(pr)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {pr.isDraft && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Draft
              </span>
            )}
            <h4 className="text-sm font-medium text-gray-900 truncate">{pr.title}</h4>
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {pr.repository.owner.login}/{pr.repository.name} #{pr.number}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <img
                className="w-4 h-4 rounded-full"
                src={pr.author.avatarUrl}
                alt={pr.author.login}
              />
              {pr.author.login}
            </span>
            <span>{formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}</span>
            <span>{pr.commits.totalCount} commits</span>
            <span>{pr.comments.totalCount + pr.reviews.totalCount} comments</span>
          </div>
        </div>
        <div className="ml-2 flex-shrink-0">
          {pr.reviewDecision === 'APPROVED' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Approved
            </span>
          )}
          {pr.reviewDecision === 'CHANGES_REQUESTED' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Changes
            </span>
          )}
        </div>
      </div>
      {pr.labels.nodes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {pr.labels.nodes.map((label) => (
            <span
              key={label.name}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `#${label.color}`,
                color: parseInt(label.color, 16) > 0xffffff / 2 ? '#000' : '#fff',
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
          <p className="mt-1 text-sm text-gray-600">
            {totalPRs} 件のオープンなPRがあります
          </p>
        </div>

        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.title} className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <span className="text-lg">{group.icon}</span>
                  {group.title}
                </h2>
                <span className="text-sm text-gray-500">{group.pullRequests.length}件</span>
              </div>
              {group.pullRequests.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {group.pullRequests.map(renderPRItem)}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  該当するPRはありません
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}