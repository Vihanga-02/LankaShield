import { colors, layout, spacing } from '@lankashield/shared';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/services/firebase';

// Placeholder entry screen. Replaced by session restore + auth routing in Phase 4.
export default function IndexScreen() {
  // Temporary Phase 2 connection check — remove in Phase 4.
  const [connection, setConnection] = useState('Checking Firebase connection…');

  useEffect(() => {
    getDoc(doc(db, '_connectionTest', 'ping'))
      .then((snap) => setConnection(`Firebase: ${snap.data()?.message ?? 'test document missing'}`))
      .catch((err: Error) => setConnection(`Firebase error: ${err.message}`));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LankaShield</Text>
        <Text style={styles.subtitle}>Disaster early-warning and emergency coordination</Text>
        <Text style={styles.subtitle}>{connection}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.mobilePagePadding,
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
