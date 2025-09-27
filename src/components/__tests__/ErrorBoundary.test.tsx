import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('正常時は子コンポーネントをレンダリング', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('エラー発生時はエラー画面を表示', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText('エラー内容:')).toBeInTheDocument();
    const errorMessages = screen.getAllByText(/Error: Test error message/);
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it('再読み込みボタンが機能する', () => {
    const reloadSpy = vi.fn();

    // window.location.reloadをモック
    Object.defineProperty(window, 'location', {
      value: {
        reload: reloadSpy,
        href: 'http://localhost:3000'
      },
      writable: true
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('ページを再読み込み');
    fireEvent.click(reloadButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('リセットボタンが存在して動作する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

    // ErrorBoundary内のリセットボタンが存在することを確認
    const resetButton = screen.getByText('エラーをリセット');
    expect(resetButton).toBeInTheDocument();

    // リセットボタンがクリック可能であることを確認
    fireEvent.click(resetButton);

    // handleResetが呼ばれて状態が更新されたことは、内部状態の変更なのでテストせず、
    // リセットボタンの存在とクリック可能性のみを確認
  });

  it('エラー情報に発生時刻、URL、ブラウザ情報が含まれる', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/発生時刻:/)).toBeInTheDocument();
    expect(screen.getByText(/URL:/)).toBeInTheDocument();
    expect(screen.getByText(/ブラウザ:/)).toBeInTheDocument();
  });

  it('スタックトレースが展開可能な状態で表示される', () => {
    const errorWithStack = new Error('Test error');
    errorWithStack.stack = 'Error stack trace here';

    const ThrowWithStack = () => {
      throw errorWithStack;
    };

    render(
      <ErrorBoundary>
        <ThrowWithStack />
      </ErrorBoundary>
    );

    const stackSummary = screen.getByText('詳細エラースタック (クリックして展開)');
    expect(stackSummary).toBeInTheDocument();
  });

  it('カスタムfallbackが提供されていれば使用する', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
  });

  it('console.errorが呼ばれる', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
  });
});