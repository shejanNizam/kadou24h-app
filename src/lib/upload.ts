/**
 * Pick → compress → POST /upload. Photos are resized (max 1280 px, JPEG 70%)
 * before upload: Guinea has slow, expensive data and the server caps at 5 MB.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { refreshSession } from '@/lib/api/baseQuery';
import { config } from '@/lib/config';
import { store } from '@/store';
import type { ApiEnvelope, FileRef } from '@/types/api';

const MAX_SIDE = 1280;

export class UploadError extends Error {}

/** Opens the camera or the gallery. Returns null when the user cancels. */
export async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new UploadError('permission');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera' && Platform.OS !== 'web'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

async function compress(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_SIDE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Compresses and uploads one image; returns { url, publicId }. */
export async function uploadImage(uri: string): Promise<FileRef> {
  const compressed = await compress(uri).catch(() => uri);
  return uploadFile(compressed, { name: 'photo.jpg', type: 'image/jpeg' });
}

/** Uploads any local file (voice note, document) as multipart `files`. */
export async function uploadFile(uri: string, file: { name: string; type: string }): Promise<FileRef> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('files', blob, file.name);
  } else {
    // React Native's FormData takes { uri, name, type }
    form.append('files', { uri, name: file.name, type: file.type } as unknown as Blob);
  }

  const post = () => {
    const token = store.getState().auth.accessToken;
    return fetch(`${config.apiUrl}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  };
  let res = await post();
  // Expired token (chat left open a while): refresh once and retry, like every other API call
  if (res.status === 401 && (await refreshSession(store.getState, store.dispatch))) res = await post();
  const json = (await res.json().catch(() => null)) as ApiEnvelope<FileRef> | null;
  if (!res.ok || !json?.data?.url) throw new UploadError(json?.message ?? 'upload');
  return json.data;
}
