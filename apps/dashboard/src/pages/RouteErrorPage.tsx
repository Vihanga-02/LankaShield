import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useNavigate } from 'react-router';

/** Keep the dashboard shell usable when an individual route fails. */
export function RouteErrorPage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2}>
      <Alert severity="error">
        This page could not be displayed. Your saved reports and decisions are unchanged.
      </Alert>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reload page
        </Button>
        <Button onClick={() => navigate('/')}>Back to overview</Button>
      </Stack>
    </Stack>
  );
}
