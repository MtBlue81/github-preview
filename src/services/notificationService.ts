import { invoke } from '@tauri-apps/api/core';

export interface NotificationOptions {
  title: string;
  body: string;
}

class NotificationService {
  private permissionGranted = false;

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await invoke<string>(
        'request_notification_permission'
      );
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  async sendNotification({ title, body }: NotificationOptions): Promise<void> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Notification permission not granted');
        return;
      }
    }

    try {
      await invoke('send_notification', { title, body });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async sendPRUpdateNotification(
    prTitle: string,
    changeType: 'new' | 'updated'
  ): Promise<void> {
    const title =
      changeType === 'new' ? '新しいPRがあります' : 'PRが更新されました';
    const body = prTitle;

    await this.sendNotification({ title, body });
  }
}

export const notificationService = new NotificationService();
