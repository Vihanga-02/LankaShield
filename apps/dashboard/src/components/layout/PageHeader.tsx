import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2,
      }}>
      <Box>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle ? <Typography color="textSecondary">{subtitle}</Typography> : null}
      </Box>
      {actions}
    </Box>
  );
}
