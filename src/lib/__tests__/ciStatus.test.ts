import { describe, it, expect } from 'vitest';
import { summarizeCIStatus } from '../ciStatus';
import { CheckRun, StatusContext, StatusCheckRollup } from '../../types/github';

let seq = 0;

function checkRun(overrides: Partial<CheckRun> & { name: string }): CheckRun {
  seq += 1;
  return {
    __typename: 'CheckRun',
    id: `cr-${seq}`,
    status: 'COMPLETED',
    conclusion: 'SUCCESS',
    startedAt: '2026-07-24T00:00:00Z',
    checkSuite: { workflowRun: { workflow: { name: 'CI' } } },
    ...overrides,
  };
}

function statusContext(
  overrides: Partial<StatusContext> & { context: string }
): StatusContext {
  seq += 1;
  return {
    __typename: 'StatusContext',
    id: `sc-${seq}`,
    state: 'SUCCESS',
    ...overrides,
  };
}

function rollup(
  state: StatusCheckRollup['state'],
  nodes: Array<CheckRun | StatusContext>
): StatusCheckRollup {
  return { state, contexts: { nodes } };
}

describe('summarizeCIStatus', () => {
  describe('入力なし', () => {
    it('rollupがnullならnullを返す', () => {
      expect(summarizeCIStatus(null)).toBeNull();
    });

    it('rollupがundefinedならnullを返す', () => {
      expect(summarizeCIStatus(undefined)).toBeNull();
    });
  });

  describe('同名CheckRunのdedup（最新runのみ採用）', () => {
    it('古いFAILUREより新しいSUCCESSが優先されSUCCESSになる', () => {
      // 実例: ClusterONE#66707 の pr-lint（再トリガーで古い失敗runが残る）
      const result = summarizeCIStatus(
        rollup('FAILURE', [
          checkRun({
            name: 'pr-lint',
            conclusion: 'SUCCESS',
            startedAt: '2026-07-23T23:59:49Z',
          }),
          checkRun({
            name: 'pr-lint',
            conclusion: 'FAILURE',
            startedAt: '2026-07-24T00:03:05Z',
          }),
          checkRun({
            name: 'pr-lint',
            conclusion: 'SUCCESS',
            startedAt: '2026-07-24T00:08:20Z',
          }),
          checkRun({
            name: 'lint',
            conclusion: 'SUCCESS',
            checkSuite: { workflowRun: { workflow: { name: 'Android' } } },
          }),
        ])
      );

      expect(result?.state).toBe('SUCCESS');
      expect(result?.contexts).toHaveLength(2);
      const prLint = result?.contexts.find(
        c => c.__typename === 'CheckRun' && c.name === 'pr-lint'
      ) as CheckRun;
      expect(prLint.startedAt).toBe('2026-07-24T00:08:20Z');
    });

    it('最新runがFAILUREならFAILUREになる', () => {
      const result = summarizeCIStatus(
        rollup('FAILURE', [
          checkRun({
            name: 'test',
            conclusion: 'SUCCESS',
            startedAt: '2026-07-24T00:00:00Z',
          }),
          checkRun({
            name: 'test',
            conclusion: 'FAILURE',
            startedAt: '2026-07-24T01:00:00Z',
          }),
        ])
      );

      expect(result?.state).toBe('FAILURE');
    });

    it('同名でもworkflowが異なるCheckRunはdedupしない', () => {
      const result = summarizeCIStatus(
        rollup('FAILURE', [
          checkRun({
            name: 'lint',
            conclusion: 'SUCCESS',
            startedAt: '2026-07-24T01:00:00Z',
            checkSuite: { workflowRun: { workflow: { name: 'Frontend' } } },
          }),
          checkRun({
            name: 'lint',
            conclusion: 'FAILURE',
            startedAt: '2026-07-24T00:00:00Z',
            checkSuite: { workflowRun: { workflow: { name: 'Backend' } } },
          }),
        ])
      );

      expect(result?.state).toBe('FAILURE');
      expect(result?.contexts).toHaveLength(2);
    });

    it('startedAt欠損時は後に現れたrunを採用する', () => {
      const result = summarizeCIStatus(
        rollup('FAILURE', [
          checkRun({ name: 'test', conclusion: 'FAILURE', startedAt: null }),
          checkRun({ name: 'test', conclusion: 'SUCCESS', startedAt: null }),
        ])
      );

      expect(result?.state).toBe('SUCCESS');
      expect(result?.contexts).toHaveLength(1);
    });
  });

  describe('状態の再集計', () => {
    it('CANCELLEDはFAILURE扱いになる', () => {
      const result = summarizeCIStatus(
        rollup('SUCCESS', [
          checkRun({ name: 'build', conclusion: 'CANCELLED' }),
        ])
      );
      expect(result?.state).toBe('FAILURE');
    });

    it('TIMED_OUT/ACTION_REQUIRED/STARTUP_FAILUREはFAILURE扱いになる', () => {
      for (const conclusion of [
        'TIMED_OUT',
        'ACTION_REQUIRED',
        'STARTUP_FAILURE',
      ] as const) {
        const result = summarizeCIStatus(
          rollup('SUCCESS', [checkRun({ name: 'build', conclusion })])
        );
        expect(result?.state).toBe('FAILURE');
      }
    });

    it('SKIPPED/NEUTRALのみならSUCCESSになる', () => {
      const result = summarizeCIStatus(
        rollup('FAILURE', [
          checkRun({ name: 'chromatic', conclusion: 'SKIPPED' }),
          checkRun({ name: 'optional', conclusion: 'NEUTRAL' }),
        ])
      );
      expect(result?.state).toBe('SUCCESS');
    });

    it('未完了のCheckRunがあればPENDINGになる', () => {
      const result = summarizeCIStatus(
        rollup('SUCCESS', [
          checkRun({ name: 'test', conclusion: 'SUCCESS' }),
          checkRun({ name: 'build', status: 'IN_PROGRESS', conclusion: null }),
        ])
      );
      expect(result?.state).toBe('PENDING');
    });

    it('FAILUREとPENDINGが混在する場合はFAILUREを優先する', () => {
      const result = summarizeCIStatus(
        rollup('PENDING', [
          checkRun({ name: 'test', conclusion: 'FAILURE' }),
          checkRun({ name: 'build', status: 'QUEUED', conclusion: null }),
        ])
      );
      expect(result?.state).toBe('FAILURE');
    });

    it('StatusContextのERROR/FAILUREはFAILURE扱いになる', () => {
      for (const state of ['ERROR', 'FAILURE'] as const) {
        const result = summarizeCIStatus(
          rollup('SUCCESS', [statusContext({ context: 'ci/external', state })])
        );
        expect(result?.state).toBe('FAILURE');
      }
    });

    it('StatusContextのPENDING/EXPECTEDはPENDING扱いになる', () => {
      for (const state of ['PENDING', 'EXPECTED'] as const) {
        const result = summarizeCIStatus(
          rollup('SUCCESS', [statusContext({ context: 'ci/external', state })])
        );
        expect(result?.state).toBe('PENDING');
      }
    });
  });

  describe('フォールバック', () => {
    it('contextsが空ならrollup.stateをそのまま返す', () => {
      expect(summarizeCIStatus(rollup('FAILURE', []))?.state).toBe('FAILURE');
      expect(summarizeCIStatus(rollup('SUCCESS', []))?.state).toBe('SUCCESS');
      expect(summarizeCIStatus(rollup('PENDING', []))?.state).toBe('PENDING');
    });
  });
});
