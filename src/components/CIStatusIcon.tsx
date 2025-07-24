import { StatusCheckRollup, StatusCheckContext } from '../types/github';

interface CIStatusIconProps {
  statusCheckRollup?: StatusCheckRollup | null;
}

export function CIStatusIcon({ statusCheckRollup }: CIStatusIconProps) {
  if (!statusCheckRollup) {
    return null;
  }

  const { state, contexts } = statusCheckRollup;
  const contextNodes = contexts?.nodes || [];

  // ステータスに応じた色とアイコンを決定
  const getStatusColor = () => {
    switch (state) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'FAILURE':
      case 'ERROR':
        return 'text-red-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'EXPECTED':
        return 'text-gray-400';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'SUCCESS':
        return (
          <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'FAILURE':
      case 'ERROR':
        return (
          <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'PENDING':
        return (
          <svg className='w-5 h-5 animate-spin' fill='none' viewBox='0 0 24 24'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
        );
      default:
        return (
          <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
        );
    }
  };

  // ツールチップ用のサマリーを生成
  const getTooltipContent = () => {
    const summary = contextNodes.reduce(
      (acc, context: StatusCheckContext) => {
        if (context.__typename === 'CheckRun') {
          if (context.conclusion === 'SUCCESS') {
            acc.success++;
          } else if (
            context.conclusion === 'FAILURE' ||
            context.conclusion === 'CANCELLED' ||
            context.conclusion === 'TIMED_OUT'
          ) {
            acc.failed++;
          } else if (
            context.status === 'IN_PROGRESS' ||
            context.status === 'QUEUED'
          ) {
            acc.pending++;
          }
        } else if (context.__typename === 'StatusContext') {
          if (context.state === 'SUCCESS') {
            acc.success++;
          } else if (context.state === 'FAILURE' || context.state === 'ERROR') {
            acc.failed++;
          } else if (context.state === 'PENDING') {
            acc.pending++;
          }
        }
        return acc;
      },
      { success: 0, failed: 0, pending: 0 }
    );

    const parts = [];
    if (summary.success > 0) parts.push(`${summary.success} passed`);
    if (summary.failed > 0) parts.push(`${summary.failed} failed`);
    if (summary.pending > 0) parts.push(`${summary.pending} pending`);

    return parts.join(', ') || 'No checks';
  };

  return (
    <div
      className={`inline-flex items-center ${getStatusColor()}`}
      title={getTooltipContent()}
    >
      {getStatusIcon()}
    </div>
  );
}
