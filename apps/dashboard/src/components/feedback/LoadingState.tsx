import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <Box
      role="progressbar"
      aria-label={message}
      sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <CircularProgress size={32} />
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}
