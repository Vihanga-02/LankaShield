import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import Card from '@mui/material/Card';

import { EmptyState } from '../components/feedback/EmptyState';
import { PageHeader } from '../components/layout/PageHeader';

/** Shell for pages whose use case is built in a later phase. */
export function PlaceholderPage({ title, message }: { title: string; message: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={<ConstructionOutlined />} title={title} message={message} />
      </Card>
    </>
  );
}
