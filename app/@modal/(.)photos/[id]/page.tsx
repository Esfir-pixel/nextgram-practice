import { createSupabaseServerClient } from '@/utils/supabase-server';
import { Modal } from './modal';
import { Alert, Box, Typography } from '@mui/material';
import NextPhotoButton from '@/components/NextPhotoButton';
import PreviousPhotoButton from '@/components/PreviousPhotoButton';
import CommentsSection from '@/components/CommentsSection';
import EditPhotoButton from '@/components/EditPhotoButton';
import FollowButton from '@/components/FollowButton';
import RequestPhotoAccess from '@/components/RequestPhotoAccess';
import PhotoDescription from '@/components/PhotoDescription';

type PhotoTagRow = {
  tags:
    | { id: number; name: string }
    | { id: number; name: string }[]
    | null;
};

type RequestInfo = {
  id: number;
  user_id: string;
  caption: string | null;
  visibility: string;
};

type RequestStatus = 'pending' | 'approved' | 'rejected';

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const photoId = (await params).id;
  const numericPhotoId = Number(photoId);

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Пробуем полное фото (RLS отдаст, если можно смотреть)
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('*')
    .eq('id', numericPhotoId)
    .maybeSingle();

  if (photoError) {
    console.error('Ошибка загрузки фото:', photoError);
  }

  // 2. Fallback: если RLS не отдал — узнаём метаданные для запроса доступа
  let requestInfo: RequestInfo | null = null;

  if (!photo && Number.isSafeInteger(numericPhotoId)) {
    const { data: infoRows, error: infoError } = await supabase.rpc(
      'get_photo_request_info',
      { p_photo_id: numericPhotoId }
    );

    if (infoError) {
      console.error('Ошибка get_photo_request_info:', infoError);
    }

    requestInfo = (infoRows?.[0] as RequestInfo | undefined) ?? null;
  }

  // 3. Ни фото, ни метаданных — не найдено
  if (!photo && !requestInfo) {
    return (
      <Modal>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            textAlign: 'center',
          }}
        >
          Фотография не найдена
        </Box>
      </Modal>
    );
  }

  // 4. Есть метаданные, но нет полного фото — заглушка + запрос доступа
  if (!photo && requestInfo) {
    let myRequestStatus: RequestStatus | null = null;

    if (user) {
      const { data: myRequest, error: myRequestError } = await supabase
        .from('photo_access_requests')
        .select('status')
        .eq('photo_id', requestInfo.id)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (myRequestError) {
        console.error(
          'Ошибка загрузки статуса запроса:',
          myRequestError
        );
      }

      myRequestStatus =
        (myRequest?.status as RequestStatus | undefined) ?? null;
    }

    const canSendRequest =
      myRequestStatus === null || myRequestStatus === 'rejected';

    return (
      <Modal>
        <Box sx={{ p: 3, maxWidth: 480 }}>
          <Typography variant="h6" fontWeight={600}>
            Фотография скрыта
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {requestInfo.caption
              ? `«${requestInfo.caption}»`
              : 'Автор ограничил доступ к этой фотографии.'}
          </Typography>

          {myRequestStatus === 'pending' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Запрос отправлен. Ждёт решения автора.
            </Alert>
          )}

          {myRequestStatus === 'rejected' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Автор отклонил запрос. Можно отправить повторно.
            </Alert>
          )}

          {!user && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Войди в аккаунт или укажи email, чтобы запросить доступ.
            </Alert>
          )}

          {canSendRequest && (
            <RequestPhotoAccess
              photoId={requestInfo.id}
              isAuthenticated={Boolean(user)}
            />
          )}
        </Box>
      </Modal>
    );
  }

  // 5. Полное фото есть — рендерим как раньше
  const typedPhoto = photo as NonNullable<typeof photo>;

  // Навигация по доступным фото
  const { data: photos } = await supabase
    .from('photos')
    .select('id')
    .order('id', { ascending: true });

  const list = photos ?? [];
  const currentIndex = list.findIndex(
    (item) => String(item.id) === photoId
  );

  const nextIndex =
    list.length > 0 && currentIndex !== -1
      ? (currentIndex + 1) % list.length
      : -1;
  const nextPhoto = nextIndex !== -1 ? list[nextIndex] : null;

  const previousIndex =
    list.length > 0 && currentIndex !== -1
      ? (currentIndex - 1 + list.length) % list.length
      : -1;
  const previousPhoto =
    previousIndex !== -1 ? list[previousIndex] : null;

  // Автор
  const { data: author, error: authorError } = await supabase
    .from('profiles')
    .select('id, name_first, name_last')
    .eq('id', typedPhoto.user_id)
    .maybeSingle();

  if (authorError) {
    console.error('Ошибка загрузки автора:', authorError);
  }

  // Подписка
  let isFollowingAuthor = false;
  if (user && author && user.id !== author.id) {
    const { data: follow, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_id', author.id)
      .maybeSingle();

    if (followError) {
      console.error('Ошибка проверки подписки:', followError);
    } else {
      isFollowingAuthor = Boolean(follow);
    }
  }

  // Теги
  const { data: photoTagRows, error: photoTagsError } = await supabase
    .from('photo_tags')
    .select('tags(id, name)')
    .eq('photo_id', typedPhoto.id);

  if (photoTagsError) {
    console.error('Ошибка загрузки тегов:', photoTagsError);
  }

  const tagNames = ((photoTagRows ?? []) as unknown as PhotoTagRow[])
    .map((row) => {
      const tag = row.tags;
      if (Array.isArray(tag)) return tag[0]?.name;
      return tag?.name;
    })
    .filter((name): name is string => Boolean(name));

  // Комментарии
  const { data: comments, error: commentsError } = await supabase
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
    .eq('post_id', typedPhoto.id)
    .order('created_at', { ascending: true });

  if (commentsError) {
    console.error('Ошибка загрузки комментариев:', commentsError);
  }

  return (
    <Modal>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: '80vh',
          minHeight: 0,
        }}
      >
        {/* Левая часть — фото + навигация */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            padding: 1,
          }}
        >
          {previousPhoto && (
            <PreviousPhotoButton photoId={previousPhoto.id} />
          )}

          <Box
            component="img"
            src={typedPhoto.url}
            alt={typedPhoto.caption ?? 'Фотография'}
            sx={{
              display: 'block',
              width: 'auto',
              maxWidth: '100%',
              height: 'auto',
              maxHeight: '75vh',
              objectFit: 'contain',
            }}
          />

          {nextPhoto && <NextPhotoButton photoId={nextPhoto.id} />}
        </Box>

        {/* Правая часть — колонка */}
        <Box
          sx={{
            width: '340px',
            flexShrink: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            color: '#222',
            borderLeft: '1px solid #ddd',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* ОДИН общий скролл для всего содержимого правой панели */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {/* Верхний блок: автор + Follow + СКРЫТОЕ + описание + Edit */}
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid #ddd',
                backgroundColor: '#fff',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {author
                    ? [author.name_first, author.name_last]
                        .filter(Boolean)
                        .join(' ') || 'Пользователь'
                    : 'Автор не указан'}
                </Box>

                {user && author && user.id !== author.id && (
                  <FollowButton
                    followingId={author.id}
                    initiallyFollowing={isFollowingAuthor}
                  />
                )}
              </Box>

              {typedPhoto.visibility === 'request_only' && (
                <Box
                  sx={{
                    display: 'inline-block',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    backgroundColor: '#111',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  СКРЫТОЕ
                </Box>
              )}

              <PhotoDescription
                caption={typedPhoto.caption}
                tagNames={tagNames}
              />

              {user?.id === typedPhoto.user_id && (
                <EditPhotoButton
                  photoId={typedPhoto.id}
                  initialCaption={typedPhoto.caption}
                  initialTags={tagNames}
                />
              )}
            </Box>

            {/* Заголовок "Комментарии" */}
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid #ddd',
                backgroundColor: '#fff',
              }}
            >
              <Box component="h3" sx={{ m: 0 }}>
                Комментарии
              </Box>
            </Box>

            {/* Комментарии */}
            <CommentsSection
              postId={typedPhoto.id}
              initialComments={comments ?? []}
              currentUserId={user?.id ?? null}
              postAuthorId={typedPhoto.user_id}
            />
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}