import { z } from 'zod';

import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_BYTES,
  MAX_EVIDENCE_ITEMS,
} from '../constants/limits';
import { HAZARD_TYPES, LOCATION_SOURCES, SEVERITIES } from '../enums';
import { districtSchema, geoPointSchema } from './common';

const maxEvidenceMb = MAX_EVIDENCE_BYTES / (1024 * 1024);

export const geoLocationSchema = geoPointSchema.extend({
  address: z.string().trim().max(200).optional(),
  source: z.enum(LOCATION_SOURCES),
});

/** One selected image before upload (local URI from the image picker). */
export const evidenceInputSchema = z.object({
  uri: z.string().min(1),
  mimeType: z.enum(ALLOWED_EVIDENCE_MIME_TYPES, { error: 'Only JPEG or PNG images are allowed.' }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_EVIDENCE_BYTES, { error: `Each image must be ${maxEvidenceMb} MB or smaller.` }),
});

/** UC01 submit form. Validated before online submission and before saving to the offline queue. */
export const hazardReportInputSchema = z.object({
  hazardType: z.enum(HAZARD_TYPES, { error: 'Select a hazard type.' }),
  severity: z.enum(SEVERITIES, { error: 'Select a severity.' }),
  title: z
    .string()
    .trim()
    .min(5, { error: 'Title must be at least 5 characters.' })
    .max(100, { error: 'Title must be 100 characters or fewer.' }),
  description: z
    .string()
    .trim()
    .min(10, { error: 'Describe the hazard in at least 10 characters.' })
    .max(1000, { error: 'Description must be 1000 characters or fewer.' }),
  district: districtSchema,
  location: geoLocationSchema,
  evidence: z
    .array(evidenceInputSchema)
    .max(MAX_EVIDENCE_ITEMS, { error: `Attach up to ${MAX_EVIDENCE_ITEMS} images.` }),
});

export type EvidenceInput = z.infer<typeof evidenceInputSchema>;
export type HazardReportInput = z.infer<typeof hazardReportInputSchema>;
