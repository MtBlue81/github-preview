import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_PULL_REQUESTS } from '../lib/queries';
import { PullRequest } from '../types/github';
import { useAuthStore } from '../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function PullRequestsPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'author' | 'assignee' | 'mentions' | 'review-requested'>('author');
  
  const query = `is:pr is:open ${filter}:${user?.login}`;
  
  const { data, loading, error } = useQuery(GET_PULL_REQUESTS, {
    variables: { query },
    pollInterval: 60000, // 1分ごとに更新
  });

  const pullRequests = data?.search?.nodes?.filter(Boolean) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading pull requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('author')}
            className={`px-3 py-1 rounded ${
              filter === 'author' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Created
          </button>
          <button
            onClick={() => setFilter('assignee')}
            className={`px-3 py-1 rounded ${
              filter === 'assignee' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Assigned
          </button>
          <button
            onClick={() => setFilter('mentions')}
            className={`px-3 py-1 rounded ${
              filter === 'mentions' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Mentioned
          </button>
          <button
            onClick={() => setFilter('review-requested')}
            className={`px-3 py-1 rounded ${
              filter === 'review-requested' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Review requested
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {pullRequests.map((pr: PullRequest) => (
            <li key={pr.id}>
              <Link
                to={`/pr/${pr.repository.owner.login}/${pr.repository.name}/${pr.number}`}
                className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {pr.isDraft && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                          Draft
                        </span>
                      )}
                      <h3 className="text-lg font-medium text-gray-900">{pr.title}</h3>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {pr.repository.owner.login}/{pr.repository.name} #{pr.number}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <img
                        className="w-5 h-5 rounded-full mr-1"
                        src={pr.author.avatarUrl}
                        alt={pr.author.login}
                      />
                      <span>{pr.author.login}</span>
                      <span className="mx-1">·</span>
                      <span>{formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}</span>
                      <span className="mx-1">·</span>
                      <span>{pr.commits.totalCount} commits</span>
                      <span className="mx-1">·</span>
                      <span>{pr.comments.totalCount + pr.reviews.totalCount} comments</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {pr.reviewDecision === 'APPROVED' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Approved
                      </span>
                    )}
                    {pr.reviewDecision === 'CHANGES_REQUESTED' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Changes requested
                      </span>
                    )}
                  </div>
                </div>
                {pr.labels.nodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pr.labels.nodes.map((label) => (
                      <span
                        key={label.name}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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
            </li>
          ))}
        </ul>
      </div>
      </div>
    </Layout>
  );
}