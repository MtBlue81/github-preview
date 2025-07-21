import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ALL_PULL_REQUESTS } from '../lib/queries';
import { PullRequest } from '../types/github';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useFocusStore } from '../stores/focusStore';
import { useIgnoreStore } from '../stores/ignoreStore';
import { useReadStatusStore } from '../stores/readStatusStore';
import { notificationService } from '../services/notificationService';
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
  const { lastFocusedPRId, clearLastFocusedPR } = useFocusStore();
  const { isIgnored, addIgnoredPR, ignoredPRIds } = useIgnoreStore();
  const { isUnread, markAsRead } = useReadStatusStore();

  // 統合クエリで一度にすべてのPRを取得
  const allPullRequestsQuery = useQuery(GET_ALL_PULL_REQUESTS, {
    variables: {
      authorQuery: `is:pr is:open author:${user?.login} sort:updated-desc`,
      assigneeQuery: `is:pr is:open assignee:${user?.login} sort:updated-desc`,
      mentionsQuery: `is:pr is:open mentions:${user?.login} sort:updated-desc`,
      reviewRequestedQuery: `is:pr is:open review-requested:${user?.login} sort:updated-desc`,
    },
    pollInterval: 60000,
  });

  const loading = allPullRequestsQuery.loading;
  const error = allPullRequestsQuery.error;

  // PRをIDでユニークにする関数（無視されたPRも除外）
  const getUniquePRs = useCallback(
    (prs: PullRequest[]): PullRequest[] => {
      const seen = new Set<string>();
      return prs.filter(pr => {
        if (seen.has(pr.id)) return false;
        // PR IDを owner:repo:number 形式で作成
        const prKey = `${pr.repository.owner.login}:${pr.repository.name}:${pr.number}`;
        if (isIgnored(prKey)) return false;
        seen.add(pr.id);
        return true;
      });
    },
    [isIgnored]
  );

  const groups: PRGroup[] = useMemo(
    () => [
      {
        title: 'メンションされたPR',
        icon: '💬',
        pullRequests: getUniquePRs(
          allPullRequestsQuery.data?.mentioned?.nodes?.filter(Boolean) || []
        ),
      },
      {
        title: 'アサインされたPR',
        icon: '📌',
        pullRequests: getUniquePRs(
          allPullRequestsQuery.data?.assigned?.nodes?.filter(Boolean) || []
        ),
      },
      {
        title: 'レビュー依頼',
        icon: '👀',
        pullRequests: getUniquePRs(
          allPullRequestsQuery.data?.reviewRequested?.nodes?.filter(Boolean) ||
            []
        ),
      },
      {
        title: '作成したPR',
        icon: '✏️',
        pullRequests: getUniquePRs(
          allPullRequestsQuery.data?.authored?.nodes?.filter(Boolean) || []
        ),
      },
    ],
    [
      getUniquePRs,
      allPullRequestsQuery.data?.authored?.nodes,
      allPullRequestsQuery.data?.reviewRequested?.nodes,
      allPullRequestsQuery.data?.assigned?.nodes,
      allPullRequestsQuery.data?.mentioned?.nodes,
      ignoredPRIds,
    ]
  );

  // 全PRのフラットなリストを作成（useMemoで最適化）
  const allPRs = useMemo(() => {
    return groups.flatMap(group => group.pullRequests);
  }, [groups]);

  // 以前のPRリストを保持
  const previousPRsRef = useRef<PullRequest[]>([]);
  const hasInitializedRef = useRef(false);

  // PRリストが更新されたらナビゲーションストアに保存し、新しい未読を検知
  useEffect(() => {
    if (allPRs.length > 0) {
      setAllPullRequests(allPRs);

      // 初回読み込み後、通知権限をリクエスト
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        notificationService.requestPermission();
      }

      // 差分検知（初回スキップ）
      if (previousPRsRef.current.length > 0) {
        // 新しい未読PRを検出
        const previousIds = new Set(previousPRsRef.current.map(pr => pr.id));
        const newUnreadPRs = allPRs.filter(
          pr => !previousIds.has(pr.id) && isUnread(pr.id, pr.updatedAt)
        );

        // 更新された未読PRを検出
        const updatedUnreadPRs = allPRs.filter(pr => {
          const prevPR = previousPRsRef.current.find(p => p.id === pr.id);
          return (
            prevPR &&
            new Date(pr.updatedAt) > new Date(prevPR.updatedAt) &&
            isUnread(pr.id, pr.updatedAt)
          );
        });

        // 通知を送信
        newUnreadPRs.forEach(pr => {
          notificationService.sendPRUpdateNotification(pr.title, 'new');
        });
        updatedUnreadPRs.forEach(pr => {
          notificationService.sendPRUpdateNotification(pr.title, 'updated');
        });
      }

      previousPRsRef.current = allPRs;
    }
  }, [allPRs, setAllPullRequests, isUnread]);

  // フォーカス復帰処理
  useEffect(() => {
    if (lastFocusedPRId && allPRs.length > 0) {
      const element = document.querySelector(
        `#pr-${lastFocusedPRId} > a`
      ) as HTMLAnchorElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
        clearLastFocusedPR();
      }
    }
  }, [lastFocusedPRId, clearLastFocusedPR, allPRs]);

  // 早期リターンはすべてのフックの後に配置
  if (loading) {
    return (
      <Layout loading={loading}>
        <div className='flex items-center justify-center h-screen'>
          <div className='text-lg'>Loading pull requests...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout loading={loading}>
        <div className='flex items-center justify-center h-screen'>
          <div className='text-red-600'>Error: {error.message}</div>
        </div>
      </Layout>
    );
  }

  const handleIgnorePR = (e: React.MouseEvent, pr: PullRequest): void => {
    e.preventDefault();
    e.stopPropagation();
    const prKey = `${pr.repository.owner.login}:${pr.repository.name}:${pr.number}`;
    addIgnoredPR(prKey);
  };

  const renderPRItem = (pr: PullRequest) => {
    const isItemUnread = isUnread(pr.id, pr.updatedAt);

    return (
      <div
        key={pr.id}
        id={`pr-${pr.id}`}
        className={`relative group hover:bg-gray-50 focus:bg-blue-50 ${
          isItemUnread ? 'bg-blue-50/30' : ''
        }`}
      >
        <Link
          to={`/pr/${pr.repository.owner.login}/${pr.repository.name}/${pr.number}`}
          className='block px-4 py-3 border-b last:border-b-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
          onClick={() => {
            setCurrentPR(pr);
            markAsRead(pr.id, pr.updatedAt);
          }}
        >
          <div className='flex items-start justify-between'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                {isItemUnread && (
                  <span
                    className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0'
                    title='未読'
                  ></span>
                )}
                {pr.isDraft && (
                  <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800'>
                    Draft
                  </span>
                )}
                <h4
                  className={`text-sm font-medium truncate ${
                    isItemUnread
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-900'
                  }`}
                >
                  {pr.title}
                </h4>
              </div>
              <div className='mt-1 text-xs text-gray-600'>
                {pr.repository.owner.login}/{pr.repository.name} #{pr.number}
              </div>
              <div className='mt-1 flex items-center gap-3 text-xs text-gray-500'>
                <span className='flex items-center gap-1'>
                  <img
                    className='w-4 h-4 rounded-full'
                    src={pr.author.avatarUrl}
                    alt={pr.author.login}
                  />
                  {pr.author.login}
                </span>
                <span>
                  {formatDistanceToNow(new Date(pr.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
                <span>{pr.commits.totalCount} commits</span>
                <span>
                  {pr.comments.totalCount + pr.reviews.totalCount} comments
                </span>
              </div>
            </div>
            <div className='ml-2 flex-shrink-0'>
              {pr.reviewDecision === 'APPROVED' && (
                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                  Approved
                </span>
              )}
              {pr.reviewDecision === 'CHANGES_REQUESTED' && (
                <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                  Changes
                </span>
              )}
            </div>
          </div>
          {pr.labels.nodes.length > 0 && (
            <div className='mt-2 flex flex-wrap gap-1'>
              {pr.labels.nodes.map(label => (
                <span
                  key={label.name}
                  className='inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium'
                  style={{
                    backgroundColor: `#${label.color}`,
                    color:
                      parseInt(label.color, 16) > 0xffffff / 2
                        ? '#000'
                        : '#fff',
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </Link>
        <button
          onClick={e => handleIgnorePR(e, pr)}
          className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-gray-200 hover:bg-red-200 text-gray-600 hover:text-red-700'
          title='このPRを無視する'
          tabIndex={-1}
        >
          <svg
            className='w-4 h-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 16.121m6.878-6.243L16.121 3M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'
            />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <Layout
      allPRs={allPRs}
      rateLimit={allPullRequestsQuery.data?.rateLimit}
      loading={loading}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Pull Requests</h1>
          </div>
          <Link
            to='/ignored'
            className='px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 16.121m6.878-6.243L16.121 3M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z'
              />
            </svg>
            無視したPR ({ignoredPRIds.size})
          </Link>
        </div>

        <div className='space-y-6'>
          {groups.map(group => (
            <div
              key={group.title}
              className='bg-white shadow-sm rounded-lg overflow-hidden'
            >
              <div className='px-4 py-3 bg-gray-50 border-b flex items-center justify-between'>
                <h2 className='text-sm font-medium text-gray-900 flex items-center gap-2'>
                  <span className='text-lg'>{group.icon}</span>
                  {group.title}
                </h2>
                <span className='text-sm text-gray-500'>
                  {group.pullRequests.length}件
                </span>
              </div>
              {group.pullRequests.length > 0 ? (
                <div className='divide-y divide-gray-200'>
                  {group.pullRequests.map(renderPRItem)}
                </div>
              ) : (
                <div className='px-4 py-6 text-center text-sm text-gray-500'>
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
