import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useReadStatusStore } from '../stores/readStatusStore';
import { RateLimit } from '../types/github';
import { useMemo } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  allPRs?: Array<{ id: string; updatedAt: string }>;
  rateLimit?: RateLimit;
  loading?: boolean;
}

export function Layout({
  children,
  allPRs = [],
  rateLimit,
  loading = false,
}: LayoutProps) {
  const { user, logout } = useAuthStore();
  const { getUnreadCount } = useReadStatusStore();
  const navigate = useNavigate();

  const unreadCount = useMemo(() => {
    return getUnreadCount(allPRs);
  }, [getUnreadCount, allPRs]);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
