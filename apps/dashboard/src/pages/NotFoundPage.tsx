import SearchOffOutlined from '@mui/icons-material/SearchOffOutlined';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { Link } from 'react-router';

import { EmptyState } from '../components/feedback/EmptyState';

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<SearchOffOutlined />}
        title="Page not found"
        message="The page you opened does not exist."
        action={
          <Button variant="contained" component={Link} to="/">
            Back to overview
          </Button>
        }
      />
    </Card>
  );
}
