import Link from 'next/link';
import {Alert,Box,Button,Card,CardContent,Container,Typography,} from '@mui/material';

import { createSupabaseServerClient } from '@/utils/supabase-server';
import FollowButton from '@/components/FollowButton';
import Header from '@/components/Header';
import MainNavigation from '@/components/MainNavigation';

export default async function UsersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Header />

      {/* Общая навигация по сайту */}
      <MainNavigation />

      {/* Заголовок страницы */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif',
            textAlign: 'center',
            color: '#202938',
            fontSize: { xs: '1.8rem', sm: '2.4rem' },
          }}
        >
          Пользователи NextGram
        </Typography>

        <Typography
          sx={{
            mt: 1,
            textAlign: 'center',
            color: '#7b8494',
            fontSize: '1rem',
          }}
        >
          Находите авторов и подписывайтесь на них
        </Typography>
      </Box>

      {/* Проверка авторизации */}
      {authError || !user ? (
        <Box sx={{ py: 5, maxWidth: 600, mx: 'auto' }}>
          <Alert severity="info">
            Войдите в аккаунт, чтобы просматривать пользователей
            и подписываться на них.
          </Alert>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              Войти
            </Button>
          </Box>
        </Box>
      ) : (
        <UsersList userId={user.id} />
      )}
    </Container>
  );
}

async function UsersList({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient();

  // Загружаем остальных пользователей
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name_first, name_last')
    .neq('id', userId)
    .order('name_first', { ascending: true });

  // Загружаем подписки текущего пользователя
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (profilesError || followsError) {
    console.error('Ошибка загрузки пользователей:', {
      profilesError,
      followsError,
    });

    return (
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <Alert severity="error">
          Не удалось загрузить пользователей. Проверьте подключение
          и права доступа Supabase.
        </Alert>
      </Box>
    );
  }

  // Формируем список ID пользователей, на которых подписан текущий пользователь
  const followedIds = new Set(
    (follows ?? []).map((follow) => follow.following_id)
  );

  if (!profiles?.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography
          sx={{
            color: '#303949',
            fontWeight: 600,
            fontSize: '1.1rem',
          }}
        >
          Пока нет других пользователей
        </Typography>

        <Typography sx={{ mt: 1, color: '#7b8494' }}>
          Здесь появятся другие участники NextGram.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="section"
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, minmax(0, 1fr))',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
        gap: { xs: 1.5, sm: 2.5 },
        mt: 3,
      }}
    >
      {profiles.map((profile) => {
        const fullName = [
          profile.name_first,
          profile.name_last,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <Card
            key={profile.id}
            elevation={0}
            sx={{
              minWidth: 0,
              backgroundColor: '#fff',
              border: '1px solid #edf0f4',
              borderRadius: 3,
              boxShadow: '0 3px 12px rgba(25, 35, 55, 0.05)',
              transition:
                'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 10px 24px rgba(25, 35, 55, 0.12)',
              },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
                '&:hover': {
                  transform: 'none',
                },
              },
            }}
          >
            <CardContent
              sx={{
                p: 2.5,
                '&:last-child': { pb: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 600,
                  color: '#202938',
                  fontSize: '1.05rem',
                  overflowWrap: 'anywhere',
                }}
              >
                {fullName || 'Пользователь NextGram'}
              </Typography>

              <FollowButton
                followingId={profile.id}
                initiallyFollowing={followedIds.has(profile.id)}
              />
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

