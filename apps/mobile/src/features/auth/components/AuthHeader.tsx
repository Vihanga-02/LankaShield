import { Image } from 'expo-image';
import { colors, spacing } from '@lankashield/shared';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Image
          source={require('../../../../assets/images/lankashield-logo.png')}
          style={styles.logoImage}
          contentFit="contain"
          accessibilityLabel="LankaShield"
        />
      </View>
      <Text variant="headlineMedium" style={styles.brand}>
        LankaShield
      </Text>
      <Text variant="titleMedium">{title}</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brand: {
    color: colors.primary,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
