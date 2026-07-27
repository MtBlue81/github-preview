import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FetchErrorBanner } from '../FetchErrorBanner';

describe('FetchErrorBanner', () => {
  it('transient のとき自動再試行中であることを伝える', () => {
    render(<FetchErrorBanner kind='transient' onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '表示中の一覧は最後に取得できた内容です'
    );
    expect(screen.getByRole('alert')).toHaveTextContent('自動で再試行します');
  });

  it('unknown のときは自動再試行に言及しない', () => {
    render(<FetchErrorBanner kind='unknown' onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '表示中の一覧は最後に取得できた内容です'
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      '自動で再試行します'
    );
  });

  it('再試行ボタンのクリックで onRetry が呼ばれる', async () => {
    const onRetry = vi.fn();
    render(<FetchErrorBanner kind='transient' onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('disabled が true のとき再試行ボタンが押せない', () => {
    render(<FetchErrorBanner kind='transient' onRetry={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: '再試行' })).toBeDisabled();
  });
});
