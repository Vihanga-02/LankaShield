import type { UserRole } from '../enums';
import type { IsoDateString } from './common';
import type { District } from '../constants/districts';

/** `users/{uid}` */
export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  district?: District;
  active: boolean;
  createdAt: IsoDateString;
}
