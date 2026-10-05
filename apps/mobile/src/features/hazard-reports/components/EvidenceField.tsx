import {
  colors,
  MAX_EVIDENCE_ITEMS,
  radius,
  spacing,
  type EvidenceInput,
} from '@lankashield/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import { pickFromGallery, takePhoto, type PickResult } from '../evidence.service';

/** Up to three photos from the camera or gallery, validated as they are added (UC01 step 6). */
export function EvidenceField({
  value,
  onChange,
  disabled,
}: {
  value: EvidenceInput[];
  onChange: (evidence: EvidenceInput[]) => void;
  disabled?: boolean;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const full = value.length >= MAX_EVIDENCE_ITEMS;

  const add = async (pick: () => Promise<PickResult>) => {
    const result = await pick();
    setRejected(result.rejected);
    if (result.added.length > 0) {
      onChange([...value, ...result.added].slice(0, MAX_EVIDENCE_ITEMS));
    }
  };

  return (
    <View style={styles.container}>
      {value.length > 0 ? (
        <View style={styles.thumbs}>
          {value.map((item, index) => (
            <View key={item.uri} style={styles.thumb}>
              <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
              <IconButton
                icon="close"
                size={16}
                mode="contained"
                containerColor={colors.surface}
                iconColor={colors.danger}
                style={styles.remove}
                disabled={disabled}
                accessibilityLabel={`Remove photo ${index + 1}`}
                onPress={() => onChange(value.filter((_, i) => i !== index))}
              />
            </View>
          ))}
        </View>
      ) : null}

      {rejected.map((message, i) => (
        <Text key={i} variant="bodySmall" style={styles.error}>
          {message}
        </Text>
      ))}

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="camera-outline"
          onPress={() => add(takePhoto)}
          disabled={disabled || full}
          style={styles.flex}>
          Take photo
        </Button>
        <Button
          mode="outlined"
          icon="image-multiple-outline"
          onPress={() => add(() => pickFromGallery(value.length))}
          disabled={disabled || full}
          style={styles.flex}>
          Gallery
        </Button>
      </View>
      <Text variant="bodySmall" style={styles.muted}>
        {value.length}/{MAX_EVIDENCE_ITEMS} photos · JPEG or PNG, up to 5 MB each
      </Text>
    </View>
  );
}

const THUMB = 96;

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  thumbs: { flexDirection: 'row', gap: spacing.sm },
  thumb: { width: THUMB, height: THUMB },
  image: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceMuted,
  },
  remove: { position: 'absolute', top: -10, right: -10, margin: 0 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  muted: { color: colors.textSecondary },
  error: { color: colors.danger },
});
