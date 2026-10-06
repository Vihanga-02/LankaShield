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
  /** Registered specialist memberships, managed by the account administrator. */
  stakeholderGroups?: import('./stakeholderNotification').Stakeholder[];
  active: boolean;
  createdAt: IsoDateString;
}
