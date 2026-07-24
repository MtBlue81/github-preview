import { gql, TypedDocumentNode } from '@apollo/client';
import type {
  PullRequest,
  PullRequestDetail,
  RateLimit,
} from '../types/github';

interface GetViewerData {
  viewer: {
    login: string;
    name: string;
    avatarUrl: string;
  };
}

export const GET_VIEWER: TypedDocumentNode<
  GetViewerData,
  Record<string, never>
> = gql`
  query GetViewer {
    viewer {
      login
      name
      avatarUrl
    }
  }
`;

interface PullRequestSearchResult {
  nodes: Array<PullRequest | null> | null;
}

interface GetAllPullRequestsData {
  rateLimit: RateLimit | null;
  authored: PullRequestSearchResult;
  assigned: PullRequestSearchResult;
  mentioned: PullRequestSearchResult;
  reviewRequested: PullRequestSearchResult;
  reviewed: PullRequestSearchResult;
  commented: PullRequestSearchResult;
}

interface GetAllPullRequestsVariables {
  authorQuery: string;
  assigneeQuery: string;
  mentionsQuery: string;
  reviewRequestedQuery: string;
  reviewedQuery: string;
  commentedQuery: string;
}

export const GET_ALL_PULL_REQUESTS: TypedDocumentNode<
  GetAllPullRequestsData,
  GetAllPullRequestsVariables
> = gql`
  query GetAllPullRequests(
    $authorQuery: String!
    $assigneeQuery: String!
    $mentionsQuery: String!
    $reviewRequestedQuery: String!
    $reviewedQuery: String!
    $commentedQuery: String!
  ) {
    rateLimit {
      limit
      remaining
      used
      cost
      resetAt
    }
    authored: search(query: $authorQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
            }
          }
          reviewDecision
          commits(last: 1) {
            totalCount
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                        startedAt
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
                        }
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          mergeable
        }
      }
    }
    assigned: search(query: $assigneeQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
            }
          }
          reviewDecision
          commits(last: 1) {
            totalCount
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                        startedAt
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
                        }
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          mergeable
        }
      }
    }
    mentioned: search(query: $mentionsQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
            }
          }
          reviewDecision
          commits(last: 1) {
            totalCount
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                        startedAt
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
                        }
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          mergeable
        }
      }
    }
    reviewRequested: search(
      query: $reviewRequestedQuery
      type: ISSUE
      first: 50
    ) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
            }
          }
          reviewDecision
          commits(last: 1) {
            totalCount
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                        startedAt
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
                        }
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          mergeable
        }
      }
    }
    reviewed: search(query: $reviewedQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
            }
          }
          reviewDecision
          commits(last: 1) {
            totalCount
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                        startedAt
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
                        }
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          mergeable
        }
      }
    }
    commented: search(query: $commentedQuery, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          author {
            login
            avatarUrl
          }
          repository {
            name
            owner {
              login
            }
          }
          reviewDecision
          commits(last: 1) {
            totalCount
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
                        startedAt
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
                        }
                      }
                      ... on StatusContext {
                        id
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          comments {
            totalCount
          }
          reviews {
            totalCount
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          mergeable
        }
      }
    }
  }
`;

interface GetPullRequestDetailData {
  repository: {
    owner: { login: string };
    name: string;
    pullRequest: PullRequestDetail | null;
  } | null;
}

interface GetPullRequestDetailVariables {
  owner: string;
  repo: string;
  number: number;
}

export const GET_PULL_REQUEST_DETAIL: TypedDocumentNode<
  GetPullRequestDetailData,
  GetPullRequestDetailVariables
> = gql`
  query GetPullRequestDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      owner {
        login
      }
      name
      pullRequest(number: $number) {
        id
        number
        title
        url
        state
        createdAt
        updatedAt
        isDraft
        body
        bodyHTML
        mergeable
        author {
          login
          avatarUrl
        }
        repository {
          name
          owner {
            login
          }
        }
        reviewDecision
        commits {
          totalCount
        }
        files(first: 100) {
          nodes {
            path
            additions
            deletions
            changeType
          }
        }
        reviews(first: 50) {
          nodes {
            id
            author {
              login
              avatarUrl
            }
            state
            body
            createdAt
          }
        }
        comments(first: 100) {
          nodes {
            id
            author {
              login
              avatarUrl
            }
            body
            createdAt
          }
        }
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
      }
    }
  }
`;
