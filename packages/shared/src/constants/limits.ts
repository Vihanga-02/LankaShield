/** Maximum evidence images per hazard report (UC01). */
export const MAX_EVIDENCE_ITEMS = 3;

/** Maximum size of one evidence image. */
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_EVIDENCE_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

/** Shelter status thresholds (UC03): below 80% available, 80–99% nearly full, 100% full. */
export const SHELTER_NEARLY_FULL_RATIO = 0.8;
