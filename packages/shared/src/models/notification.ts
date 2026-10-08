import type { DeliveryStatus, NotificationType, Severity } from '../enums';
import type { IsoDateString } from './common';

/** `notifications/{notificationId}` — in-app notification for one recipient. */
export interface NotificationRecord {
  notificationId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityId?: string;
  read: boolean;
  deliveryStatus: DeliveryStatus;
  createdAt: IsoDateString;
  /** Warnings only (D49): copied from the warning so the app can show them without another read. */
  severity?: Severity;
  expiresAt?: IsoDateString;
}
