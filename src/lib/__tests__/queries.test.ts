import { describe, it, expect } from 'vitest';
import { print } from 'graphql';
import {
  GET_VIEWER,
  GET_ALL_PULL_REQUESTS,
  GET_PULL_REQUEST_DETAIL,
} from '../queries';

describe('queries', () => {
  describe('GET_VIEWER', () => {
    it('parse 可能な GraphQL document である', () => {
      expect(() => print(GET_VIEWER)).not.toThrow();
    });

    it('viewer の必須フィールドを selection set に含む', () => {
      const printed = print(GET_VIEWER);
      expect(printed).toContain('viewer');
      expect(printed).toContain('login');
      expect(printed).toContain('name');
      expect(printed).toContain('avatarUrl');
    });
  });

  describe('GET_ALL_PULL_REQUESTS', () => {
    it('parse 可能な GraphQL document である', () => {
      expect(() => print(GET_ALL_PULL_REQUESTS)).not.toThrow();
    });

    it('rateLimit の必須フィールドを含む', () => {
      const printed = print(GET_ALL_PULL_REQUESTS);
      expect(printed).toContain('rateLimit');
      expect(printed).toContain('limit');
      expect(printed).toContain('remaining');
      expect(printed).toContain('used');
      expect(printed).toContain('cost');
      expect(printed).toContain('resetAt');
    });

    it('6種類の search alias を全て含む', () => {
      const printed = print(GET_ALL_PULL_REQUESTS);
      expect(printed).toMatch(/authored:\s*search/);
      expect(printed).toMatch(/assigned:\s*search/);
      expect(printed).toMatch(/mentioned:\s*search/);
      expect(printed).toMatch(/reviewRequested:\s*search/);
      expect(printed).toMatch(/reviewed:\s*search/);
      expect(printed).toMatch(/commented:\s*search/);
    });

    it('PR の重要フィールドを含む', () => {
      const printed = print(GET_ALL_PULL_REQUESTS);
      expect(printed).toContain('id');
      expect(printed).toContain('number');
      expect(printed).toContain('title');
      expect(printed).toContain('url');
      expect(printed).toContain('state');
      expect(printed).toContain('reviewDecision');
      expect(printed).toContain('mergeable');
      expect(printed).toContain('isDraft');
      expect(printed).toContain('statusCheckRollup');
    });

    it('6つの query 変数を受け取る', () => {
      const printed = print(GET_ALL_PULL_REQUESTS);
      expect(printed).toContain('$authorQuery: String!');
      expect(printed).toContain('$assigneeQuery: String!');
      expect(printed).toContain('$mentionsQuery: String!');
      expect(printed).toContain('$reviewRequestedQuery: String!');
      expect(printed).toContain('$reviewedQuery: String!');
      expect(printed).toContain('$commentedQuery: String!');
    });
  });

  describe('GET_PULL_REQUEST_DETAIL', () => {
    it('parse 可能な GraphQL document である', () => {
      expect(() => print(GET_PULL_REQUEST_DETAIL)).not.toThrow();
    });

    it('owner / repo / number の3変数を受け取る', () => {
      const printed = print(GET_PULL_REQUEST_DETAIL);
      expect(printed).toContain('$owner: String!');
      expect(printed).toContain('$repo: String!');
      expect(printed).toContain('$number: Int!');
    });

    it('PR詳細の必須フィールドを含む', () => {
      const printed = print(GET_PULL_REQUEST_DETAIL);
      expect(printed).toContain('body');
      expect(printed).toContain('bodyHTML');
      expect(printed).toContain('files');
      expect(printed).toContain('reviews');
      expect(printed).toContain('comments');
      expect(printed).toContain('labels');
    });
  });
});
