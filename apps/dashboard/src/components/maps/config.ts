export const MAPS_API_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_WEB_KEY;

export const hasMapsKey = Boolean(MAPS_API_KEY);

/** Google's shared demo Map ID — enough for Advanced Markers in a campus project. */
export const MAP_ID = 'DEMO_MAP_ID';
