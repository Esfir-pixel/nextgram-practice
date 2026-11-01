import Link from 'next/link';
import { Container, Box, Typography } from '@mui/material';

import { createSupabaseServerClient } from '@/utils/supabase-server';
import Header from '@/components/Header';
import MainNavigation from '@/components/MainNavigation';
import HiddenPhotoCard from '@/components/HiddenPhotoCard';

type VisiblePhoto = {
  kind: 'visible';
  id: number;
  url: string;
  caption: string | null;
  visibility: string;
};

type HiddenPhoto = {
  kind: 'hidden';
  id: number;
  caption: string | null;
};

type GalleryItem = VisiblePhoto | HiddenPhoto;

export default async function Page() {
  const supabase = await createSupabaseServerClient();

  // 1. Видимые фото (RLS отдаёт только те, что можно смотреть)
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, url, caption, visibility')
    .order('id', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки фотографий:', error);
  }

  // 2. Скрытые фото — только метаданные, без url (для заглушек)
  const { data: hiddenPhotos, error: hiddenError } = await supabase.rpc(
    'list_hidden_photos'
  );

  if (hiddenError) {
    console.error('Ошибка list_hidden_photos:', hiddenError);
  }

  // 3. Мёрж: видимые + скрытые
  const items: GalleryItem[] = [
    ...(photos ?? []).map((photo) => ({
      kind: 'visible' as const,
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      visibility: photo.visibility,
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
    })),
  ];

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Header />

      <MainNavigation />

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
          Галерея NextGram
        </Typography>

        <Typography
          sx={{
            mt: 1,
            textAlign: 'center',
            color: '#7b8494',
            fontSize: '1rem',
          }}
        >
          Фотографии и моменты, которыми делятся пользователи
        </Typography>
      </Box>

      {items.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Пока нет опубликованных фотографий.
          </Typography>
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
                {/* Фото и бейдж видимости */}
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={item.url}
                    alt={item.caption ?? 'Фотография'}
                    loading="lazy"
                    sx={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      backgroundColor: '#f3f4f6',
                    }}
                  />

                  {item.visibility === 'request_only' && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: 0.5,
                      }}
                    >
                      СКРЫТОЕ
                    </Box>
                  )}
                </Box>

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

