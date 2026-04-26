import '@testing-library/jest-dom';
import { beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, mockWindows, clearMocks } from '@tauri-apps/api/mocks';

// 一部の happy-dom + vitest 組み合わせでは globalThis.localStorage が
// 空オブジェクトのまま提供されるケースがあるため、最低限の Web Storage API を polyfill する。
// zustand の persist middleware はモジュール初期化時に localStorage 参照を取り込むため、
// beforeAll より前 (setup.ts のトップレベル) で実行する必要がある。
(function ensureLocalStorage() {
  if (typeof (globalThis as any).localStorage?.setItem === 'function') return;
  const storage = new Map<string, string>();
  const polyfill = {
    getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
    setItem: (k: string, v: string) => {
      storage.set(k, String(v));
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
    clear: () => {
      storage.clear();
    },
    key: (i: number) => Array.from(storage.keys())[i] ?? null,
    get length() {
      return storage.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: polyfill,
  });
})();

// テスト開始前にTauri環境をモック
beforeAll(() => {
  // window.__TAURI_INTERNALS__ を追加 (既存の window getter 群は壊さない)
  (globalThis as any).window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { label: 'main' },
    },
    invoke: vi.fn().mockResolvedValue({}),
  };

  // Tauri APIのモック設定
  mockWindows('main');

  // 基本的なIPCコマンドのモック
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'plugin:opener|open':
      case 'plugin:event|listen':
      case 'plugin:event|unlisten':
      case 'request_notification_permission':
      case 'plugin:window|current_window':
      case 'plugin:window|outer_position':
      case 'plugin:window|outer_size':
      case 'plugin:webview|create_webview_window':
        // 外部ブラウザを開くコマンドのモック
        return Promise.resolve();

      case 'tauri':
        // Tauri内部コマンドのモック
        return Promise.resolve();

      default:
        console.warn(`Unmocked Tauri command: ${cmd}`, args);
        return Promise.resolve();
    }
  });
});

// 各テスト後にモックをクリア
afterEach(() => {
  clearMocks();
  // LocalStorageもクリア（Zustandの永続化用）
  localStorage.clear();
});

// グローバルなテスト用の型拡張
declare global {
  var __TAURI_IPC__: any;
}

// console.errorとconsole.warnをモックしてテスト出力をクリーンに
const originalError = console.error;
const originalWarn = console.warn;
beforeEach(() => {
  console.error = vi.fn((message: any, ...args: any[]) => {
    // React関連のエラーメッセージは無視
    if (
      typeof message === 'string' &&
      (message.includes('Should not already be working') ||
        message.includes('Cannot read properties of undefined') ||
        message.includes('Failed to setup focus listener') ||
        message.includes('Failed to request notification permission'))
    ) {
      return;
    }
    originalError(message, ...args);
  });
  console.warn = vi.fn((message: any, ...args: any[]) => {
    // Tauri関連の警告は無視
    if (
      typeof message === 'string' &&
      (message.includes('Unmocked Tauri command') ||
        message.includes('Failed to setup focus listener') ||
        message.includes('Failed to request notification permission'))
    ) {
      return;
    }
    originalWarn(message, ...args);
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
