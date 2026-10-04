import { z } from 'zod';

import { MOBILE_ROLES } from '../enums';
import { optionalPhoneSchema } from './common';

/** Firebase Auth minimum password length. */
export const MIN_PASSWORD_LENGTH = 6;

const emailSchema = z
  .string()
  .trim()
  .min(1, { error: 'Enter your email address.' })
  .pipe(z.email({ error: 'Enter a valid email address.' }));

/** Login form for both apps. */
export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password.' }),
});

/** Mobile registration form — only Citizen and Volunteer accounts can self-register. */
export const registerInputSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, { error: 'Enter your full name.' })
      .max(100, { error: 'Name must be 100 characters or fewer.' }),
    email: emailSchema,
    phone: optionalPhoneSchema,
    password: z.string().min(MIN_PASSWORD_LENGTH, {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    }),
    confirmPassword: z.string(),
    role: z.enum(MOBILE_ROLES, { error: 'Choose Citizen or Community Volunteer.' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    error: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
