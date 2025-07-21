import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_PULL_REQUEST_DETAIL } from '../lib/queries';
import { useIgnoreStore } from '../stores/ignoreStore';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import type { PullRequestDetail } from '../types/github';

interface IgnoredPRInfo {
  prId: string;
  owner: string;
  repo: string;
  number: number;
  data?: PullRequestDetail;
  loading: boolean;
  error?: string;
}

export function IgnoredPRsPage() {
  const { getIgnoredPRs, removeIgnoredPR, clearAllIgnored } = useIgnoreStore();
  const [ignoredPRs, setIgnoredPRs] = useState<IgnoredPRInfo[]>([]);

  useEffect(() => {
    const ignoredIds = getIgnoredPRs();
    const prInfos: IgnoredPRInfo[] = ignoredIds
      .map(prId => {
        // PR IDからowner/repo/numberを抽出
        const parts = prId.split(':');
        if (parts.length === 3) {
          return {
            prId,
            owner: parts[0],
            repo: parts[1],
            number: parseInt(parts[2]),
            loading: true,
          };
        }
        return null;
      })
      .filter(Boolean) as IgnoredPRInfo[];

    setIgnoredPRs(prInfos);
  }, [getIgnoredPRs]);

  const handleRemoveIgnore = (prId: string) => {
    removeIgnoredPR(prId);
    setIgnoredPRs(prev => prev.filter(pr => pr.prId !== prId));
  };

  const handleClearAll = () => {
    clearAllIgnored();
    setIgnoredPRs([]);
  };

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>無視したPR一覧</h1>
            <p className='mt-1 text-sm text-gray-600'>
              監視対象から除外したPRの一覧です
            </p>
          </div>
          {ignoredPRs.length > 0 && (
            <button
              onClick={handleClearAll}
              className='px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700'
            >
              すべて解除
            </button>
          )}
        </div>

        {ignoredPRs.length === 0 ? (
          <div className='bg-white shadow-sm rounded-lg p-8 text-center'>
            <div className='text-gray-500'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400 mb-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m14 0H4'
                />
              </svg>
              <p className='text-lg font-medium'>無視したPRはありません</p>
              <p className='text-sm'>
                PR一覧から無視したPRがここに表示されます
              </p>
            </div>
          </div>
        ) : (
          <div className='bg-white shadow-sm rounded-lg overflow-hidden'>
            <div className='divide-y divide-gray-200'>
              {ignoredPRs.map(prInfo => (
                <IgnoredPRItem
                  key={prInfo.prId}
                  prInfo={prInfo}
                  onRemove={handleRemoveIgnore}
                />
              ))}
            </div>
          </div>
        )}

        <div className='mt-6'>
          <Link
            to='/'
            className='text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1'
          >
            ← PR一覧に戻る
          </Link>
        </div>
      </div>
    </Layout>
  );
}

interface IgnoredPRItemProps {
  prInfo: IgnoredPRInfo;
  onRemove: (prId: string) => void;
}

function IgnoredPRItem({ prInfo, onRemove }: IgnoredPRItemProps) {
  const { data, loading, error } = useQuery(GET_PULL_REQUEST_DETAIL, {
    variables: {
      owner: prInfo.owner,
      repo: prInfo.repo,
      number: prInfo.number,
    },
    errorPolicy: 'all',
  });

  const pr = data?.repository?.pullRequest;

  if (loading) {
    return (
      <div className='px-4 py-3 animate-pulse'>
        <div className='h-4 bg-gray-300 rounded w-3/4 mb-2'></div>
        <div className='h-3 bg-gray-300 rounded w-1/2'></div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className='px-4 py-3 bg-gray-50'>
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <p className='text-sm text-gray-900 font-medium'>
              {prInfo.owner}/{prInfo.repo} #{prInfo.number}
            </p>
            <p className='text-xs text-red-600'>
              {error ? 'データの取得に失敗しました' : 'PRが見つかりません'}
            </p>
          </div>
          <button
            onClick={() => onRemove(prInfo.prId)}
            className='ml-4 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300'
          >
            削除
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='px-4 py-3 hover:bg-gray-50'>
      <div className='flex items-start justify-between'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            {pr.isDraft && (
              <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800'>
                Draft
              </span>
            )}
            <Link
              to={`/pr/${pr.repository.owner.login}/${pr.repository.name}/${pr.number}`}
              className='text-sm font-medium text-blue-600 hover:text-blue-800 truncate'
            >
              {pr.title}
            </Link>
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
              {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                pr.state === 'OPEN'
                  ? 'bg-green-100 text-green-800'
                  : pr.state === 'MERGED'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {pr.state}
            </span>
          </div>
        </div>
        <button
          onClick={() => onRemove(prInfo.prId)}
          className='ml-4 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700'
        >
          監視再開
        </button>
      </div>
    </div>
  );
}
