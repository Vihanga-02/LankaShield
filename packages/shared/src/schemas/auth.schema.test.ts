import { describe, expect, it } from 'vitest';

import { toErrorMessage } from '../constants/errorMessages';
import { AppError } from '../constants/errors';
import { isDashboardRole, isMobileRole } from '../rules/roles';
import { loginInputSchema, registerInputSchema } from './auth.schema';

const paths = (r: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('loginInputSchema', () => {
  it('trims the email and accepts valid credentials', () => {
    const result = loginInputSchema.parse({ email: ' a@b.com ', password: 'x' });
    expect(result.email).toBe('a@b.com');
  });

  it('reports missing and invalid fields', () => {
    expect(paths(loginInputSchema.safeParse({ email: 'not-an-email', password: '' }))).toEqual([
      'email',
      'password',
    ]);
  });
});

describe('registerInputSchema', () => {
  const valid = {
    fullName: 'Nimal Perera',
    email: 'nimal@example.com',
    phone: '0771234567',
    password: 'secret1',
    confirmPassword: 'secret1',
    role: 'CITIZEN',
    district: 'Ratnapura',
  };

  it('accepts a citizen or volunteer registration', () => {
    expect(registerInputSchema.safeParse(valid).success).toBe(true);
    expect(registerInputSchema.safeParse({ ...valid, role: 'VOLUNTEER', phone: '' }).success).toBe(
      true,
    );
  });

  it('requires a home district', () => {
    expect(paths(registerInputSchema.safeParse({ ...valid, district: undefined }))).toEqual([
      'district',
    ]);
    expect(paths(registerInputSchema.safeParse({ ...valid, district: 'Atlantis' }))).toEqual([
      'district',
    ]);
  });

  it('does not allow self-registration as an officer', () => {
    expect(paths(registerInputSchema.safeParse({ ...valid, role: 'DUTY_OFFICER' }))).toEqual([
      'role',
    ]);
  });

  it('requires matching passwords of at least 6 characters', () => {
    expect(paths(registerInputSchema.safeParse({ ...valid, confirmPassword: 'other1' }))).toEqual([
      'confirmPassword',
    ]);
    expect(
      paths(registerInputSchema.safeParse({ ...valid, password: '123', confirmPassword: '123' })),
    ).toEqual(['password']);
  });
});

describe('roles', () => {
  it('separates mobile and dashboard roles', () => {
    expect(isMobileRole('CITIZEN') && isMobileRole('VOLUNTEER')).toBe(true);
    expect(isMobileRole('DUTY_OFFICER')).toBe(false);
    expect(isDashboardRole('DMC_ANALYST')).toBe(true);
    expect(isDashboardRole('VOLUNTEER')).toBe(false);
  });
});

describe('toErrorMessage', () => {
  it('maps Firebase Auth codes and app errors to user messages', () => {
    expect(toErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'Incorrect email or password.',
    );
    expect(toErrorMessage(new AppError('UNAUTHENTICATED', 'Use the dashboard.'))).toBe(
      'Use the dashboard.',
    );
    expect(toErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
  });
});
