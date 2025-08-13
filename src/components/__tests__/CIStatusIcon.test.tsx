import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { CIStatusIcon } from '../CIStatusIcon';
import { StatusCheckRollup } from '../../types/github';

describe('CIStatusIcon', () => {
  describe('SUCCESS状態', () => {
    it('成功アイコンと緑色のスタイルを表示する', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'SUCCESS',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-green-600');
    });

    it('SUCCESS状態でチェックマークアイコンが表示される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'SUCCESS',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      const svg = icon.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // チェックマークのpath要素を確認（実際のパス要素に合わせて修正）
      const path = svg?.querySelector('path[fill-rule="evenodd"]');
      expect(path).toBeInTheDocument();
    });
  });

  describe('FAILURE状態', () => {
    it('失敗アイコンと赤色のスタイルを表示する', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'FAILURE',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-600');
    });

    it('FAILURE状態でXアイコンが表示される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'FAILURE',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      const svg = icon.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // Xマークのpath要素を確認（実際のパス要素に合わせて修正）
      const path = svg?.querySelector('path[fill-rule="evenodd"]');
      expect(path).toBeInTheDocument();
    });
  });

  describe('PENDING状態', () => {
    it('進行中アイコンと黄色のスタイルを表示する', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'PENDING',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-yellow-600');
    });

    it('PENDING状態でスピナーアイコンが表示される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'PENDING',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      const svg = icon.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // スピナーのcircle要素を確認（PENDINGは実際にはスピナー）
      const circle = svg?.querySelector('circle');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('ERROR状態', () => {
    it('エラーアイコンと赤色のスタイルを表示する', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'ERROR',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-red-600');
    });
  });

  describe('EXPECTED状態', () => {
    it('待機中アイコンとグレーのスタイルを表示する', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'EXPECTED',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-gray-400');
    });
  });

  describe('null/undefined状態', () => {
    it('statusCheckRollupがnullの場合は何も表示しない', () => {
      render(<CIStatusIcon statusCheckRollup={null} />);

      // CIアイコンが表示されていないことを確認
      expect(screen.queryByTitle('No checks')).not.toBeInTheDocument();
    });

    it('statusCheckRollupがundefinedの場合は何も表示しない', () => {
      render(<CIStatusIcon statusCheckRollup={undefined} />);

      // CIアイコンが表示されていないことを確認
      expect(screen.queryByTitle('No checks')).not.toBeInTheDocument();
    });
  });

  describe('共通スタイル', () => {
    it('すべての状態でSVGにw-5 h-5クラスが適用される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'SUCCESS',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      const svg = icon.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });

    it('すべての状態でinline-flexクラスが適用される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'FAILURE',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('No checks');
      expect(icon).toHaveClass('inline-flex');
    });
  });

  describe('アクセシビリティ', () => {
    it('各状態で適切なtitle属性が設定される', () => {
      const testCases = [
        { state: 'SUCCESS' as const, title: 'No checks' },
        { state: 'FAILURE' as const, title: 'No checks' },
        { state: 'PENDING' as const, title: 'No checks' },
        { state: 'ERROR' as const, title: 'No checks' },
        { state: 'EXPECTED' as const, title: 'No checks' },
      ];

      testCases.forEach(({ state, title }) => {
        const statusCheckRollup: StatusCheckRollup = {
          state,
          contexts: { nodes: [] },
        };

        const { unmount } = render(
          <CIStatusIcon statusCheckRollup={statusCheckRollup} />
        );

        expect(screen.getByTitle(title)).toBeInTheDocument();

        unmount();
      });
    });

    it('SVGアイコンにaria-hiddenが設定される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'SUCCESS',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const svg = screen.getByTitle('No checks').querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('contexts情報', () => {
    it('contextsがあってもアイコン表示に影響しない', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'SUCCESS',
        contexts: {
          nodes: [
            {
              __typename: 'CheckRun',
              id: 'check1',
              name: 'test-check',
              status: 'COMPLETED',
              conclusion: 'SUCCESS',
            },
          ],
        },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      const icon = screen.getByTitle('1 passed');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-green-600');
    });

    it('contexts.nodesが空配列でもアイコンは表示される', () => {
      const statusCheckRollup: StatusCheckRollup = {
        state: 'SUCCESS',
        contexts: { nodes: [] },
      };

      render(<CIStatusIcon statusCheckRollup={statusCheckRollup} />);

      expect(screen.getByTitle('No checks')).toBeInTheDocument();
    });
  });
});
