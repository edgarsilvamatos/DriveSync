import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueuedFiles, clearQueuedFiles } from './OfflineQueue';
import * as FileSystem from 'expo-file-system';

export const useUploadRetry = (
  accessToken: string | null,
  fetchDriveFiles: any,
  setDriveFiles: any,
  triggerBannerNotification: (titel: string, body: string) => void
) => {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || !accessToken) return;

      const queue = await getQueuedFiles();
      if (!queue.length) return;

      for (const file of queue) {
        const fileData = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const metadata = { name: file.name, mimeType: file.mimeType };
        const boundary = 'foo_bar_baz';
        const body = `
--${boundary}
Content-Type: application/json; charset=UTF-8

${JSON.stringify(metadata)}
--${boundary}
Content-Type: ${file.mimeType}
Content-Transfer-Encoding: base64

${fileData}
--${boundary}--`;

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        });
      }

      triggerBannerNotification('Uploads synced', 'Offline uploads synced');
      await clearQueuedFiles();
      fetchDriveFiles(accessToken, setDriveFiles);
    });

    return () => unsubscribe();
  }, [accessToken]);
};
