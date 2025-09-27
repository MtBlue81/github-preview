import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">⚠️</span>
              <h1 className="text-2xl font-bold text-gray-900">エラーが発生しました</h1>
            </div>

            {this.state.error && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2 text-gray-700">エラー内容:</h2>
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-red-800 font-mono text-sm">{this.state.error.toString()}</p>
                </div>
              </div>
            )}

            {this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-lg font-semibold text-gray-700 hover:text-gray-900 mb-2">
                  スタックトレース (クリックして展開)
                </summary>
                <div className="bg-gray-100 border border-gray-300 rounded p-4 mt-2 max-h-64 overflow-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            {this.state.error?.stack && (
              <details className="mb-6">
                <summary className="cursor-pointer text-lg font-semibold text-gray-700 hover:text-gray-900 mb-2">
                  詳細エラースタック (クリックして展開)
                </summary>
                <div className="bg-gray-100 border border-gray-300 rounded p-4 mt-2 max-h-64 overflow-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                <span className="mr-2">🔄</span>
                ページを再読み込み
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                エラーをリセット
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p>問題が解決しない場合は、以下の情報を開発者にお伝えください:</p>
              <ul className="list-disc list-inside mt-2">
                <li>発生時刻: {new Date().toLocaleString('ja-JP')}</li>
                <li>URL: {typeof window !== 'undefined' && window.location ? window.location.href : 'N/A'}</li>
                <li>ブラウザ: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}