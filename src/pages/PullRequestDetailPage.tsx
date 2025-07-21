import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_PULL_REQUEST_DETAIL } from '../lib/queries';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Layout } from '../components/Layout';
import { useNavigationStore } from '../stores/navigationStore';
import { useEffect } from 'react';
import type { FileNode, ConversationItem } from '../types/github';

export function PullRequestDetailPage() {
  const { owner, repo, number } = useParams<{
    owner: string;
    repo: string;
    number: string;
  }>();
  const navigate = useNavigate();
  const { getNextPR, getPreviousPR, currentPRIndex, allPullRequests } =
    useNavigationStore();

  const { data, loading, error } = useQuery(GET_PULL_REQUEST_DETAIL, {
    variables: { owner, repo, number: parseInt(number || '0') },
    pollInterval: 30000,
  });

  // キーボードショートカット - すべてのフックは早期リターンの前に配置
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'h') {
        const prevPR = getPreviousPR();
        if (prevPR) {
          navigate(
            `/pr/${prevPR.repository.owner.login}/${prevPR.repository.name}/${prevPR.number}`
          );
        }
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        const nextPR = getNextPR();
        if (nextPR) {
          navigate(
            `/pr/${nextPR.repository.owner.login}/${nextPR.repository.name}/${nextPR.number}`
          );
        }
      } else if (e.key === 'Escape' || e.key === 'g') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, getNextPR, getPreviousPR]);

  const prevPR = getPreviousPR();
  const nextPR = getNextPR();

  const pr = data?.repository?.pullRequest;

  // 早期リターンはすべてのフックの後に配置
  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-lg'>Loading pull request...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-red-600'>Error: {error.message}</div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-gray-600'>Pull request not found</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* ナビゲーションバー */}
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => {
                navigate(-1);
              }}
              className='text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1'
            >
              ← PR一覧に戻る
            </button>
            <span className='text-sm text-gray-400'>
              {currentPRIndex + 1} / {allPullRequests.length}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() =>
                prevPR &&
                navigate(
                  `/pr/${prevPR.repository.owner.login}/${prevPR.repository.name}/${prevPR.number}`
                )
              }
              disabled={!prevPR}
              className='px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              title='前のPR (← または h)'
            >
              ← 前のPR
            </button>
            <button
              onClick={() =>
                nextPR &&
                navigate(
                  `/pr/${nextPR.repository.owner.login}/${nextPR.repository.name}/${nextPR.number}`
                )
              }
              disabled={!nextPR}
              className='px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              title='次のPR (→ または l)'
            >
              次のPR →
            </button>
          </div>
        </div>

        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>{pr.title}</h1>
          <div className='flex items-center text-sm text-gray-600'>
            <span
              className={`px-2 py-1 rounded ${
                pr.state === 'OPEN'
                  ? 'bg-green-100 text-green-800'
                  : pr.state === 'MERGED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {pr.state}
            </span>
            <span className='ml-3'>
              {pr.author.login} wants to merge {pr.commits.totalCount} commits
              into {owner}/{repo}
            </span>
          </div>
        </div>

        <div className='bg-white shadow rounded-lg mb-6'>
          <div className='px-4 py-5 sm:p-6'>
            <div className='prose max-w-none'>
              <ReactMarkdown>
                {pr.body || '*No description provided.*'}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        <div className='bg-white shadow rounded-lg mb-6'>
          <div className='px-4 py-5 sm:px-6'>
            <h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
              Files changed ({pr.files.nodes.length})
            </h3>
            <div className='space-y-2'>
              {pr.files.nodes.map((file: FileNode) => (
                <div
                  key={file.path}
                  className='flex items-center justify-between py-2 border-b'
                >
                  <span className='text-sm font-mono'>{file.path}</span>
                  <div className='flex items-center space-x-2 text-sm'>
                    <span className='text-green-600'>+{file.additions}</span>
                    <span className='text-red-600'>-{file.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='bg-white shadow rounded-lg'>
          <div className='px-4 py-5 sm:px-6'>
            <h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
              Conversation
            </h3>
            <div className='space-y-4'>
              {[...pr.reviews.nodes, ...pr.comments.nodes]
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
                )
                .map((item: ConversationItem) => (
                  <div key={item.id} className='flex space-x-3'>
                    <img
                      className='h-10 w-10 rounded-full'
                      src={item.author.avatarUrl}
                      alt={item.author.login}
                    />
                    <div className='flex-1'>
                      <div className='flex items-center'>
                        <h4 className='text-sm font-medium text-gray-900'>
                          {item.author.login}
                        </h4>
                        <span className='ml-2 text-sm text-gray-500'>
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {'state' in item && (
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded ${
                              item.state === 'APPROVED'
                                ? 'bg-green-100 text-green-800'
                                : item.state === 'CHANGES_REQUESTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.state}
                          </span>
                        )}
                      </div>
                      <div className='mt-1 text-sm text-gray-700 prose prose-sm max-w-none'>
                        <ReactMarkdown>{item.body}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
