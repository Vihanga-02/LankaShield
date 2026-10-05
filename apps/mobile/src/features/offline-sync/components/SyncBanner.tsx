import { useNetworkState } from 'expo-network';
import { useState } from 'react';
import { Banner } from 'react-native-paper';

import { useOfflineQueueStore } from '@/store/offlineQueueStore';

import { syncNow } from '../sync.service';

/** "N reports waiting to sync" with a manual Sync action (Phase 6, step 4). */
export function SyncBanner() {
  const count = useOfflineQueueStore((s) => s.items.length);
  const syncing = useOfflineQueueStore((s) => s.syncing);
  const progress = useOfflineQueueStore((s) => s.progress);
  const network = useNetworkState();
  const [note, setNote] = useState<string | null>(null);
  const offline = network.isConnected === false || network.isInternetReachable === false;

  if (count === 0) return null;

  const label = `${count} report${count === 1 ? '' : 's'} saved on this device`;
  const detail = syncing
    ? `Syncing${progress ? ` ${progress.index + 1} of ${progress.total}` : ''}…`
    : offline
      ? 'They will be sent automatically when you are back online.'
      : (note ?? 'Tap Sync now to send them.');

  return (
    <Banner
      visible
      icon={syncing ? 'sync' : offline ? 'cloud-off-outline' : 'cloud-upload-outline'}
      actions={[
        {
          label: syncing ? 'Syncing…' : 'Sync now',
          disabled: syncing,
          onPress: async () => {
            setNote(null);
            const outcome = await syncNow();
            if (outcome.status === 'offline') setNote("You're offline. Try again when connected.");
            if (outcome.status === 'done' && outcome.summary.failed.length > 0) {
              setNote(`${outcome.summary.failed.length} could not be sent. See the error below.`);
            }
          },
        },
      ]}>
      {`${label}. ${detail}`}
    </Banner>
  );
}
