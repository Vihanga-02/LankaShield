import type {
  DeliveryStatus,
  DisasterReportStatus,
  HazardReportStatus,
  ShelterStatus,
  SyncStatus,
} from '../enums';
import type { ColorToken } from './theme';

/** Visual presentation of a status (§5.3). Always render the label with the colour. */
export interface StatusPresentation {
  label: string;
  color: ColorToken;
}

export const HAZARD_REPORT_STATUS_PRESENTATION: Record<HazardReportStatus, StatusPresentation> = {
  DRAFT: { label: 'Draft', color: 'textSecondary' },
  PENDING_SYNC: { label: 'Pending Sync', color: 'warning' },
  PENDING_VERIFICATION: { label: 'Pending Verification', color: 'warning' },
  VERIFIED: { label: 'Verified', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
  ESCALATED: { label: 'Escalated', color: 'coralAccent' },
};

export const SYNC_STATUS_PRESENTATION: Record<SyncStatus, StatusPresentation> = {
  LOCAL: { label: 'Draft', color: 'textSecondary' },
  PENDING: { label: 'Pending Sync', color: 'warning' },
  SYNCING: { label: 'Syncing', color: 'info' },
  SYNCED: { label: 'Synced', color: 'success' },
  FAILED: { label: 'Sync Failed', color: 'danger' },
};

export const SHELTER_STATUS_PRESENTATION: Record<ShelterStatus, StatusPresentation> = {
  AVAILABLE: { label: 'Available', color: 'success' },
  NEARLY_FULL: { label: 'Nearly Full', color: 'warning' },
  FULL: { label: 'Full', color: 'danger' },
  CLOSED: { label: 'Closed', color: 'textSecondary' },
};

export const DISASTER_REPORT_STATUS_PRESENTATION: Record<DisasterReportStatus, StatusPresentation> =
  {
    PROVISIONAL: { label: 'Provisional Report', color: 'warning' },
    FINAL: { label: 'Final Report', color: 'success' },
  };

/** Notification delivery (Phase 10). Only SENT notifications reach the recipient's app. */
export const DELIVERY_STATUS_PRESENTATION: Record<DeliveryStatus, StatusPresentation> = {
  SENT: { label: 'Sent', color: 'success' },
  PENDING: { label: 'Pending', color: 'warning' },
  FAILED: { label: 'Failed', color: 'danger' },
};
