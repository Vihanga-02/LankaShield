/** Firestore collection names (§8.1). */
export const COLLECTIONS = {
  users: 'users',
  hazardReports: 'hazardReports',
  verificationDecisions: 'verificationDecisions',
  warningRequests: 'warningRequests',
  shelters: 'shelters',
  shelterAllocations: 'shelterAllocations',
  disasterEvents: 'disasterEvents',
  responseReports: 'responseReports',
  notifications: 'notifications',
  eventAlerts: 'eventAlerts',
  citizenReach: 'citizenReach',
  shelterOccupancyHistory: 'shelterOccupancyHistory',
  resourceDistributions: 'resourceDistributions',
} as const;

/** Cloud Storage paths (§8.2). */
export const STORAGE_PATHS = {
  hazardEvidence: (reportId: string, evidenceId: string) =>
    `hazard-evidence/${reportId}/${evidenceId}.jpg`,
  profileImage: (uid: string) => `profile-images/${uid}/profile.jpg`,
  generatedReport: (responseReportId: string) => `generated-reports/${responseReportId}/report.pdf`,
} as const;
