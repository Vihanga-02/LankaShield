import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function FullPageLoader({ message }: { message: string }) {
  return (
    <Box
      role="progressbar"
      aria-label={message}
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeContent: 'center',
        gap: 2,
        textAlign: 'center',
      }}>
      <CircularProgress sx={{ mx: 'auto' }} />
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}
