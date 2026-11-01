import { createSupabaseServerClient } from '@/utils/supabase-server';
import {Container,Box,Paper,Typography,} from '@mui/material';
import CommentsSection from '@/components/CommentsSection';

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .order('id', { ascending: true });

  if (photosError) {
    console.error('Ошибка загрузки фотографий:', photosError);
  }

  const photo = photos?.find(
    (item) => String(item.id) === id
  );

  if (!photo) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #e5e7eb',
          }}
        >
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Фотография не найдена
          </Typography>

          <Typography color="text.secondary">
            Возможно, публикация была удалена.
          </Typography>
        </Paper>
      </Container>
    );
  }


  
  const { data: author, error: authorError } = await supabase
    .from('profiles')
    .select('id, name_first, name_last')
    .eq('id', photo.user_id)
    .maybeSingle();

  if (authorError) {
    console.error('Ошибка загрузки автора:', authorError);
  }

  const {
    data: comments,
    error: commentsError,
  } = await supabase
    .from('comments')
    .select(`
      id,
      post_id,
      user_id,
      text,
      created_at,
      profiles (
        name_first,
        name_last
      )
    `)
    .eq('post_id', photo.id)
    .order('created_at', { ascending: true });

  if (commentsError) {
    console.error('Ошибка загрузки комментариев:', commentsError);
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 3 },
          borderRadius: 4,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        {/* Фотография */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            borderRadius: 3,
            backgroundColor: '#f5f6f8',
          }}
        >
          <Box
            component="img"
            src={photo.url}
            alt={photo.caption ?? 'Фотография'}
            sx={{
              display: 'block',
              width: '100%',
              maxWidth: 1000,
              maxHeight: '75vh',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 3,
            }}
          />
        </Box>

        
         {/* Автор фотографии */}
        <Box sx={{ pb: 1 }}>
         <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700 }}
          >
           {author
            ? [author.name_first, author.name_last]
               .filter(Boolean)
               .join(' ') || 'Пользователь'
            : 'Автор не указан'}
        </Typography>
      </Box>

           {/* Подпись */}
       <Box sx={{ py: 2 }}>
         <Typography
           variant="body1"
           sx={{
             fontSize: '1rem',
             lineHeight: 1.7,
             whiteSpace: 'pre-wrap',
             overflowWrap: 'anywhere',
            }}
          >
            {photo.caption || 'Без текста'}
         </Typography>
      </Box>
        {/* Комментарии */}
        <Paper
          variant="outlined"
          sx={{
            mt: 1,
            borderRadius: 3,
            overflow: 'hidden',
            borderColor: '#e5e7eb',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2,
              backgroundColor: '#f8faff',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Комментарии
            </Typography>
          </Box>

          <Box
            sx={{
              height: { xs: 350, sm: 400 },
              minHeight: 0,
            }}
          >
            <CommentsSection
              postId={photo.id}
              initialComments={comments ?? []}
              currentUserId={user?.id ?? null}
              postAuthorId={photo.user_id}
            />
          </Box>
        </Paper>
      </Paper>
    </Container>
  );
}

