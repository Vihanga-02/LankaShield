import type { EvidenceInput } from '@lankashield/shared';
import { Directory, File, Paths } from 'expo-file-system';

const reportDir = (reportId: string) => new Directory(Paths.document, 'offline-evidence', reportId);

/**
 * Copies picked images out of the picker's cache (which Android may clear) into the app's
 * document directory, so a queued report still has its photos when it syncs days later.
 */
export async function persistEvidence(
  reportId: string,
  evidence: EvidenceInput[],
): Promise<EvidenceInput[]> {
  if (evidence.length === 0) return [];
  const dir = reportDir(reportId);
  dir.create({ intermediates: true, idempotent: true });

  const persisted: EvidenceInput[] = [];
  for (const [index, item] of evidence.entries()) {
    const target = new File(
      dir,
      `ev-${index + 1}.${item.mimeType === 'image/png' ? 'png' : 'jpg'}`,
    );
    if (item.uri !== target.uri) {
      if (target.exists) target.delete();
      await new File(item.uri).copy(target);
    }
    persisted.push({ ...item, uri: target.uri });
  }
  return persisted;
}

/** Deletes a report's local copies once Firestore has confirmed it. */
export function removePersistedEvidence(reportId: string): void {
  try {
    const dir = reportDir(reportId);
    if (dir.exists) dir.delete();
  } catch {
    // Leftover files only cost storage; never fail a completed sync because of them.
  }
}
