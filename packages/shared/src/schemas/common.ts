import { z } from 'zod';

import { DISTRICTS } from '../constants/districts';

export const districtSchema = z.enum(DISTRICTS, { error: 'Select a district.' });

export const geoPointSchema = z.object(
  {
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  },
  { error: 'Select a location.' },
);

/** Sri Lankan phone number: 0XXXXXXXXX or +94XXXXXXXXX. */
export const SRI_LANKA_PHONE_PATTERN = /^(?:\+94|0)\d{9}$/;

/** Optional phone field; an empty string is treated as "not provided". */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || SRI_LANKA_PHONE_PATTERN.test(v), {
    error: 'Enter a valid phone number, e.g. 0771234567 or +94771234567.',
  })
  .optional();
