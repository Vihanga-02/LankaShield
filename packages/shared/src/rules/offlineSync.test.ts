import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../constants/errors';
import type { EvidenceInput } from '../schemas/hazardReport.schema';
import {
  syncOfflineReports,
  type OfflineQueueStore,
  type QueuedReport,
  type ReportGateway,
} from './offlineSync';

const USER = 'citizen-1';

function queued(reportId: string, overrides: Partial<QueuedReport> = {}): QueuedReport {
  return {
    reportId,
    input: {
      hazardType: 'FLOOD',
      severity: 'HIGH',
      title: 'Flooding near bridge',
      description: 'Water rising quickly near the bridge.',
      district: 'Ratnapura',
      location: { latitude: 6.68, longitude: 80.4, source: 'GPS' },
      evidence: [
        { uri: 'file:///a.jpg', mimeType: 'image/jpeg', sizeBytes: 100 },
        { uri: 'file:///b.jpg', mimeType: 'image/jpeg', sizeBytes: 100 },
      ],
    },
    reporter: { uid: USER, role: 'CITIZEN' },
    clientCreatedAt: '2026-10-05T08:00:00.000Z',
    syncStatus: 'PENDING',
    retryCount: 0,
    createdAt: '2026-10-05T08:00:00.000Z',
    updatedAt: '2026-10-05T08:00:00.000Z',
    ...overrides,
  };
}

/** In-memory queue that behaves like the SQLite repository. */
class FakeStore implements OfflineQueueStore {
  rows = new Map<string, QueuedReport>();
  constructor(rows: QueuedReport[]) {
    rows.forEach((r) => this.rows.set(r.reportId, r));
  }
  async listUnsynced() {
    return [...this.rows.values()]
      .filter((r) => r.syncStatus !== 'SYNCED')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async markSyncing(id: string) {
    this.rows.get(id)!.syncStatus = 'SYNCING';
  }
  async markFailed(id: string, error: string) {
    const row = this.rows.get(id)!;
    row.syncStatus = 'FAILED';
    row.lastError = error;
    row.retryCount += 1;
  }
  async remove(id: string) {
    this.rows.delete(id);
  }
}

/** Fake Firebase that records every report it receives. */
class FakeGateway implements ReportGateway {
  reports = new Map<string, { reporterId: string; evidenceUrls: string[] }>();
  uploads: string[] = [];
  failUploads = false;
  findReporterId = vi.fn(async (id: string) => this.reports.get(id)?.reporterId ?? null);
  uploadEvidence = vi.fn(async (id: string, index: number, _e: EvidenceInput) => {
    if (this.failUploads) throw new AppError('NETWORK_ERROR');
    const url = `https://storage/${id}/ev-${index + 1}.jpg`;
    this.uploads.push(url);
    return url;
  });
  createReport = vi.fn(async (row: QueuedReport, evidenceUrls: string[]) => {
    this.reports.set(row.reportId, { reporterId: row.reporter.uid, evidenceUrls });
  });
}

let gateway: FakeGateway;
beforeEach(() => {
  gateway = new FakeGateway();
});

describe('syncOfflineReports', () => {
  it('uploads evidence, creates each report with its original ID and clears the queue', async () => {
    const store = new FakeStore([
      queued('LS-2', { createdAt: '2026-10-05T09:00:00.000Z' }),
      queued('LS-1', { createdAt: '2026-10-05T08:00:00.000Z' }),
    ]);

    const summary = await syncOfflineReports(store, gateway, USER);

    expect(summary).toEqual({ synced: ['LS-1', 'LS-2'], failed: [] });
    expect(gateway.createReport.mock.calls.map(([row]) => row.reportId)).toEqual(['LS-1', 'LS-2']);
    expect(gateway.reports.get('LS-1')?.evidenceUrls).toEqual([
      'https://storage/LS-1/ev-1.jpg',
      'https://storage/LS-1/ev-2.jpg',
    ]);
    expect(store.rows.size).toBe(0);
  });

  it('does not create a duplicate when the report already reached Firestore', async () => {
    gateway.reports.set('LS-1', { reporterId: USER, evidenceUrls: [] });
    const store = new FakeStore([queued('LS-1', { syncStatus: 'SYNCING' })]);

    const summary = await syncOfflineReports(store, gateway, USER);

    expect(summary.synced).toEqual(['LS-1']);
    expect(gateway.createReport).not.toHaveBeenCalled();
    expect(gateway.uploadEvidence).not.toHaveBeenCalled();
    expect(store.rows.size).toBe(0);
  });

  it('marks a failed sync and retries later with the same tracking ID', async () => {
    const store = new FakeStore([queued('LS-1')]);
    gateway.failUploads = true;

    const first = await syncOfflineReports(store, gateway, USER);
    expect(first.failed).toEqual([{ reportId: 'LS-1', error: 'Unable to reach the server.' }]);
    expect(store.rows.get('LS-1')).toMatchObject({
      syncStatus: 'FAILED',
      retryCount: 1,
      lastError: 'Unable to reach the server.',
    });

    gateway.failUploads = false;
    const second = await syncOfflineReports(store, gateway, USER);

    expect(second.synced).toEqual(['LS-1']);
    expect([...gateway.reports.keys()]).toEqual(['LS-1']);
    expect(gateway.createReport).toHaveBeenCalledTimes(1);
  });

  it('syncing twice creates the report only once', async () => {
    const store = new FakeStore([queued('LS-1')]);
    await syncOfflineReports(store, gateway, USER);
    await syncOfflineReports(store, gateway, USER);
    expect(gateway.createReport).toHaveBeenCalledTimes(1);
  });

  it('continues with later reports when one fails', async () => {
    const store = new FakeStore([
      queued('LS-1', { createdAt: '2026-10-05T08:00:00.000Z' }),
      queued('LS-2', { createdAt: '2026-10-05T09:00:00.000Z' }),
    ]);
    gateway.createReport.mockRejectedValueOnce(new AppError('NETWORK_ERROR'));

    const summary = await syncOfflineReports(store, gateway, USER);

    expect(summary.failed.map((f) => f.reportId)).toEqual(['LS-1']);
    expect(summary.synced).toEqual(['LS-2']);
  });

  it("only syncs the signed-in user's reports", async () => {
    const store = new FakeStore([
      queued('LS-mine'),
      queued('LS-other', { reporter: { uid: 'someone-else', role: 'VOLUNTEER' } }),
    ]);

    const summary = await syncOfflineReports(store, gateway, USER);

    expect(summary.synced).toEqual(['LS-mine']);
    expect(store.rows.has('LS-other')).toBe(true);
  });

  it('fails instead of overwriting a report that belongs to someone else', async () => {
    gateway.reports.set('LS-1', { reporterId: 'someone-else', evidenceUrls: [] });
    const store = new FakeStore([queued('LS-1')]);

    const summary = await syncOfflineReports(store, gateway, USER);

    expect(summary.failed).toHaveLength(1);
    expect(gateway.createReport).not.toHaveBeenCalled();
    expect(store.rows.get('LS-1')?.syncStatus).toBe('FAILED');
  });

  it('reports progress for each queued report', async () => {
    const store = new FakeStore([queued('LS-1')]);
    const onProgress = vi.fn();
    await syncOfflineReports(store, gateway, USER, onProgress);
    expect(onProgress).toHaveBeenCalledWith({ reportId: 'LS-1', index: 0, total: 1 });
  });
});
