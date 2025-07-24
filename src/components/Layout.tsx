import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useReadStatusStore } from '../stores/readStatusStore';
import { useToastStore } from '../stores/toastStore';
import { RateLimit } from '../types/github';
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
  allPRs?: Array<{ id: string; updatedAt: string }>;
  rateLimit?: RateLimit;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  lastUpdated?: Date;
}

export function Layout({
  children,
  allPRs = [],
  rateLimit,
  loading = false,
  onRefresh,
  lastUpdated,
}: LayoutProps) {
  const { user, logout } = useAuthStore();
  const { getUnreadCount } = useReadStatusStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = useMemo(() => {
    return getUnreadCount(allPRs);
  }, [getUnreadCount, allPRs]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      addToast({
        message: 'PR一覧を更新しました',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
      addToast({
        message: 'PR一覧の更新に失敗しました',
        type: 'error',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <nav className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16'>
            <div className='flex'>
              <Link to='/' className='flex-shrink-0 flex items-center'>
                <h1 className='text-xl font-bold text-gray-900'>
                  Pull Requests
                </h1>
                {unreadCount > 0 && (
                  <span className='ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                    {unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <div className='flex items-center'>
              {user && (
                <div className='flex items-center space-x-4'>
                  {rateLimit && (
                    <div className='flex items-center space-x-2 text-xs text-gray-600'>
                      {loading && (
                        <svg
                          className='animate-spin h-4 w-4 text-blue-500'
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                          ></circle>
                          <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          ></path>
                        </svg>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded ${
                          rateLimit.remaining < 1000
                            ? 'bg-red-100 text-red-800'
                            : rateLimit.remaining < 2000
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                        title={`API Rate Limit - Used: ${rateLimit.used}, Cost: ${rateLimit.cost}, Reset: ${new Date(rateLimit.resetAt).toLocaleString()}`}
                      >
                        API: {rateLimit.remaining}/{rateLimit.limit}
                      </span>
                      {lastUpdated && (
                        <span
                          className='text-xs text-gray-500'
                          title={`最終更新: ${lastUpdated.toLocaleString()}`}
                        >
                          {formatDistanceToNow(lastUpdated, {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                      {onRefresh && (
                        <button
                          onClick={handleRefresh}
                          disabled={isRefreshing || loading}
                          className='inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
                          title='最新データを取得'
                        >
                          <svg
                            className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`}
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                            />
                          </svg>
                          {isRefreshing ? '更新中' : '更新'}
                        </button>
                      )}
                    </div>
                  )}
                  <img
                    className='h-8 w-8 rounded-full'
                    src={user.avatarUrl}
                    alt={user.login}
                  />
                  <span className='text-sm text-gray-700'>{user.login}</span>
                  <button
                    onClick={handleLogout}
                    className='text-sm text-gray-500 hover:text-gray-700'
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
