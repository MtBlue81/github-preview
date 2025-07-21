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

export type ConversationItem = ReviewNode | CommentNode;

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
