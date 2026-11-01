import { createSupabaseServerClient } from '@/utils/supabase-server';
import { Container, Box, Typography, Alert } from '@mui/material';
import Header from '@/components/Header';
import MainNavigation from '@/components/MainNavigation';
import RequestActions from '@/components/RequestActions';

type IncomingRequest = {
  request_id: string;
  photo_id: number;
  photo_caption: string | null;
  requester_user_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default async function RequestsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Header />
        <MainNavigation />
        <Alert severity="info" sx={{ mt: 3 }}>
          Войди в аккаунт, чтобы видеть запросы.
        </Alert>
      </Container>
    );
  }

  const { data, error } = await supabase.rpc(
    'list_incoming_requests'
  );

  if (error) {
    console.error('list_incoming_requests:', error);
  }

  const requests = (data ?? []) as IncomingRequest[];
  const pending = requests.filter((r) => r.status === 'pending');
  const processed = requests.filter((r) => r.status !== 'pending');

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Header />
      <MainNavigation />

      <Typography
        variant="h4"
        sx={{ mt: 3, mb: 2, fontWeight: 700 }}
      >
        Запросы на доступ
      </Typography>

      {requests.length === 0 && (
        <Alert severity="info">Пока нет запросов.</Alert>
      )}

      {pending.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Ожидают решения ({pending.length})
          </Typography>
          {pending.map((r) => (
            <RequestRow key={r.request_id} request={r} />
          ))}
        </>
      )}

      {processed.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
            Обработанные
          </Typography>
          {processed.map((r) => (
            <RequestRow key={r.request_id} request={r} />
          ))}
        </>
      )}
    </Container>
  );
}

function RequestRow({ request }: { request: IncomingRequest }) {
  const who =
    request.requester_name ||
    request.requester_email ||
    request.requester_user_id ||
    'Гость';

  return (
    <Box
      sx={{
        border: '1px solid #e5e7eb',
        borderRadius: 2,
        p: 2,
        mb: 1.5,
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
        >
          {who}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Фото #{request.photo_id}
          {request.photo_caption
            ? ` — «${request.photo_caption}»`
            : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(request.created_at).toLocaleString()}
          {request.status !== 'pending' && ` · ${request.status}`}
        </Typography>
      </Box>

      {request.status === 'pending' && (
        <RequestActions requestId={request.request_id} />
      )}
    </Box>
  );
}