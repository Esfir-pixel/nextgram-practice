
import Link from 'next/link';
import { createSupabaseServerClient } from '@/utils/supabase-server';
import {Box,Button,Card,CardContent,Chip,Typography,} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';

type TagPageProps = {
  params: Promise<{ name: string }>;
};

export default async function TagPage({ params }: TagPageProps) {
  const { name } = await params;
  const tagName = decodeURIComponent(name);
  const supabase = await createSupabaseServerClient();

  // 1. Находим тег по названию
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('name', tagName)
    .maybeSingle();

  if (tagError) {
    console.error('Ошибка загрузки тега:', tagError);

    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">
          Не удалось загрузить тег.
        </Typography>
      </Box>
    );
  }

  if (!tag) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Тег #{tagName} не найден
        </Typography>

        <Button
          component={Link}
          href="/"
          variant="contained"
          startIcon={<ArrowBackIcon />}
        >
          Вернуться в галерею
        </Button>
      </Box>
    );
  }

  // 2. Получаем связи между тегом и фотографиями
  const { data: photoTags, error: photoTagsError } = await supabase
    .from('photo_tags')
    .select('photo_id')
    .eq('tag_id', tag.id);

  if (photoTagsError) {
    console.error('Ошибка загрузки связей тегов:', photoTagsError);

    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">
          Не удалось загрузить фотографии.
        </Typography>
      </Box>
    );
  }

  const photoIds = [
    ...new Set((photoTags ?? []).map((item) => item.photo_id)),
  ];

  // 3. Получаем фотографии
  let photos: {
    id: number;
    url: string;
    caption: string | null;
  }[] = [];

  if (photoIds.length > 0) {
    const { data, error } = await supabase
      .from('photos')
      .select('id, url, caption')
      .in('id', photoIds)
      .order('id', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки фотографий:', error);

      return (
        <Box sx={{ p: 4 }}>
          <Typography color="error">
            Не удалось загрузить фотографии.
          </Typography>
        </Box>
      );
    }

    photos = data ?? [];
  }

  return (
    <Box
      component="main"
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 5 },
      }}
    >
      {/* Заголовок и счётчик */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          backgroundColor: '#f5f7ff',
          border: '1px solid #e2e8f5',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem' },
              overflowWrap: 'anywhere',
            }}
          >
            Фотографии с тегом
          </Typography>

          <Typography
            variant="h5"
            sx={{
              color: '#1976d2',
              fontWeight: 600,
              mt: 0.5,
              overflowWrap: 'anywhere',
            }}
          >
            #{tag.name}
          </Typography>
        </Box>

        <Chip
          icon={<PhotoLibraryOutlinedIcon />}
          label={`Найдено: ${photos.length}`}
          color="primary"
          variant="outlined"
          sx={{
            fontWeight: 600,
            fontSize: '0.95rem',
            py: 2,
            flexShrink: 0,
          }}
        />
      </Box>

      {/* Кнопка возврата */}
      <Button
        component={Link}
        href="/"
        variant="contained"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 4,
          borderRadius: 2,
          px: 2.5,
          py: 1.2,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 2,
          },
        }}
      >
        Вернуться в галерею
      </Button>

      {/* Пустой результат */}
      {photos.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            border: '1px dashed #cbd5e1',
            borderRadius: 3,
          }}
        >
          <PhotoLibraryOutlinedIcon
            sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
          />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Пока нет фотографий с этим тегом
          </Typography>

          <Typography color="text.secondary">
            Попробуй выбрать другой тег.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          {photos.map((photo) => (
            <Card
              key={photo.id}
              component={Link}
              href={`/photos/${photo.id}`}
              sx={{
                display: 'block',
                minWidth: 0,
                color: 'inherit',
                textDecoration: 'none',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                },
              }}
            >
              <Box
                component="img"
                src={photo.url}
                alt={photo.caption ?? 'Фотография'}
                sx={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                }}
              />

              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    overflowWrap: 'anywhere',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '2.8em',
                  }}
                >
                  {photo.caption || 'Без текста'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

