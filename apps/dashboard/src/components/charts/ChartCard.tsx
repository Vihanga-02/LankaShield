import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

/**
 * Chart with a title and a Chart/Table toggle, so every value is also readable as text
 * (accessibility and printing). Shows an empty message when there is no data.
 */
export function ChartCard({
  title,
  subtitle,
  table,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  table: ChartTable;
  empty?: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const hasData = table.rows.length > 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" component="h3">
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {hasData ? (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, v: 'chart' | 'table' | null) => v && setView(v)}
              aria-label={`${title} view`}>
              <ToggleButton value="chart" aria-label="Chart view">
                <BarChartOutlined fontSize="small" />
              </ToggleButton>
              <ToggleButton value="table" aria-label="Table view">
                <TableRowsOutlined fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          ) : null}
        </Stack>

        {!hasData ? (
          <Box sx={{ height: 220, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">{empty ?? 'No data for these filters.'}</Typography>
          </Box>
        ) : view === 'chart' ? (
          children
        ) : (
          <Table size="small" aria-label={title}>
            <TableHead>
              <TableRow>
                {table.columns.map((c, i) => (
                  <TableCell key={c} align={i === 0 ? 'left' : 'right'}>
                    {c}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {table.rows.map((row) => (
                <TableRow key={String(row[0])}>
                  {row.map((cell, i) => (
                    <TableCell
                      key={i}
                      align={i === 0 ? 'left' : 'right'}
                      sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
