import type { AppErrorKind } from '../lib/github';

interface FetchErrorBannerProps {
  kind: Exclude<AppErrorKind, 'auth'>;
  onRetry: () => void;
  disabled?: boolean;
}

const MESSAGES: Record<FetchErrorBannerProps['kind'], string> = {
  transient:
    'PR一覧の更新に失敗しました。表示中の一覧は最後に取得できた内容です。自動で再試行します。',
  unknown:
    'PR一覧の更新に失敗しました。表示中の一覧は最後に取得できた内容です。',
};

export function FetchErrorBanner({
  kind,
  onRetry,
  disabled,
}: FetchErrorBannerProps) {
  return (
    <div
      role='alert'
      className='mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3'
    >
      <span aria-hidden='true' className='text-amber-600'>
        ⚠
      </span>
      <p className='flex-1 min-w-0 text-sm text-amber-900 break-words'>
        {MESSAGES[kind]}
      </p>
      <button
        onClick={onRetry}
        disabled={disabled}
        className='shrink-0 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        再試行
      </button>
    </div>
  );
}
