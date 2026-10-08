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
  type EventAlert,
  type CitizenReachRecord,
  type ShelterOccupancySnapshot,
  type ResourceDistribution,
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
    hazardType: 'LANDSLIDE',
    severity: 'MODERATE',
    title: 'Unstable slope near Horana estate road',
    description:
      'Loose soil and small rocks are falling onto the estate road after continuous rain.',
    district: 'Kalutara',
    latitude: 6.7159,
    longitude: 80.0626,
    createdAt: '2025-11-06T13:00:00.000Z',
    review: {
      outcome: 'VERIFIED_INFO',
      eventId: KAL_2025,
      remarks: 'Slope instability verified with the local Grama Niladhari.',
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

const EVENT_ALERTS: EventAlert[] = [
  ...[
    ['2025-05-20', 'ADVISORY'],
    ['2025-05-21', 'MEDIUM'],
    ['2025-05-22', 'HIGH'],
    ['2025-05-23', 'HIGH'],
    ['2025-05-24', 'MEDIUM'],
    ['2025-05-25', 'ADVISORY'],
  ].map(([day, level], i) => ({
    alertId: `EA-RAT25-${i + 1}`,
    disasterEventId: RAT_2025,
    level: level as EventAlert['level'],
    district: 'Ratnapura' as const,
    issuedAt: `${day}T06:00:00.000Z`,
    acknowledged: true,
  })),
  ...[
    ['2025-11-03', 'ADVISORY'],
    ['2025-11-04', 'MEDIUM'],
    ['2025-11-04', 'HIGH'],
    ['2025-11-05', 'HIGH'],
    ['2025-11-05', 'HIGH'],
    ['2025-11-06', 'HIGH'],
    ['2025-11-06', 'MEDIUM'],
    ['2025-11-07', 'MEDIUM'],
    ['2025-11-08', 'ADVISORY'],
    ['2025-11-09', 'ADVISORY'],
    ['2025-11-10', 'ADVISORY'],
    ['2025-11-11', 'ADVISORY'],
  ].map(([day, level], i) => ({
    alertId: `EA-KAL25-${i + 1}`,
    disasterEventId: KAL_2025,
    level: level as EventAlert['level'],
    district: 'Kalutara' as const,
    issuedAt: `${day}T06:00:00.000Z`,
    acknowledged: true,
  })),
  ...[
    ['2026-10-01', 'ADVISORY'],
    ['2026-10-02', 'HIGH'],
    ['2026-10-03', 'MEDIUM'],
    ['2026-10-04', 'HIGH'],
    ['2026-10-05', 'MEDIUM'],
    ['2026-10-06', 'ADVISORY'],
  ].map(([day, level], i) => ({
    alertId: `EA-RAT26-${i + 1}`,
    disasterEventId: RAT_2026,
    level: level as EventAlert['level'],
    district: 'Ratnapura' as const,
    issuedAt: `${day}T06:00:00.000Z`,
    acknowledged: i < 2,
  })),
];

const CITIZEN_REACH: CitizenReachRecord[] = [
  {
    reachId: 'CR-KAL-HOR',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    gsDivision: 'Horana',
    citizensReached: 1100,
    recordedAt: '2025-11-11T12:00:00.000Z',
  },
  {
    reachId: 'CR-KAL-AGA',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    gsDivision: 'Agalawatta',
    citizensReached: 900,
    recordedAt: '2025-11-11T12:00:00.000Z',
  },
  {
    reachId: 'CR-KAL-BUL',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    gsDivision: 'Bulathsinhala',
    citizensReached: 850,
    recordedAt: '2025-11-11T12:00:00.000Z',
  },
  {
    reachId: 'CR-KAL-MAT',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    gsDivision: 'Matugama',
    citizensReached: 550,
    recordedAt: '2025-11-11T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT25',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    gsDivision: 'Ratnapura Town',
    citizensReached: 1200,
    recordedAt: '2025-05-29T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT25-KUR',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    gsDivision: 'Kuruwita',
    citizensReached: 850,
    recordedAt: '2025-05-29T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT25-PEL',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    gsDivision: 'Pelmadulla',
    citizensReached: 620,
    recordedAt: '2025-05-29T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT25-EHE',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    gsDivision: 'Eheliyagoda',
    citizensReached: 480,
    recordedAt: '2025-05-29T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT26',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    gsDivision: 'Ratnapura Town',
    citizensReached: 900,
    recordedAt: '2026-10-04T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT26-ELA',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    gsDivision: 'Elapatha',
    citizensReached: 560,
    recordedAt: '2026-10-05T12:00:00.000Z',
  },
  {
    reachId: 'CR-RAT26-KIR',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    gsDivision: 'Kiriella',
    citizensReached: 440,
    recordedAt: '2026-10-05T12:00:00.000Z',
  },
];

const OCCUPANCY_HISTORY: ShelterOccupancySnapshot[] = [];
for (const [day, horana, agalawatta] of [
  ['2025-11-04', 35, 20],
  ['2025-11-05', 90, 55],
  ['2025-11-06', 150, 115],
  ['2025-11-07', 120, 90],
  ['2025-11-08', 60, 40],
] as const) {
  OCCUPANCY_HISTORY.push(
    {
      snapshotId: `OS-KAL-${day}-4`,
      disasterEventId: KAL_2025,
      shelterId: 'SH-SEED-004',
      district: 'Kalutara',
      occupancy: horana,
      capacity: 200,
      recordedAt: `${day}T18:00:00.000Z`,
    },
    {
      snapshotId: `OS-KAL-${day}-5`,
      disasterEventId: KAL_2025,
      shelterId: 'SH-SEED-005',
      district: 'Kalutara',
      occupancy: agalawatta,
      capacity: 120,
      recordedAt: `${day}T18:00:00.000Z`,
    },
  );
}
OCCUPANCY_HISTORY.push(
  {
    snapshotId: 'OS-RAT25',
    disasterEventId: RAT_2025,
    shelterId: 'SH-SEED-001',
    district: 'Ratnapura',
    occupancy: 240,
    capacity: 300,
    recordedAt: '2025-05-23T18:00:00.000Z',
  },
  {
    snapshotId: 'OS-RAT25-2025-05-23-2',
    disasterEventId: RAT_2025,
    shelterId: 'SH-SEED-002',
    district: 'Ratnapura',
    occupancy: 135,
    capacity: 150,
    recordedAt: '2025-05-23T18:00:00.000Z',
  },
  {
    snapshotId: 'OS-RAT26',
    disasterEventId: RAT_2026,
    shelterId: 'SH-SEED-001',
    district: 'Ratnapura',
    occupancy: 210,
    capacity: 300,
    recordedAt: '2026-10-04T18:00:00.000Z',
  },
  {
    snapshotId: 'OS-RAT26-2026-10-04-2',
    disasterEventId: RAT_2026,
    shelterId: 'SH-SEED-002',
    district: 'Ratnapura',
    occupancy: 125,
    capacity: 150,
    recordedAt: '2026-10-04T18:00:00.000Z',
  },
  {
    snapshotId: 'OS-RAT26-2026-10-04-3',
    disasterEventId: RAT_2026,
    shelterId: 'SH-SEED-003',
    district: 'Ratnapura',
    occupancy: 80,
    capacity: 80,
    recordedAt: '2026-10-04T18:00:00.000Z',
  },
);

for (const [day, central, sivali] of [
  ['2025-05-21', 70, 35],
  ['2025-05-22', 160, 80],
  ['2025-05-24', 210, 120],
  ['2025-05-25', 140, 75],
] as const) {
  OCCUPANCY_HISTORY.push(
    {
      snapshotId: `OS-RAT25-${day}-1`,
      disasterEventId: RAT_2025,
      shelterId: 'SH-SEED-001',
      district: 'Ratnapura',
      occupancy: central,
      capacity: 300,
      recordedAt: `${day}T18:00:00.000Z`,
    },
    {
      snapshotId: `OS-RAT25-${day}-2`,
      disasterEventId: RAT_2025,
      shelterId: 'SH-SEED-002',
      district: 'Ratnapura',
      occupancy: sivali,
      capacity: 150,
      recordedAt: `${day}T18:00:00.000Z`,
    },
  );
}

for (const [day, central, sivali, kuruwita] of [
  ['2026-10-02', 90, 55, 25],
  ['2026-10-03', 155, 95, 60],
  ['2026-10-05', 180, 125, 80],
  ['2026-10-06', 145, 105, 65],
] as const) {
  OCCUPANCY_HISTORY.push(
    {
      snapshotId: `OS-RAT26-${day}-1`,
      disasterEventId: RAT_2026,
      shelterId: 'SH-SEED-001',
      district: 'Ratnapura',
      occupancy: central,
      capacity: 300,
      recordedAt: `${day}T18:00:00.000Z`,
    },
    {
      snapshotId: `OS-RAT26-${day}-2`,
      disasterEventId: RAT_2026,
      shelterId: 'SH-SEED-002',
      district: 'Ratnapura',
      occupancy: sivali,
      capacity: 150,
      recordedAt: `${day}T18:00:00.000Z`,
    },
    {
      snapshotId: `OS-RAT26-${day}-3`,
      disasterEventId: RAT_2026,
      shelterId: 'SH-SEED-003',
      district: 'Ratnapura',
      occupancy: kuruwita,
      capacity: 80,
      recordedAt: `${day}T18:00:00.000Z`,
    },
  );
}

const RESOURCE_DISTRIBUTIONS: ResourceDistribution[] = [
  {
    distributionId: 'RD-KAL-1',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    category: 'FOOD_PACK',
    quantity: 120,
    distributedAt: '2025-11-05T10:00:00.000Z',
  },
  {
    distributionId: 'RD-KAL-2',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    category: 'WATER_KIT',
    quantity: 80,
    distributedAt: '2025-11-06T10:00:00.000Z',
  },
  {
    distributionId: 'RD-KAL-3',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    category: 'MEDICAL_KIT',
    quantity: 50,
    distributedAt: '2025-11-07T10:00:00.000Z',
  },
  {
    distributionId: 'RD-KAL-4',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    category: 'HYGIENE_KIT',
    quantity: 40,
    distributedAt: '2025-11-08T10:00:00.000Z',
  },
  {
    distributionId: 'RD-KAL-5',
    disasterEventId: KAL_2025,
    district: 'Kalutara',
    category: 'BLANKET',
    quantity: 30,
    distributedAt: '2025-11-09T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT25',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    category: 'FOOD_PACK',
    quantity: 240,
    distributedAt: '2025-05-23T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT25-WATER',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    category: 'WATER_KIT',
    quantity: 180,
    distributedAt: '2025-05-24T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT25-MEDICAL',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    category: 'MEDICAL_KIT',
    quantity: 90,
    distributedAt: '2025-05-24T11:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT25-HYGIENE',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    category: 'HYGIENE_KIT',
    quantity: 75,
    distributedAt: '2025-05-25T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT25-BLANKET',
    disasterEventId: RAT_2025,
    district: 'Ratnapura',
    category: 'BLANKET',
    quantity: 60,
    distributedAt: '2025-05-25T11:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT26',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    category: 'WATER_KIT',
    quantity: 220,
    distributedAt: '2026-10-03T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT26-FOOD',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    category: 'FOOD_PACK',
    quantity: 280,
    distributedAt: '2026-10-03T11:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT26-MEDICAL',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    category: 'MEDICAL_KIT',
    quantity: 110,
    distributedAt: '2026-10-04T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT26-HYGIENE',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    category: 'HYGIENE_KIT',
    quantity: 95,
    distributedAt: '2026-10-05T10:00:00.000Z',
  },
  {
    distributionId: 'RD-RAT26-BLANKET',
    disasterEventId: RAT_2026,
    district: 'Ratnapura',
    category: 'BLANKET',
    quantity: 70,
    distributedAt: '2026-10-05T11:00:00.000Z',
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
        ? { decisionId, outcome: review.outcome, remarks: review.remarks, decidedAt }
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
        createdAt: decidedAt,
      });

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

  return {
    users,
    hazardReports,
    decisions,
    warnings,
    notifications,
    allocations,
    shelters,
    eventAlerts: EVENT_ALERTS,
    citizenReach: CITIZEN_REACH,
    occupancyHistory: OCCUPANCY_HISTORY,
    resourceDistributions: RESOURCE_DISTRIBUTIONS,
  };
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
  setAll(COLLECTIONS.eventAlerts, converters.eventAlerts, data.eventAlerts, (a) => a.alertId);
  setAll(COLLECTIONS.citizenReach, converters.citizenReach, data.citizenReach, (r) => r.reachId);
  setAll(
    COLLECTIONS.shelterOccupancyHistory,
    converters.shelterOccupancyHistory,
    data.occupancyHistory,
    (s) => s.snapshotId,
  );
  setAll(
    COLLECTIONS.resourceDistributions,
    converters.resourceDistributions,
    data.resourceDistributions,
    (r) => r.distributionId,
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
    eventAlerts: data.eventAlerts.length,
    citizenReach: data.citizenReach.length,
    shelterOccupancyHistory: data.occupancyHistory.length,
    resourceDistributions: data.resourceDistributions.length,
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
