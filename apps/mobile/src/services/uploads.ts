import { STORAGE_PATHS } from '@lankashield/shared';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { withTimeout } from '@/utils/withTimeout';

import { storage } from './firebase';

const UPLOAD_TIMEOUT_MS = 60_000;

// fetch(uri).blob() is unreliable for local files on Android; XMLHttpRequest returns a proper Blob.
function readLocalFile(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error(`Could not read the selected image (${uri}).`));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/**
 * Uploads one evidence image to `hazard-evidence/{reportId}/{evidenceId}.jpg` and returns its
 * download URL. The path is deterministic, so retrying overwrites instead of duplicating.
 */
export async function uploadEvidence(
  reportId: string,
  evidenceId: string,
  localUri: string,
  mimeType: string,
): Promise<string> {
  const blob = await readLocalFile(localUri);
  try {
    const fileRef = ref(storage, STORAGE_PATHS.hazardEvidence(reportId, evidenceId));
    await withTimeout(
      uploadBytes(fileRef, blob, { contentType: mimeType }),
      UPLOAD_TIMEOUT_MS,
      'Uploading a photo took too long. Check your connection and retry.',
    );
    return await withTimeout(getDownloadURL(fileRef), UPLOAD_TIMEOUT_MS);
  } finally {
    // React Native Blobs hold native memory until closed.
    (blob as Blob & { close?: () => void }).close?.();
  }
}
