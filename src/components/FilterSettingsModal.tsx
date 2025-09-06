import { useEffect, useState } from 'react';
import { useFilterStore } from '../stores/filterStore';

interface FilterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLabels: string[];
}

export function FilterSettingsModal({
  isOpen,
  onClose,
  availableLabels,
}: FilterSettingsModalProps) {
  const {
    excludedLabels,
    toggleExcludedLabel,
    clearExcludedLabels,
    getExcludedLabels,
  } = useFilterStore();
  const [searchTerm, setSearchTerm] = useState('');

  // モーダルが開いたときに検索をリセット
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLabels = availableLabels.filter(label =>
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const excludedLabelsList = getExcludedLabels();

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col'>
        <div className='p-6 border-b'>
          <h2 className='text-xl font-bold text-gray-900'>
            フィルタ設定
          </h2>
          <p className='mt-1 text-sm text-gray-600'>
            除外したいラベルを選択してください
          </p>
        </div>

        <div className='p-6 flex-1 overflow-y-auto'>
          {/* 検索ボックス */}
          <div className='mb-4'>
            <input
              type='text'
              placeholder='ラベルを検索...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          {/* 除外中のラベル表示 */}
          {excludedLabelsList.length > 0 && (
            <div className='mb-6'>
              <h3 className='text-sm font-semibold text-gray-700 mb-2'>
                除外中のラベル ({excludedLabelsList.length})
              </h3>
              <div className='flex flex-wrap gap-2'>
                {excludedLabelsList.map(label => (
                  <span
                    key={label}
                    className='inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 cursor-pointer hover:bg-red-200'
                    onClick={() => toggleExcludedLabel(label)}
                  >
                    {label}
                    <svg
                      className='ml-1 w-3 h-3'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </span>
                ))}
              </div>
              <button
                onClick={clearExcludedLabels}
                className='mt-2 text-sm text-red-600 hover:text-red-800'
              >
                すべての除外を解除
              </button>
            </div>
          )}

          {/* 利用可能なラベル一覧 */}
          <div>
            <h3 className='text-sm font-semibold text-gray-700 mb-2'>
              利用可能なラベル ({filteredLabels.length})
            </h3>
            {filteredLabels.length === 0 ? (
              <p className='text-sm text-gray-500'>
                {searchTerm
                  ? '該当するラベルが見つかりません'
                  : 'ラベルがありません'}
              </p>
            ) : (
              <div className='space-y-2'>
                {filteredLabels.map(label => {
                  const isExcluded = excludedLabels.has(label);
                  return (
                    <label
                      key={label}
                      className='flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer'
                    >
                      <input
                        type='checkbox'
                        checked={isExcluded}
                        onChange={() => toggleExcludedLabel(label)}
                        className='mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500'
                      />
                      <span
                        className={`text-sm ${
                          isExcluded ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className='p-6 border-t flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}