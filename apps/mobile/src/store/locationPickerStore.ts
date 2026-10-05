import type { GeoPoint } from '@lankashield/shared';
import { create } from 'zustand';

interface LocationPickerState {
  /** Where the map opens (the current form location, if any). */
  initial: GeoPoint | null;
  /** Set by the form before navigating; the picker screen calls it with the chosen point. */
  onPick: ((point: GeoPoint) => void) | null;
  open: (initial: GeoPoint | null, onPick: (point: GeoPoint) => void) => void;
  close: () => void;
}

/** Hands the chosen map point back from the `/location-picker` screen to the report form. */
export const useLocationPickerStore = create<LocationPickerState>((set) => ({
  initial: null,
  onPick: null,
  open: (initial, onPick) => set({ initial, onPick }),
  close: () => set({ initial: null, onPick: null }),
}));
