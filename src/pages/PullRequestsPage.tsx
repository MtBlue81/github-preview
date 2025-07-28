import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ALL_PULL_REQUESTS } from '../lib/queries';
import { PullRequest } from '../types/github';
import { useAuthStore } from '../stores/authStore';
import { useIgnoreStore } from '../stores/ignoreStore';
import { useReadStatusStore } from '../stores/readStatusStore';
import { notificationService } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { Layout } from '../components/Layout';
import { CIStatusIcon } from '../components/CIStatusIcon';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Link } from 'react-router-dom';

interface PRWithCategories extends PullRequest {
  categories: Array<{ title: string; icon: string }>;
}

export function PullRequestsPage() {
  const { user } = useAuthStore();
  const { isIgnored, addIgnoredPR, ignoredPRIds } = useIgnoreStore();
  const { isUnread, markAsRead, getUnreadCount } = useReadStatusStore();
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [currentWebView, setCurrentWebView] = useState<WebviewWindow | null>(
    null
  );

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
  const refetch = allPullRequestsQuery.refetch;

  const handleRefresh = async () => {
    await refetch();
  };

  // PRとカテゴリ情報を統合した配列を作成
  const allPRsWithCategories = useMemo(() => {
    const prMap = new Map<string, PRWithCategories>();

    // 各カテゴリのPRを処理
    const categories = [
      {
        title: 'メンション',
        icon: '💬',
        prs: allPullRequestsQuery.data?.mentioned?.nodes?.filter(Boolean) || [],
      },
      {
        title: 'アサイン',
        icon: '📌',
        prs: allPullRequestsQuery.data?.assigned?.nodes?.filter(Boolean) || [],
      },
      {
        title: 'レビュー依頼',
        icon: '👀',
        prs:
          allPullRequestsQuery.data?.reviewRequested?.nodes?.filter(Boolean) ||
          [],
      },
      {
        title: '作成',
        icon: '✏️',
        prs: allPullRequestsQuery.data?.authored?.nodes?.filter(Boolean) || [],
      },
    ];

    // 各カテゴリのPRをマップに追加
    categories.forEach(category => {
      category.prs.forEach((pr: PullRequest) => {
        const prKey = `${pr.repository.owner.login}:${pr.repository.name}:${pr.number}`;
        if (isIgnored(prKey)) return;

        if (prMap.has(pr.id)) {
          // 既存のPRにカテゴリを追加
          const existingPR = prMap.get(pr.id)!;
          existingPR.categories.push({
            title: category.title,
            icon: category.icon,
          });
        } else {
          // 新しいPRを追加
          prMap.set(pr.id, {
            ...pr,
            categories: [{ title: category.title, icon: category.icon }],
          });
        }
      });
    });

    // 更新日時でソート（新しい順）
    return Array.from(prMap.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allPullRequestsQuery.data?.authored?.nodes,
    allPullRequestsQuery.data?.reviewRequested?.nodes,
    allPullRequestsQuery.data?.assigned?.nodes,
    allPullRequestsQuery.data?.mentioned?.nodes,
    isIgnored,
    ignoredPRIds,
  ]);

  // 全PRのフラットなリストを作成（ナビゲーション用）
  const allPRs = useMemo(() => {
    return allPRsWithCategories;
  }, [allPRsWithCategories]);

  // 以前のPRリストを保持
  const previousPRsRef = useRef<PullRequest[]>([]);
  const hasInitializedRef = useRef(false);

  // PRリストが更新されたらナビゲーションストアに保存し、新しい未読を検知
  useEffect(() => {
    if (allPRs.length > 0) {
      setLastUpdated(new Date());

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
  }, [allPRs, isUnread]);

  // メインウィンドウフォーカス時にWebViewを閉じる
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupFocusListener = async () => {
      try {
        const mainWindow = getCurrentWindow();
        unlisten = await mainWindow.onFocusChanged(
          ({ payload: focused }: { payload: boolean }) => {
            if (focused && currentWebView) {
              console.log('Main window focused, closing WebView overlay');
              currentWebView.close().catch(error => {
                console.error('Failed to close WebView on focus:', error);
              });
              setCurrentWebView(null);
            }
          }
        );
      } catch (error) {
        console.warn('Failed to setup focus listener:', error);
      }
    };

    setupFocusListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [currentWebView]);

  const unreadCount = useMemo(() => {
    return getUnreadCount(allPRs);
  }, [getUnreadCount, allPRs]);

  // WebViewを一覧上に開く関数
  const openWebViewOverlay = async (pr: PullRequest) => {
    try {
      // 既存のWebViewを強制的にクリーンアップ
      if (currentWebView) {
        console.log('Closing existing WebView...');
        try {
          await currentWebView.close();
        } catch (e) {
          console.warn('Error closing existing WebView:', e);
        }
        setCurrentWebView(null);
        // 少し待ってから新しいWebViewを作成
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 既読としてマーク
      markAsRead(pr.id, pr.updatedAt);

      const githubUrl = `https://github.com/${pr.repository.owner.login}/${pr.repository.name}/pull/${pr.number}`;
      const webviewLabel = `pr-overlay-${pr.repository.owner.login}-${pr.repository.name}-${pr.number}-${Date.now()}`;

      // メインウィンドウの位置とサイズを取得
      const mainWindow = getCurrentWindow();
      const windowPosition = await mainWindow.outerPosition();
      const windowSize = await mainWindow.outerSize();

      // WebViewを一覧上に重なる位置に配置
      const overlayWidth = Math.min(1000, windowSize.width - 100);
      const overlayHeight = Math.min(700, windowSize.height - 100);
      const overlayX = windowPosition.x + (windowSize.width - overlayWidth) / 2;
      const overlayY = windowPosition.y + 50; // 少し上部にオフセット

      const webview = new WebviewWindow(webviewLabel, {
        url: githubUrl,
        title: `GitHub PR #${pr.number} - ${pr.repository.owner.login}/${pr.repository.name}`,
        x: Math.round(overlayX),
        y: Math.round(overlayY),
        width: overlayWidth,
        height: overlayHeight,
        visible: false,
        resizable: true,
        maximizable: true,
        minimizable: true,
        closable: true,
        decorations: true,
        alwaysOnTop: true, // 一覧の上に表示
        skipTaskbar: false,
      });

      setCurrentWebView(webview);

      // WebView作成成功時
      webview.once('tauri://created', async () => {
        await webview.show();

        // WebView内でキーボードショートカットを有効にするために
        // WebViewのデフォルトキーボードハンドリングを利用
        // （JavaScript注入の代わりに、メインアプリ側でグローバルキーボード監視を強化）

        console.log(`Opened PR #${pr.number} in overlay WebView`);
      });

      // WebViewが閉じられた時
      webview.once('tauri://close-requested', () => {
        setCurrentWebView(null);
        console.log('WebView overlay closed');
        webview.destroy();
      });

      // WebViewが破棄された時
      webview.once('tauri://destroyed', () => {
        setCurrentWebView(null);
        console.log('WebView overlay destroyed');
      });

      // エラーハンドリング
      webview.once('tauri://error', e => {
        console.error('WebView overlay error:', e);
        setCurrentWebView(null);
      });
    } catch (error) {
      console.error('Failed to open WebView overlay:', error);
    }
  };

  if (loading && allPRsWithCategories.length === 0) {
    return (
      <Layout
        loading={loading}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
      >
        <div className='flex items-center justify-center h-screen'>
          <div className='text-lg'>Loading pull requests...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout
        loading={loading}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
      >
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

  const renderPRItem = (pr: PRWithCategories) => {
    const isItemUnread = isUnread(pr.id, pr.updatedAt);

    return (
      <div
        key={pr.id}
        id={`pr-${pr.id}`}
        className={`relative group hover:bg-gray-50 focus:bg-blue-50 ${
          isItemUnread ? 'bg-blue-50/30' : ''
        }`}
      >
        <button
          className='w-full text-left block px-4 py-3 border-b last:border-b-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset hover:bg-gray-50'
          onClick={async e => {
            // cmd/ctrl + click で外部ブラウザで開く
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault();
              const githubUrl = `https://github.com/${pr.repository.owner.login}/${pr.repository.name}/pull/${pr.number}`;
              try {
                const { openUrl } = await import('@tauri-apps/plugin-opener');
                await openUrl(githubUrl);
                // 既読としてマーク
                markAsRead(pr.id, pr.updatedAt);
              } catch (error) {
                console.error('Failed to open in browser:', error);
              }
            } else {
              // 通常クリックはWebViewオーバーレイ
              openWebViewOverlay(pr);
            }
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
              <div className='mt-1 flex items-center gap-2'>
                <span className='text-xs text-gray-600'>
                  {pr.repository.owner.login}/{pr.repository.name} #{pr.number}
                </span>
                <div className='flex items-center gap-1'>
                  {pr.categories.map((category, index) => (
                    <span
                      key={index}
                      className='text-sm'
                      title={category.title}
                    >
                      {category.icon}
                    </span>
                  ))}
                </div>
                <CIStatusIcon
                  statusCheckRollup={
                    pr.commits.nodes?.[0]?.commit.statusCheckRollup
                  }
                />
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
        </button>
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
      rateLimit={allPullRequestsQuery.data?.rateLimit}
      loading={loading}
      onRefresh={handleRefresh}
      lastUpdated={lastUpdated}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Pull Requests</h1>
          </div>
          <div className='flex items-center space-x-3'>
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
        </div>

        <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
          <div className='px-4 py-3 bg-gray-50 border-b flex items-center justify-between'>
            <h2 className='text-sm font-medium text-gray-900'>
              未読 {unreadCount} / {allPRsWithCategories.length}件
            </h2>
            <div className='flex items-center gap-3 text-xs text-gray-500'>
              <span className='flex items-center gap-1'>
                <span>💬</span> メンション
              </span>
              <span className='flex items-center gap-1'>
                <span>📌</span> アサイン
              </span>
              <span className='flex items-center gap-1'>
                <span>👀</span> レビュー依頼
              </span>
              <span className='flex items-center gap-1'>
                <span>✏️</span> 作成
              </span>
            </div>
          </div>
          {allPRsWithCategories.length > 0 ? (
            <div className='divide-y divide-gray-200'>
              {allPRsWithCategories.map(renderPRItem)}
            </div>
          ) : (
            <div className='px-4 py-6 text-center text-sm text-gray-500'>
              該当するPRはありません
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
