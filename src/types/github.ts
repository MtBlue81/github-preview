export interface CheckRun {
  __typename: 'CheckRun';
  id: string;
  name: string;
  status:
    | 'QUEUED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'WAITING'
    | 'PENDING'
    | 'REQUESTED';
  conclusion?:
    | 'ACTION_REQUIRED'
    | 'CANCELLED'
    | 'FAILURE'
    | 'NEUTRAL'
    | 'SKIPPED'
    | 'STALE'
    | 'STARTUP_FAILURE'
    | 'SUCCESS'
    | 'TIMED_OUT'
    | null;
  detailsUrl?: string;
}

export interface StatusContext {
  __typename: 'StatusContext';
  id: string;
  context: string;
  state: 'ERROR' | 'EXPECTED' | 'FAILURE' | 'PENDING' | 'SUCCESS';
  targetUrl?: string;
}

export type StatusCheckContext = CheckRun | StatusContext;

export interface StatusCheckRollup {
  state: 'ERROR' | 'EXPECTED' | 'FAILURE' | 'PENDING' | 'SUCCESS';
  contexts: {
    nodes: StatusCheckContext[];
  };
}

export interface PullRequestCommit {
  commit: {
    statusCheckRollup?: StatusCheckRollup | null;
  };
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
  author: {
    login: string;
    avatarUrl: string;
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  commits: {
    totalCount: number;
    nodes?: PullRequestCommit[];
  };
  comments: {
    totalCount: number;
  };
  reviews: {
    totalCount: number;
  };
  labels: {
    nodes: Array<{
      name: string;
      color: string;
    }>;
  };
  mergeable?: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
}

export interface FileNode {
  path: string;
  additions: number;
  deletions: number;
  changeType: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED';
}

export interface ReviewNode {
  id: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  state:
    | 'PENDING'
    | 'COMMENTED'
    | 'APPROVED'
    | 'CHANGES_REQUESTED'
    | 'DISMISSED';
  body: string;
  createdAt: string;
}

export interface CommentNode {
  id: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  body: string;
  createdAt: string;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  used: number;
  cost: number;
  resetAt: string;
}

export interface PullRequestDetail
  extends Omit<PullRequest, 'comments' | 'reviews'> {
  body: string;
  bodyHTML: string;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  files: {
    nodes: FileNode[];
  };
  reviews: {
    totalCount: number;
    nodes: ReviewNode[];
  };
  comments: {
    totalCount: number;
    nodes: CommentNode[];
  };
}
