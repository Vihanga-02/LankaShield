import { COLLECTIONS, toErrorMessage, type NotificationRecord } from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Card, Text } from 'react-native-paper';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/authStore';

function Inbox({ uid }: { uid: string }) {
  const [records, setRecords] = useState<NotificationRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(db, COLLECTIONS.notifications).withConverter(converters.notifications),
          where('recipientId', '==', uid),
        ),
        (snapshot) => {
          setRecords(
            snapshot.docs
              .map((d) => d.data())
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          );
          setError(null);
        },
        (err) => setError(toErrorMessage(err)),
      ),
    [uid, attempt],
  );
  return (
    <>
      {error ? (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      ) : records === null ? (
        <LoadingState message="Loading notifications..." />
      ) : !records.length ? (
        <EmptyState
          icon="bell-outline"
          title="No notifications"
          message="Warnings and verification results will appear here."
        />
      ) : (
        records.map((record) => (
          <Card key={record.notificationId}>
            <Card.Content>
              <Text variant="titleMedium">{record.title}</Text>
              <Text variant="bodyMedium">{record.body}</Text>
              <Text variant="bodySmall">
                {new Date(record.createdAt).toLocaleString()}
                {record.relatedEntityId ? ' - ' + record.relatedEntityId : ''}
              </Text>
            </Card.Content>
          </Card>
        ))
      )}
    </>
  );
}
export default function NotificationsScreen() {
  const user = useAuthStore((state) => state.user);
  return (
    <ScreenContainer scroll>
      <Text variant="headlineSmall">Notifications</Text>
      {user && <Inbox key={user.uid} uid={user.uid} />}
    </ScreenContainer>
  );
}
