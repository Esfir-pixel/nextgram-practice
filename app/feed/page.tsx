import Link from 'next/link';
import { Container, Box, Typography, Button } from '@mui/material';

import { createSupabaseServerClient } from '@/utils/supabase-server';
import Header from '@/components/Header';
import MainNavigation from '@/components/MainNavigation';
import HiddenPhotoCard from '@/components/HiddenPhotoCard';

type FeedVisiblePhoto = {
  kind: 'visible';
  id: number;
  url: string;
  caption: string | null;
  created_at: string;
};

type FeedHiddenPhoto = {
  kind: 'hidden';
  id: number;
  caption: string | null;
  created_at: string;
};

type FeedItem = FeedVisiblePhoto | FeedHiddenPhoto;

export default async function FeedPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <Container maxWidth="xl" sx={{ pb: 5 }}>
        <Header />
        <MainNavigation />

        <PageHeading
          title="Лента подписок"
          subtitle="Фотографии пользователей, на которых вы подписаны"
        />

        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: '#596579', mb: 2 }}>
            Войдите в аккаунт, чтобы просматривать ленту подписок.
          </Typography>

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
      </Container>
    );
  }

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (followsError) {
    console.error('Ошибка загрузки подписок:', followsError);

    return (
      <Container maxWidth="xl" sx={{ pb: 5 }}>
        <Header />
        <MainNavigation />

        <PageHeading
          title="Лента подписок"
          subtitle="Фотографии пользователей, на которых вы подписаны"
        />

        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="error">
            Не удалось загрузить подписки. Попробуйте обновить страницу.
          </Typography>
        </Box>
      </Container>
    );
  }

  const followingIds = (follows ?? []).map(
    (follow) => follow.following_id
  );

  if (followingIds.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ pb: 5 }}>
        <Header />
        <MainNavigation />

        <PageHeading
          title="Лента подписок"
          subtitle="Фотографии пользователей, на которых вы подписаны"
        />

        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography
            sx={{
              color: '#303949',
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
          >
            Ваша лента пока пуста
          </Typography>

          <Typography sx={{ mt: 1, color: '#7b8494' }}>
            Подпишитесь на пользователей, чтобы видеть их фотографии здесь.
          </Typography>

          <Button
            component={Link}
            href="/users"
            variant="contained"
            sx={{
              mt: 3,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Найти пользователей
          </Button>
        </Box>
      </Container>
    );
  }

  // 1. Видимые фото подписок (RLS отдаёт только доступные)
  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, url, caption, created_at, user_id')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false });

  if (photosError) {
    console.error('Ошибка загрузки фотографий ленты:', photosError);

    return (
      <Container maxWidth="xl" sx={{ pb: 5 }}>
        <Header />
        <MainNavigation />

        <PageHeading
          title="Лента подписок"
          subtitle="Фотографии пользователей, на которых вы подписаны"
        />

        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="error">
            Не удалось загрузить фотографии. Попробуйте обновить страницу.
          </Typography>
        </Box>
      </Container>
    );
  }

  // 2. Скрытые (request_only) фото подписок — метаданные без url
  const { data: hiddenPhotos, error: hiddenError } =
    await supabase.rpc('list_hidden_photos_from_following');

  if (hiddenError) {
    console.error(
      'Ошибка загрузки скрытых фотографий ленты:',
      hiddenError
    );
  }

  // 3. Мёрж: видимые + скрытые
  const items: FeedItem[] = [
    ...(photos ?? []).map((photo) => ({
      kind: 'visible' as const,
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      created_at: photo.created_at,
    })),
    ...((hiddenPhotos ?? []) as {
      id: number;
      user_id: string;
      caption: string | null;
      created_at: string;
    }[]).map((photo) => ({
      kind: 'hidden' as const,
      id: photo.id,
      caption: photo.caption,
      created_at: photo.created_at,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Header />
      <MainNavigation />

      <PageHeading
        title="Лента подписок"
        subtitle="Новые фотографии пользователей, на которых вы подписаны"
      />

      {items.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography
            sx={{
              color: '#303949',
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
          >
            Пока нет новых фотографий
          </Typography>

          <Typography sx={{ mt: 1, color: '#7b8494' }}>
            Пользователи, на которых вы подписаны, ещё не опубликовали
            фотографии.
          </Typography>

          <Button
            component={Link}
            href="/users"
            variant="outlined"
            sx={{
              mt: 3,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Найти пользователей
          </Button>
        </Box>
      ) : (
        <Box
          component="section"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, sm: 2.5 },
            mt: 3,
          }}
        >
          {items.map((item) =>
            item.kind === 'visible' ? (
              <Box
                component={Link}
                href={`/photos/${item.id}`}
                key={`v-${item.id}`}
                sx={{
                  display: 'block',
                  minWidth: 0,
                  overflow: 'hidden',
                  color: 'inherit',
                  textDecoration: 'none',
                  backgroundColor: '#fff',
                  border: '1px solid #edf0f4',
                  borderRadius: 3,
                  boxShadow: '0 3px 12px rgba(25, 35, 55, 0.05)',
                  transition:
                    'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow:
                      '0 10px 24px rgba(25, 35, 55, 0.12)',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': {
                      transform: 'none',
                    },
                  },
                }}
              >
                <Box
                  component="img"
                  src={item.url}
                  alt={item.caption || 'Фотография'}
                  loading="lazy"
                  sx={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    backgroundColor: '#f3f4f6',
                  }}
                />

                <Box sx={{ p: { xs: 1.2, sm: 1.5 } }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      lineHeight: 1.5,
                      color: '#303949',
                      overflowWrap: 'anywhere',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                      minHeight: '2.8em',
                    }}
                  >
                    {item.caption || 'Без текста'}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <HiddenPhotoCard
                key={`h-${item.id}`}
                photoId={item.id}
                caption={item.caption}
              />
            )
          )}
        </Box>
      )}
    </Container>
  );
}

function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
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
        {title}
      </Typography>

      <Typography
        sx={{
          mt: 1,
          textAlign: 'center',
          color: '#7b8494',
          fontSize: '1rem',
        }}
      >
        {subtitle}
      </Typography>
    </Box>
  );
}