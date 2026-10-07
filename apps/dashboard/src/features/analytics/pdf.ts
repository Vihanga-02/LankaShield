import {
  colors,
  DISASTER_REPORT_STATUS_PRESENTATION,
  HAZARD_TYPE_LABELS,
  METRIC_LABELS,
  type AnalyticsResult,
  type CountDatum,
  type DisasterEvent,
  type AlertTimelineDatum,
  type OccupancyTimelineDatum,
  type ReportFilters,
} from '@lankashield/shared';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

import { formatDate, formatDateTime } from '../../utils/format';

export interface PdfContent {
  responseReportId: string;
  event: DisasterEvent;
  result: AnalyticsResult;
  filters: ReportFilters;
  generatedBy: string;
  byHazard: CountDatum[];
  outcomes: CountDatum[];
  alertTimeline: AlertTimelineDatum[];
  reachByDivision: CountDatum[];
  occupancyTimeline: OccupancyTimelineDatum[];
  resourceCategories: CountDatum[];
}

const PRIMARY: [number, number, number] = [0xc9, 0x36, 0x4f];
const MARGIN = 14;

/** Builds the disaster-response report PDF in the browser (UC04, §10.4). */
export function buildReportPdf(c: PdfContent): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY);
  doc.text('LankaShield — Disaster Response Report', MARGIN, y);

  y += 9;
  doc.setFontSize(13);
  doc.setTextColor(colors.textPrimary);
  doc.text(c.event.name, MARGIN, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(colors.textSecondary);
  const period = `${formatDate(c.event.startedAt)} – ${c.event.endedAt ? formatDate(c.event.endedAt) : 'ongoing'}`;
  doc.text(
    `${HAZARD_TYPE_LABELS[c.event.hazardType]} · ${c.event.district} · ${period} · Event ${c.event.status === 'ACTIVE' ? 'active' : 'completed'}`,
    MARGIN,
    y,
  );

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(c.result.status === 'FINAL' ? colors.success : colors.warning);
  doc.text(DISASTER_REPORT_STATUS_PRESENTATION[c.result.status].label.toUpperCase(), MARGIN, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colors.textSecondary);
  const filterText = [
    c.filters.district ? `District: ${c.filters.district}` : `District: ${c.event.district}`,
    c.filters.from ? `From: ${c.filters.from}` : null,
    c.filters.to ? `To: ${c.filters.to}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  doc.text(
    [
      `Report ID ${c.responseReportId} · Generated ${formatDateTime(c.result.metrics[0]?.calculatedAt ?? new Date().toISOString())} by ${c.generatedBy}`,
      `Filters — ${filterText}`,
    ],
    MARGIN,
    y,
  );
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Complete', 'Source']],
    body: c.result.metrics.map((m) => [
      METRIC_LABELS[m.key],
      m.value === null ? 'Unavailable' : m.value.toLocaleString('en-LK'),
      m.complete ? 'Yes' : 'No',
      m.sourceCollection,
    ]),
    headStyles: { fillColor: PRIMARY },
    styles: { fontSize: 9 },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastY(doc) + 6;

  const notes: string[] = [];
  if (c.result.unreviewedReports > 0) {
    notes.push(
      `${c.result.unreviewedReports} hazard report(s) in the event area are still waiting for verification, so report counts are incomplete.`,
    );
  }
  if (c.result.missingMetrics.length > 0) {
    notes.push(
      `Missing or incomplete: ${c.result.missingMetrics.map((k) => METRIC_LABELS[k]).join(', ')}.`,
    );
  }
  if (c.event.status === 'ACTIVE') notes.push('The event is still active; figures will change.');
  if (notes.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(colors.textPrimary);
    const lines = doc.splitTextToSize(notes.map((n) => `• ${n}`).join('\n'), width - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.5 + 4;
  }

  const section = (title: string, head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [
        [
          {
            content: title,
            colSpan: head.length,
            styles: { fillColor: [241, 245, 249], textColor: 17 },
          },
        ],
        head,
      ],
      body: body.length > 0 ? body : [[{ content: 'No data', colSpan: head.length }]],
      headStyles: { fillColor: PRIMARY },
      styles: { fontSize: 9 },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastY(doc) + 6;
  };

  section(
    'Reports by hazard type',
    ['Hazard', 'Reports'],
    c.byHazard.map((d) => [d.label, d.count]),
  );
  section(
    'Verification outcomes',
    ['Outcome', 'Reports'],
    c.outcomes.map((d) => [d.label, d.count]),
  );
  section(
    'Alert timeline',
    ['Day', 'High', 'Medium', 'Advisory'],
    c.alertTimeline.map((d) => [d.day, d.high, d.medium, d.advisory]),
  );
  section(
    'Citizen reach by GS division',
    ['GS division', 'Citizens'],
    c.reachByDivision.map((d) => [d.label, d.count]),
  );
  section(
    'Shelter occupancy over time',
    ['Day', 'Occupied', 'Capacity', 'Rate'],
    c.occupancyTimeline.map((d) => [d.day, d.occupancy, d.capacity, `${d.rate}%`]),
  );
  section(
    `Resource Distribution – ${c.event.district}`,
    ['Resource', 'Quantity'],
    c.resourceCategories.map((d) => [d.label, d.count]),
  );

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(colors.textSecondary);
    doc.text(
      `LankaShield campus prototype · ${c.result.status === 'FINAL' ? 'Authorised final report' : 'Provisional — not for distribution'} · Page ${i} of ${pages}`,
      MARGIN,
      doc.internal.pageSize.getHeight() - 8,
    );
  }
  return doc;
}

function lastY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}
