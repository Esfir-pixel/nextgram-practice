import Link from 'next/link';
import { Container, Box, Typography, Paper } from '@mui/material';
import { createSupabaseServerClient } from '@/utils/supabase-server';
import Header from '@/components/Header';
import DeletePhotoButton from '@/components/DeletePhotoButton';

export default async function MyPhotosPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Container maxWidth="xl">
        <Header />

        <Paper
          elevation={0}
          sx={{
            mt: 5,
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #edf0f4',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Мои фото
          </Typography>

          <Typography sx={{ mt: 1 }} color="text.secondary">
            Войдите в аккаунт, чтобы посмотреть свои фотографии.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки своих фотографий:', error);
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 5 }}>
      <Header />

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
          Мои фото
        </Typography>

        <Typography
          sx={{
            mt: 1,
            textAlign: 'center',
            color: '#7b8494',
          }}
        >
          Все твои опубликованные фотографии в одном месте
        </Typography>
      </Box>

      {!photos || photos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: { xs: 3, sm: 5 },
            textAlign: 'center',
            border: '1px solid #edf0f4',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Здесь пока пусто
          </Typography>

          <Typography sx={{ mt: 1 }} color="text.secondary">
            Загрузи первую фотографию, чтобы она появилась здесь.
          </Typography>
        </Paper>
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
          {photos.map((photo) => (
            <Paper
              key={photo.id}
              elevation={0}
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
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
              <Box
                component={Link}
                href={`/photos/${photo.id}`}
                sx={{
                  display: 'block',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                {/* Фото и бейдж видимости */}
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={photo.url}
                    alt={photo.caption ?? 'Фотография'}
                    loading="lazy"
                    sx={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      backgroundColor: '#f3f4f6',
                    }}
                  />

                  {photo.visibility === 'request_only' && (
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
                    {photo.caption || 'Без текста'}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  px: { xs: 1.2, sm: 1.5 },
                  pb: { xs: 1.2, sm: 1.5 },
                  mt: 'auto',
                }}
              >
                <DeletePhotoButton photoId={photo.id}
                 storagePath={photo.storagePath} 
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Container>
  );
}