'use client';

import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';

type Props = {
  requestId: string;
};

export default function RequestActions({ requestId }: Props) {
  const [loading, setLoading] = useState<'approved' | 'rejected' | null>(
    null
  );
  const router = useRouter();

  async function decide(status: 'approved' | 'rejected') {
    setLoading(status);

    try {
      const response = await fetch(
        `/api/photo-access-requests/${requestId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось обновить запрос.');
      }

      router.refresh();
      // чтобы счётчик в MainNavigation обновился сразу
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="contained"
        color="success"
        size="small"
        disabled={loading !== null}
        onClick={() => decide('approved')}
      >
        {loading === 'approved' ? '...' : 'Открыть'}
      </Button>
      <Button
        variant="outlined"
        color="error"
        size="small"
        disabled={loading !== null}
        onClick={() => decide('rejected')}
      >
        {loading === 'rejected' ? '...' : 'Отклонить'}
      </Button>
    </Stack>
  );
}