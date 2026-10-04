import { colors, type StatusPresentation } from '@lankashield/shared';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DoNotDisturbOnOutlined from '@mui/icons-material/DoNotDisturbOnOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlined from '@mui/icons-material/HourglassEmptyOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import Chip from '@mui/material/Chip';
import type { ReactElement } from 'react';

// Icon per status label, so status is never shown by colour alone (§5.2).
const ICONS: Record<string, ReactElement> = {
  'Pending Sync': <CloudUploadOutlined />,
  'Pending Verification': <HourglassEmptyOutlined />,
  Verified: <CheckCircleOutline />,
  Rejected: <CancelOutlined />,
  Escalated: <ReportProblemOutlined />,
  Available: <CheckCircleOutline />,
  'Nearly Full': <ErrorOutline />,
  Full: <CancelOutlined />,
  Closed: <DoNotDisturbOnOutlined />,
  'Provisional Report': <HourglassEmptyOutlined />,
  'Final Report': <CheckCircleOutline />,
};

export function StatusChip({ presentation }: { presentation: StatusPresentation }) {
  const color = colors[presentation.color];
  return (
    <Chip
      size="small"
      variant="outlined"
      icon={ICONS[presentation.label] ?? <InfoOutlined />}
      label={presentation.label}
      sx={{ color, borderColor: color, '& .MuiChip-icon': { color } }}
    />
  );
}
