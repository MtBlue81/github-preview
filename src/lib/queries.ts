import { gql } from '@apollo/client';

export const GET_VIEWER = gql`
  query GetViewer {
    viewer {
      login
      name
      avatarUrl
    }
  }
`;

export const GET_PULL_REQUESTS = gql`
  query GetPullRequests($query: String!) {
    search(query: $query, type: ISSUE, first: 50) {
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
                  contexts(first: 10) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
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

export const GET_ALL_PULL_REQUESTS = gql`
  query GetAllPullRequests(
    $authorQuery: String!
    $assigneeQuery: String!
    $mentionsQuery: String!
    $reviewRequestedQuery: String!
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
                  contexts(first: 10) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
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
                  contexts(first: 10) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
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
                  contexts(first: 10) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
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
                  contexts(first: 10) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        name
                        status
                        conclusion
                        detailsUrl
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

export const GET_PULL_REQUEST_DETAIL = gql`
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
