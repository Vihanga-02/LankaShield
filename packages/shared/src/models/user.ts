import type { UserRole } from '../enums';
import type { IsoDateString } from './common';

/** `users/{uid}` */
export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  district?: string;
  active: boolean;
  createdAt: IsoDateString;
}
