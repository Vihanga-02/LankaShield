import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { HazardType } from '@lankashield/shared';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const HAZARD_ICONS: Record<HazardType, IconName> = {
  FLOOD: 'waves',
  LANDSLIDE: 'landslide',
  CYCLONE: 'weather-hurricane',
  DROUGHT: 'weather-sunny-alert',
  FIRE: 'fire',
  OTHER: 'alert-circle-outline',
};
