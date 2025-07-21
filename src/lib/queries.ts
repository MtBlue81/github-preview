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
          commits {
            totalCount
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
        }
      }
    }
  }
`;

export const GET_PULL_REQUEST_DETAIL = gql`
  query GetPullRequestDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
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
