import { evidenceInputSchema, MAX_EVIDENCE_ITEMS, type EvidenceInput } from '@lankashield/shared';
import * as ImagePicker from 'expo-image-picker';

export interface PickResult {
  added: EvidenceInput[];
  /** One message per rejected image (unsupported type, too large). */
  rejected: string[];
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Re-encodes to JPEG and keeps uploads small on mobile data.
  quality: 0.7,
};

function guessMimeType(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.mimeType) return asset.mimeType;
  const name = (asset.fileName ?? asset.uri).toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function toEvidence(assets: ImagePicker.ImagePickerAsset[]): PickResult {
  const result: PickResult = { added: [], rejected: [] };
  for (const asset of assets) {
    const candidate = {
      uri: asset.uri,
      mimeType: guessMimeType(asset),
      // Android always reports fileSize; treat a missing size as small rather than block the image.
      sizeBytes: asset.fileSize ?? 1,
    };
    const parsed = evidenceInputSchema.safeParse(candidate);
    if (parsed.success) result.added.push(parsed.data);
    else result.rejected.push(parsed.error.issues[0]?.message ?? 'This image cannot be used.');
  }
  return result;
}

export async function pickFromGallery(alreadySelected: number): Promise<PickResult> {
  const remaining = MAX_EVIDENCE_ITEMS - alreadySelected;
  if (remaining <= 0) return { added: [], rejected: [] };
  const result = await ImagePicker.launchImageLibraryAsync({
    ...PICKER_OPTIONS,
    allowsMultipleSelection: remaining > 1,
    selectionLimit: remaining,
  });
  return result.canceled
    ? { added: [], rejected: [] }
    : toEvidence(result.assets.slice(0, remaining));
}

export async function takePhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return {
      added: [],
      rejected: ['Camera permission was denied. Choose a photo from the gallery.'],
    };
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return result.canceled ? { added: [], rejected: [] } : toEvidence(result.assets);
}
