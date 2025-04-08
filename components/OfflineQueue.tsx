import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_upload_queue';

type OfflineFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export const queueOfflineUpload = async (file: OfflineFile) => {
  const queue = await getQueuedFiles();
  queue.push(file);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueuedFiles = async (): Promise<OfflineFile[]> => {
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearQueuedFiles = async () => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};
