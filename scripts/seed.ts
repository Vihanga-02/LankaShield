/**
 * Loads deterministic demo data into the Firebase project configured in apps/dashboard/.env (D4).
 *
 *   SEED_DEMO_PASSWORD=<password> npm run seed      (PowerShell: $env:SEED_DEMO_PASSWORD="..."; npm run seed)
 *
 * Every document has a fixed ID, so running the script again overwrites the demo data instead of
 * duplicating it. Demo users are created on the first run and signed in on later runs.
 */
import {
  calculateAvailableCapacity,
  COLLECTIONS,
  deriveShelterStatus,
  OUTCOME_TO_REPORT_STATUS,
  type AppUser,
  type DeliveryStatus,
  type DisasterEvent,
  type District,
  type EmergencyShelter,
  type HazardReport,
  type HazardType,
  type MobileRole,
  type NotificationRecord,
  type Severity,
  type ShelterAllocation,
  type UserRole,
  type VerificationDecision,
  type VerificationOutcome,
  type WarningRequest,
} from '@lankashield/shared';
import { converters } from '@lankashield/shared/firestore';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { doc, getFirestore, writeBatch, type FirestoreDataConverter } from 'firebase/firestore';

// ---------------------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✖ ${name} is not set.`);
    if (name === 'SEED_DEMO_PASSWORD') {
      console.error('  Set a demo password (min 6 characters) for this terminal session, e.g.');
      console.error('  PowerShell:  $env:SEED_DEMO_PASSWORD="your-password"; npm run seed');
      console.error('  Bash:        SEED_DEMO_PASSWORD=your-password npm run seed');
    } else {
      console.error('  Fill in apps/dashboard/.env (copy it from .env.example).');
    }
    process.exit(1);
  }
  return value;
}

const password = requireEnv('SEED_DEMO_PASSWORD');
if (password.length < 6) {
  console.error('✖ SEED_DEMO_PASSWORD must be at least 6 characters (Firebase Auth minimum).');
  process.exit(1);
}

const app = initializeApp({
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
});
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------------------------------------------
// Demo users — one per role
// ---------------------------------------------------------------------------------------------

type DemoUserKey = 'citizen' | 'volunteer' | 'dutyOfficer' | 'districtOfficer' | 'analyst';

const DEMO_USERS: Record<
  DemoUserKey,
  { fullName: string; email: string; role: UserRole; district?: District; phone?: string }
> = {
  citizen: {
    fullName: 'Nimal Perera',
    email: 'citizen.demo@example.com',
    role: 'CITIZEN',
    district: 'Ratnapura',
    phone: '0771234567',
  },
  volunteer: {
    fullName: 'Kumari Silva',
    email: 'volunteer.demo@example.com',
    role: 'VOLUNTEER',
    district: 'Kalutara',
    phone: '0712345678',
  },
  dutyOfficer: {
    fullName: 'Ruwan Jayasinghe',
    email: 'duty.officer.demo@example.com',
    role: 'DUTY_OFFICER',
    district: 'Ratnapura',
  },
  districtOfficer: {
    fullName: 'Shalini Fernando',
    email: 'district.officer.demo@example.com',
    role: 'DISTRICT_OFFICER',
    district: 'Ratnapura',
  },
  analyst: {
    fullName: 'Dilan Wickramasinghe',
    email: 'analyst.demo@example.com',
    role: 'DMC_ANALYST',
  },
};

async function ensureUser(authInstance: Auth, email: string): Promise<string> {
  try {
    const { user } = await createUserWithEmailAndPassword(authInstance, email, password);
    return user.uid;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/email-already-in-use') {
      try {
        const { user } = await signInWithEmailAndPassword(authInstance, email, password);
        return user.uid;
      } catch {
        throw new Error(
          `${email} already exists with a different password. Use the original SEED_DEMO_PASSWORD, ` +
            'or delete the user in Firebase console → Authentication and run the seed again.',
        );
      }
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'Enable Email/Password in Firebase console → Authentication → Sign-in method.',
      );
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------------------------
// Demo data definitions
// ---------------------------------------------------------------------------------------------

const EVENTS: DisasterEvent[] = [
  {
    eventId: 'EVT-SEED-RAT-2025',
    name: 'Ratnapura Floods — May 2025',
    hazardType: 'FLOOD',
    district: 'Ratnapura',
    status: 'COMPLETED',
    startedAt: '2025-05-20T00:00:00.000Z',
    endedAt: '2025-05-30T00:00:00.000Z',
  },
  {
    eventId: 'EVT-SEED-KAL-2025',
    name: 'Kalutara Landslides — November 2025',
    hazardType: 'LANDSLIDE',
    district: 'Kalutara',
    status: 'COMPLETED',
    startedAt: '2025-11-03T00:00:00.000Z',
    endedAt: '2025-11-12T00:00:00.000Z',
  },
  {
    eventId: 'EVT-SEED-RAT-2026',
    name: 'Ratnapura Floods — October 2026',
    hazardType: 'FLOOD',
    district: 'Ratnapura',
    status: 'ACTIVE',
    startedAt: '2026-10-01T00:00:00.000Z',
  },
];

interface ReportSpec {
  n: number;
  reporter: Extract<DemoUserKey, 'citizen' | 'volunteer'>;
  hazardType: HazardType;
  severity: Severity;
  title: string;
  description: string;
  district: District;
  latitude: number;
  longitude: number;
  createdAt: string;
  /** Omitted for reports still waiting for verification. */
  review?: {
    outcome: VerificationOutcome;
    eventId?: string;
    remarks: string;
    delivery: DeliveryStatus;
  };
}

const [RAT_2025, KAL_2025, RAT_2026] = EVENTS.map((e) => e.eventId);

const REPORTS: ReportSpec[] = [
  // Ratnapura Floods — May 2025 (completed, every report reviewed → FINAL)
  {
    n: 1,
    reporter: 'citizen',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'Kalu Ganga overflowing near the town bridge',
    description: 'River level is above the bridge footpath and still rising after heavy rain.',
    district: 'Ratnapura',
    latitude: 6.6828,
    longitude: 80.3992,
    createdAt: '2025-05-21T03:15:00.000Z',
    review: {
      outcome: 'VERIFIED_INFO',
      eventId: RAT_2025,
      remarks: 'Confirmed with river gauge readings.',
      delivery: 'SENT',
    },
  },
  {
    n: 2,
    reporter: 'volunteer',
    hazardType: 'FLOOD',
    severity: 'EXTREME',
    title: 'Houses submerged in Kuruwita lowlands',
    description: 'About twenty houses are under water and several families are on rooftops.',
    district: 'Ratnapura',
    latitude: 6.7767,
    longitude: 80.3678,
    createdAt: '2025-05-21T06:40:00.000Z',
    review: {
      outcome: 'VERIFIED_ESCALATED',
      eventId: RAT_2025,
      remarks: 'Families stranded; escalated for warning assessment.',
      delivery: 'SENT',
    },
  },
  {
    n: 3,
    reporter: 'citizen',
    hazardType: 'LANDSLIDE',
    severity: 'MODERATE',
    title: 'Cracks on slope above Pelmadulla road',
    description: 'New cracks have appeared on the slope above the main road since this morning.',
    district: 'Ratnapura',
    latitude: 6.6236,
    longitude: 80.5422,
    createdAt: '2025-05-22T09:05:00.000Z',
    review: { outcome: 'VERIFIED_INFO', eventId: RAT_2025, remarks: '', delivery: 'SENT' },
  },
  {
    n: 4,
    reporter: 'citizen',
    hazardType: 'FLOOD',
    severity: 'LOW',
    title: 'Water on the road at Muwagama',
    description: 'Shallow water across the road near the Muwagama junction.',
    district: 'Ratnapura',
    latitude: 6.6901,
    longitude: 80.3887,
    createdAt: '2025-05-23T11:20:00.000Z',
    review: {
      outcome: 'REJECTED',
      eventId: RAT_2025,
      remarks: 'Duplicate of an earlier report for the same location.',
      delivery: 'SENT',
    },
  },
  {
    n: 5,
    reporter: 'volunteer',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'Flood water entering Eheliyagoda hospital grounds',
    description: 'Water is entering the hospital car park and the outpatient entrance.',
    district: 'Ratnapura',
    latitude: 6.8486,
    longitude: 80.2717,
    createdAt: '2025-05-24T07:30:00.000Z',
    review: {
      outcome: 'VERIFIED_INFO',
      eventId: RAT_2025,
      remarks: 'Hospital administration confirmed.',
      delivery: 'SENT',
    },
  },

  // Kalutara Landslides — November 2025 (completed, every report reviewed → FINAL)
  {
    n: 6,
    reporter: 'volunteer',
    hazardType: 'LANDSLIDE',
    severity: 'EXTREME',
    title: 'Landslide blocking Bulathsinhala road',
    description: 'A large landslide has blocked the road and damaged two houses below it.',
    district: 'Kalutara',
    latitude: 6.6667,
    longitude: 80.1667,
    createdAt: '2025-11-04T02:10:00.000Z',
    review: {
      outcome: 'VERIFIED_ESCALATED',
      eventId: KAL_2025,
      remarks: 'Road blocked and residents at risk; escalated.',
      delivery: 'SENT',
    },
  },
  {
    n: 7,
    reporter: 'citizen',
    hazardType: 'LANDSLIDE',
    severity: 'HIGH',
    title: 'Earth slipping behind houses in Agalawatta',
    description: 'Soil is slipping down the hill behind a row of houses after two days of rain.',
    district: 'Kalutara',
    latitude: 6.5422,
    longitude: 80.1556,
    createdAt: '2025-11-05T05:45:00.000Z',
    review: { outcome: 'VERIFIED_INFO', eventId: KAL_2025, remarks: '', delivery: 'SENT' },
  },
  {
    n: 8,
    reporter: 'citizen',
    hazardType: 'FLOOD',
    severity: 'MODERATE',
    title: 'Drains overflowing in Horana town',
    description: 'Storm drains are overflowing onto the main street in Horana.',
    district: 'Kalutara',
    latitude: 6.7159,
    longitude: 80.0626,
    createdAt: '2025-11-06T13:00:00.000Z',
    review: {
      outcome: 'VERIFIED_INFO',
      eventId: KAL_2025,
      remarks: 'Verified with the local Grama Niladhari.',
      delivery: 'FAILED',
    },
  },
  {
    n: 9,
    reporter: 'citizen',
    hazardType: 'OTHER',
    severity: 'LOW',
    title: 'Fallen tree on village path',
    description: 'A tree has fallen across the footpath to the village temple.',
    district: 'Kalutara',
    latitude: 6.6012,
    longitude: 80.0881,
    createdAt: '2025-11-07T08:25:00.000Z',
    review: {
      outcome: 'REJECTED',
      eventId: KAL_2025,
      remarks: 'Not a disaster hazard; referred to the local council.',
      delivery: 'SENT',
    },
  },

  // Ratnapura Floods — October 2026 (active, two reports unreviewed → PROVISIONAL / incomplete)
  {
    n: 10,
    reporter: 'citizen',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'Kalu Ganga rising quickly at Ratnapura town',
    description: 'River has risen about one metre in two hours near the market.',
    district: 'Ratnapura',
    latitude: 6.6845,
    longitude: 80.4021,
    createdAt: '2026-10-02T04:00:00.000Z',
    review: {
      outcome: 'VERIFIED_ESCALATED',
      eventId: RAT_2026,
      remarks: 'Rapid rise confirmed by the irrigation department; escalated.',
      delivery: 'SENT',
    },
  },
  {
    n: 11,
    reporter: 'volunteer',
    hazardType: 'FLOOD',
    severity: 'MODERATE',
    title: 'Paddy fields flooded in Elapatha',
    description: 'Most paddy fields along the Elapatha road are under water.',
    district: 'Ratnapura',
    latitude: 6.6597,
    longitude: 80.3631,
    createdAt: '2026-10-02T09:30:00.000Z',
    review: { outcome: 'VERIFIED_INFO', eventId: RAT_2026, remarks: '', delivery: 'PENDING' },
  },
  {
    n: 12,
    reporter: 'volunteer',
    hazardType: 'LANDSLIDE',
    severity: 'HIGH',
    title: 'Small landslide near Kiriella school',
    description: 'A small landslide has reached the school boundary wall.',
    district: 'Ratnapura',
    latitude: 6.7547,
    longitude: 80.2669,
    createdAt: '2026-10-03T06:15:00.000Z',
    review: {
      outcome: 'VERIFIED_INFO',
      eventId: RAT_2026,
      remarks: 'School closed as a precaution.',
      delivery: 'SENT',
    },
  },
  {
    n: 13,
    reporter: 'citizen',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    title: 'Water entering homes in Kahangama',
    description: 'Water is entering houses on the lower side of Kahangama village.',
    district: 'Ratnapura',
    latitude: 6.7072,
    longitude: 80.4105,
    createdAt: '2026-10-04T03:50:00.000Z',
  },
  {
    n: 14,
    reporter: 'citizen',
    hazardType: 'CYCLONE',
    severity: 'MODERATE',
    title: 'Strong winds damaging roofs in Ratnapura',
    description: 'Strong winds have blown roof sheets off several houses on Hospital Road.',
    district: 'Ratnapura',
    latitude: 6.6799,
    longitude: 80.3948,
    createdAt: '2026-10-04T10:10:00.000Z',
  },

  // Kalutara, not linked to any event, waiting for review
  {
    n: 15,
    reporter: 'volunteer',
    hazardType: 'FLOOD',
    severity: 'LOW',
    title: 'Minor flooding at Panadura junction',
    description: 'Rainwater is collecting at the Panadura junction and slowing traffic.',
    district: 'Kalutara',
    latitude: 6.7132,
    longitude: 79.9026,
    createdAt: '2026-10-04T12:00:00.000Z',
  },
];

interface ShelterSpec {
  n: number;
  name: string;
  district: District;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  closed?: boolean;
  contactName: string;
  contactPhone: string;
}

const SHELTERS: ShelterSpec[] = [
  {
    n: 1,
    name: 'Ratnapura Central College',
    district: 'Ratnapura',
    address: 'Colombo Road, Ratnapura',
    latitude: 6.6858,
    longitude: 80.3986,
    capacity: 300,
    contactName: 'A. Gunasekara',
    contactPhone: '0452222101',
  },
  {
    n: 2,
    name: 'Sivali Central College Hall',
    district: 'Ratnapura',
    address: 'Main Street, Ratnapura',
    latitude: 6.6812,
    longitude: 80.4044,
    capacity: 150,
    contactName: 'P. Ranasinghe',
    contactPhone: '0452222102',
  },
  {
    n: 3,
    name: 'Kuruwita Temple Community Hall',
    district: 'Ratnapura',
    address: 'Temple Road, Kuruwita',
    latitude: 6.7781,
    longitude: 80.3661,
    capacity: 80,
    contactName: 'Ven. Sumana Thero',
    contactPhone: '0452262103',
  },
  {
    n: 4,
    name: 'Horana Community Centre',
    district: 'Kalutara',
    address: 'Panadura Road, Horana',
    latitude: 6.7171,
    longitude: 80.0612,
    capacity: 200,
    contactName: 'M. Dissanayake',
    contactPhone: '0342261104',
  },
  {
    n: 5,
    name: 'Agalawatta Divisional Secretariat Hall',
    district: 'Kalutara',
    address: 'Matugama Road, Agalawatta',
    latitude: 6.5409,
    longitude: 80.1572,
    capacity: 120,
    contactName: 'S. Herath',
    contactPhone: '0342247105',
  },
  {
    n: 6,
    name: 'Bulathsinhala School Hall',
    district: 'Kalutara',
    address: 'School Lane, Bulathsinhala',
    latitude: 6.6672,
    longitude: 80.1651,
    capacity: 100,
    closed: true,
    contactName: 'R. Bandara',
    contactPhone: '0342283106',
  },
];

/** Allocations for completed events are historical; only the active event's confirmed allocations fill shelters today. */
const ALLOCATIONS: {
  n: number;
  shelter: number;
  eventId: string;
  count: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}[] = [
  {
    n: 1,
    shelter: 1,
    eventId: RAT_2025,
    count: 150,
    status: 'CONFIRMED',
    createdAt: '2025-05-21T10:00:00.000Z',
  },
  {
    n: 2,
    shelter: 2,
    eventId: RAT_2025,
    count: 90,
    status: 'CONFIRMED',
    createdAt: '2025-05-22T08:00:00.000Z',
  },
  {
    n: 3,
    shelter: 4,
    eventId: KAL_2025,
    count: 60,
    status: 'CONFIRMED',
    createdAt: '2025-11-04T09:00:00.000Z',
  },
  {
    n: 4,
    shelter: 5,
    eventId: KAL_2025,
    count: 45,
    status: 'CONFIRMED',
    createdAt: '2025-11-05T11:00:00.000Z',
  },
  {
    n: 5,
    shelter: 1,
    eventId: RAT_2026,
    count: 120,
    status: 'CONFIRMED',
    createdAt: '2026-10-02T07:00:00.000Z',
  },
  {
    n: 6,
    shelter: 1,
    eventId: RAT_2026,
    count: 60,
    status: 'CONFIRMED',
    createdAt: '2026-10-03T08:30:00.000Z',
  },
  {
    n: 7,
    shelter: 2,
    eventId: RAT_2026,
    count: 100,
    status: 'CONFIRMED',
    createdAt: '2026-10-02T08:00:00.000Z',
  },
  {
    n: 8,
    shelter: 2,
    eventId: RAT_2026,
    count: 25,
    status: 'CONFIRMED',
    createdAt: '2026-10-03T09:00:00.000Z',
  },
  {
    n: 9,
    shelter: 3,
    eventId: RAT_2026,
    count: 80,
    status: 'CONFIRMED',
    createdAt: '2026-10-02T09:15:00.000Z',
  },
  {
    n: 10,
    shelter: 1,
    eventId: RAT_2026,
    count: 30,
    status: 'CANCELLED',
    createdAt: '2026-10-03T10:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------------------------
// Build documents
// ---------------------------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(3, '0');
const plusHours = (iso: string, hours: number) =>
  new Date(Date.parse(iso) + hours * 3_600_000).toISOString();

const NOTIFICATION_TITLES: Record<VerificationOutcome, string> = {
  VERIFIED_INFO: 'Your hazard report was verified',
  REJECTED: 'Your hazard report was rejected',
  VERIFIED_ESCALATED: 'Your hazard report was verified and escalated',
};

function buildDocuments(uids: Record<DemoUserKey, string>) {
  const createdAt = '2025-05-01T00:00:00.000Z';
  const users: AppUser[] = (Object.keys(DEMO_USERS) as DemoUserKey[]).map((key) => ({
    uid: uids[key],
    ...DEMO_USERS[key],
    active: true,
    createdAt,
  }));

  const hazardReports: HazardReport[] = [];
  const decisions: VerificationDecision[] = [];
  const warnings: WarningRequest[] = [];
  const notifications: NotificationRecord[] = [];

  for (const spec of REPORTS) {
    const reportId = `LS-SEED-${pad(spec.n)}`;
    const decidedAt = plusHours(spec.createdAt, 2);
    const review = spec.review;
    const decisionId = `VD-SEED-${pad(spec.n)}`;

    hazardReports.push({
      reportId,
      reporterId: uids[spec.reporter],
      reporterRole: DEMO_USERS[spec.reporter].role as MobileRole,
      hazardType: spec.hazardType,
      severity: spec.severity,
      title: spec.title,
      description: spec.description,
      location: { latitude: spec.latitude, longitude: spec.longitude, source: 'GPS' },
      evidenceUrls: [],
      status: review ? OUTCOME_TO_REPORT_STATUS[review.outcome] : 'PENDING_VERIFICATION',
      district: spec.district,
      disasterEventId: review?.eventId,
      latestDecision: review
        ? {
            decisionId,
            officerId: uids.dutyOfficer,
            officerName: DEMO_USERS.dutyOfficer.fullName,
            outcome: review.outcome,
            remarks: review.remarks,
            decidedAt,
          }
        : undefined,
      createdAt: spec.createdAt,
      updatedAt: review ? decidedAt : spec.createdAt,
      clientCreatedAt: spec.createdAt,
      syncSource: 'ONLINE',
    });

    if (!review) continue;

    decisions.push({
      decisionId,
      reportId,
      officerId: uids.dutyOfficer,
      officerName: DEMO_USERS.dutyOfficer.fullName,
      outcome: review.outcome,
      remarks: review.remarks,
      disasterEventId: review.eventId,
      decidedAt,
      notificationStatus: review.delivery,
    });

    const eventActive = EVENTS.find((e) => e.eventId === review.eventId)?.status === 'ACTIVE';

    notifications.push({
      notificationId: `NT-SEED-${pad(spec.n)}`,
      recipientId: uids[spec.reporter],
      type: 'VERIFICATION_RESULT',
      title: NOTIFICATION_TITLES[review.outcome],
      body: review.remarks ? `${spec.title} — ${review.remarks}` : spec.title,
      relatedEntityId: reportId,
      read: !eventActive,
      deliveryStatus: review.delivery,
      createdAt: decidedAt,
    });

    if (review.outcome === 'VERIFIED_ESCALATED') {
      const warningRequestId = `WR-SEED-${pad(spec.n)}`;
      warnings.push({
        warningRequestId,
        sourceReportId: reportId,
        requestedBy: uids.dutyOfficer,
        hazardType: spec.hazardType,
        severity: spec.severity,
        affectedDistrict: spec.district,
        status: eventActive ? 'PENDING_ASSESSMENT' : 'APPROVED',
        deliveryStatus: eventActive ? 'PENDING' : 'SENT',
        createdAt: decidedAt,
      });

      // Active requests await assessment; only completed examples have sent warnings.
      if (eventActive) continue;

      // A district-wide warning sent to both mobile demo users.
      for (const recipient of ['citizen', 'volunteer'] as const) {
        notifications.push({
          notificationId: `NT-SEED-W${pad(spec.n)}-${recipient}`,
          recipientId: uids[recipient],
          type: 'WARNING',
          title: `${spec.hazardType === 'FLOOD' ? 'Flood' : 'Landslide'} warning: ${spec.district}`,
          body: `Authorities are assessing a ${spec.severity.toLowerCase()} ${spec.hazardType.toLowerCase()} risk in ${spec.district}. Follow official instructions.`,
          relatedEntityId: warningRequestId,
          read: !eventActive,
          deliveryStatus: 'SENT',
          createdAt: plusHours(decidedAt, 1),
        });
      }
    }
  }

  const activeEventIds = new Set(EVENTS.filter((e) => e.status === 'ACTIVE').map((e) => e.eventId));

  const allocations: ShelterAllocation[] = ALLOCATIONS.map((a) => ({
    allocationId: `AL-SEED-${pad(a.n)}`,
    shelterId: `SH-SEED-${pad(a.shelter)}`,
    disasterEventId: a.eventId,
    officerId: uids.districtOfficer,
    evacueeCount: a.count,
    status: a.status,
    createdAt: a.createdAt,
  }));

  const shelters: EmergencyShelter[] = SHELTERS.map((s) => {
    const shelterId = `SH-SEED-${pad(s.n)}`;
    const currentOccupancy = s.closed
      ? 0
      : ALLOCATIONS.filter(
          (a) => a.shelter === s.n && a.status === 'CONFIRMED' && activeEventIds.has(a.eventId),
        ).reduce((sum, a) => sum + a.count, 0);
    return {
      shelterId,
      name: s.name,
      district: s.district,
      address: s.address,
      location: { latitude: s.latitude, longitude: s.longitude },
      capacity: s.capacity,
      currentOccupancy,
      availableCapacity: calculateAvailableCapacity(s.capacity, currentOccupancy),
      status: deriveShelterStatus(s.capacity, currentOccupancy, s.closed ? 'CLOSED' : undefined),
      contactName: s.contactName,
      contactPhone: s.contactPhone,
      updatedAt: '2026-10-04T12:00:00.000Z',
    };
  });

  return { users, hazardReports, decisions, warnings, notifications, allocations, shelters };
}

// ---------------------------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------------------------

async function main() {
  console.log(`Seeding Firebase project "${process.env.VITE_FIREBASE_PROJECT_ID}"…\n`);

  const uids = {} as Record<DemoUserKey, string>;
  for (const key of Object.keys(DEMO_USERS) as DemoUserKey[]) {
    uids[key] = await ensureUser(auth, DEMO_USERS[key].email);
    await signOut(auth);
  }
  // Write as a signed-in officer so the signed-in-only rules (§9.4) also allow the seed.
  await signInWithEmailAndPassword(auth, DEMO_USERS.dutyOfficer.email, password);

  const data = buildDocuments(uids);
  const batch = writeBatch(db);
  let writes = 0;

  function setAll<T>(
    collectionName: string,
    converter: FirestoreDataConverter<T>,
    items: T[],
    id: (item: T) => string,
  ) {
    for (const item of items) {
      batch.set(doc(db, collectionName, id(item)).withConverter(converter), item);
      writes++;
    }
  }

  setAll(COLLECTIONS.users, converters.users, data.users, (u) => u.uid);
  setAll(COLLECTIONS.disasterEvents, converters.disasterEvents, EVENTS, (e) => e.eventId);
  setAll(
    COLLECTIONS.hazardReports,
    converters.hazardReports,
    data.hazardReports,
    (r) => r.reportId,
  );
  setAll(
    COLLECTIONS.verificationDecisions,
    converters.verificationDecisions,
    data.decisions,
    (d) => d.decisionId,
  );
  setAll(
    COLLECTIONS.warningRequests,
    converters.warningRequests,
    data.warnings,
    (w) => w.warningRequestId,
  );
  setAll(
    COLLECTIONS.notifications,
    converters.notifications,
    data.notifications,
    (n) => n.notificationId,
  );
  setAll(COLLECTIONS.shelters, converters.shelters, data.shelters, (s) => s.shelterId);
  setAll(
    COLLECTIONS.shelterAllocations,
    converters.shelterAllocations,
    data.allocations,
    (a) => a.allocationId,
  );

  await batch.commit();

  console.table({
    users: data.users.length,
    disasterEvents: EVENTS.length,
    hazardReports: data.hazardReports.length,
    verificationDecisions: data.decisions.length,
    warningRequests: data.warnings.length,
    notifications: data.notifications.length,
    shelters: data.shelters.length,
    shelterAllocations: data.allocations.length,
  });
  console.log(`\n✔ Wrote ${writes} documents.`);
  console.log('\nDemo accounts (password = SEED_DEMO_PASSWORD):');
  for (const user of data.users) console.log(`  ${user.role.padEnd(16)} ${user.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(`\n✖ Seed failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
