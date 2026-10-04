import type { DeliveryStatus, NotificationType } from '../enums';
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
}
