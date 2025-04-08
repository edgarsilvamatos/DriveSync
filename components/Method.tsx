import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { triggerBannerNotification } from './Notifications';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { queueOfflineUpload } from './OfflineQueue';

export const fetchDriveFiles = async (
  token: string,
  setDriveFiles: (files: any[]) => void
) => {
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=trashed=false&orderBy=modifiedTime desc&pageSize=100&fields=files(id,name)',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const json = await res.json();
    if (json.error) {
      Alert.alert('Drive API Error', JSON.stringify(json.error));
    }
    setDriveFiles(json.files || []);
  } catch (err) {
    console.error('Drive fetch failed', err);
  }
};

export const postDriveFile = async (
  accessToken: string,
  fetchDriveFiles: (token: string, setDriveFiles: (files: any[]) => void) => void,
  setDriveFiles: (files: any[]) => void
) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const file = result.assets[0];
    const fileUri = file.uri;
    const fileName = file.name;
    const mimeType = file.mimeType || 'application/octet-stream';

    const isConnected = (await NetInfo.fetch()).isConnected;

    if (!isConnected) {
      await queueOfflineUpload({ uri: fileUri, name: fileName, mimeType });
      triggerBannerNotification('Offline Upload', 'File queued for later upload.');
      return;
    }

    const fileData = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const boundary = 'foo_bar_baz';
    const delimiter = `--${boundary}`;
    const closeDelimiter = `--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType,
    };

    const bodyParts = [
      delimiter,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${mimeType}`,
      'Content-Transfer-Encoding: base64',
      '',
      fileData,
      closeDelimiter,
    ];

    const body = bodyParts.join('\r\n');

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (res.ok) {
      triggerBannerNotification('Upload Complete', 'Your file was uploaded to Drive.');
      fetchDriveFiles(accessToken, setDriveFiles);
      Alert.alert('Upload complete', 'Your file was uploaded to Drive.');
    } else {
      const err = await res.text();
      Alert.alert('Upload failed', err);
    }
  } catch (err) {
    Alert.alert('Upload error', 'Something went wrong.');
  }
};
