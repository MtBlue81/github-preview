import '@testing-library/jest-dom';
import { beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, mockWindows, clearMocks } from '@tauri-apps/api/mocks';

// テスト開始前にTauri環境をモック
beforeAll(() => {
  // window.__TAURI_INTERNALS__を設定
  (globalThis as any).window = {
    ...(globalThis.window || {}),
    __TAURI_INTERNALS__: {
      metadata: {
        currentWindow: { label: 'main' },
        currentWebview: { label: 'main' },
      },
      invoke: vi.fn().mockResolvedValue({}),
    },
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
