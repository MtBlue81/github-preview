import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useReadStatusStore } from '../stores/readStatusStore';
import { useMemo } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  allPRs?: Array<{ id: string; updatedAt: string }>;
}

export function Layout({ children, allPRs = [] }: LayoutProps) {
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
                  GitHub PR Preview
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
