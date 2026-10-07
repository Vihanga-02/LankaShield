import { z } from 'zod';

import { isWithinSriLanka } from '../rules/location';
import { districtSchema, geoPointSchema, optionalPhoneSchema } from './common';

/** UC03 register/edit shelter form. */
export const shelterInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, { error: 'Shelter name must be at least 3 characters.' })
      .max(100, { error: 'Shelter name must be 100 characters or fewer.' }),
    district: districtSchema,
    address: z
      .string()
      .trim()
      .min(5, { error: 'Enter the shelter address.' })
      .max(200, { error: 'Address must be 200 characters or fewer.' }),
    location: geoPointSchema.refine(isWithinSriLanka, {
      error: 'Select a location within Sri Lanka.',
    }),
    capacity: z
      .number({ error: 'Enter the shelter capacity.' })
      .int({ error: 'Capacity must be a whole number.' })
      .min(1, { error: 'Capacity must be at least 1.' })
      .max(100_000, { error: 'Capacity looks too large.' }),
    currentOccupancy: z
      .number({ error: 'Enter the current occupancy.' })
      .int({ error: 'Occupancy must be a whole number.' })
      .min(0, { error: 'Occupancy cannot be negative.' }),
    contactName: z.string().trim().max(100).optional(),
    contactPhone: optionalPhoneSchema,
  })
  .refine((v) => v.currentOccupancy <= v.capacity, {
    error: 'Occupancy cannot exceed capacity.',
    path: ['currentOccupancy'],
  });

/** UC03 allocation form. The capacity check itself happens in the transaction (`allocateEvacuees`). */
export const allocationInputSchema = z.object({
  shelterId: z.string().min(1, { error: 'Select a shelter.' }),
  evacueeCount: z
    .number({ error: 'Enter the number of evacuees.' })
    .int({ error: 'Evacuee count must be a whole number.' })
    .min(1, { error: 'Allocate at least 1 evacuee.' })
    .max(10_000, { error: 'Evacuee count looks too large.' }),
  disasterEventId: z.string().optional(),
});

export type ShelterInput = z.infer<typeof shelterInputSchema>;
export type AllocationInput = z.infer<typeof allocationInputSchema>;
