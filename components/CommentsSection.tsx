'use client';

import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import { supabaseBrowser } from '@/utils/supabase-browser';

type Profile = {
  name_first: string | null;
  name_last: string | null;
};

type Comment = {
  id: number;
  post_id: number;
  user_id: string;
  text: string;
  created_at: string;
  profiles: Profile | Profile[] | null;
};

type CommentsSectionProps = {
  postId: number;
  initialComments: Comment[];
  currentUserId: string | null;
  postAuthorId: string;
  // ← НОВОЕ: сюда передаём ref или функцию скролла, если нужно
};

export default function CommentsSection({
  postId,
  initialComments,
  currentUserId,
  postAuthorId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  function canDelete(comment: Comment) {
    if (!currentUserId) return false;
    return currentUserId === comment.user_id || currentUserId === postAuthorId;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || submitting || !currentUserId) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabaseBrowser.auth.getUser();

      if (authError || !user || user.id !== currentUserId) {
        setErrorMessage('Сессия не найдена. Войдите повторно.');
        return;
      }

      const { data: insertedComment, error: insertError } =
        await supabaseBrowser
          .from('comments')
          .insert({ post_id: postId, user_id: user.id, text: trimmedText })
          .select('id, post_id, user_id, text, created_at')
          .single();

      if (insertError || !insertedComment) {
        console.error(insertError);
        setErrorMessage('Не удалось отправить комментарий.');
        return;
      }

      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('name_first, name_last')
        .eq('id', user.id)
        .maybeSingle();

      setComments((current) => [
        ...current,
        { ...insertedComment, profiles: profile ?? null },
      ]);
      setText('');
    } catch (error) {
      console.error(error);
      setErrorMessage('Ошибка при отправке комментария.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    if (!currentUserId || deletingId !== null) return;
    if (!window.confirm('Удалить этот комментарий?')) return;

    setDeletingId(commentId);
    setErrorMessage('');

    try {
      const { data, error } = await supabaseBrowser
        .from('comments')
        .delete()
        .eq('id', commentId)
        .or(`user_id.eq.${currentUserId},post_id.eq.${postId}`)
        .select('id');

      if (error) {
        console.error(error);
        setErrorMessage('Не удалось удалить комментарий.');
        return;
      }
      if (!data || data.length === 0) {
        setErrorMessage('Комментарий не удалён: недостаточно прав.');
        return;
      }

      setComments((current) => current.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error(error);
      setErrorMessage('Ошибка при удалении.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Список комментариев */}
      <Box sx={{ px: 2, pt: 2 }}>
        {comments.length > 0 ? (
          comments.map((comment) => {
            const profile = Array.isArray(comment.profiles)
              ? comment.profiles[0]
              : comment.profiles;

            const authorName = [profile?.name_first, profile?.name_last]
              .filter(Boolean)
              .join(' ');

            const isDeleting = deletingId === comment.id;

            return (
              <Box
                key={comment.id}
                sx={{
                  mb: 2,
                  wordBreak: 'break-word',
                  opacity: isDeleting ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ fontWeight: 600 }}>
                    {authorName || 'Пользователь'}
                  </Box>
                  {canDelete(comment) && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId !== null}
                      sx={{
                        minWidth: 0,
                        px: 1,
                        py: 0,
                        fontSize: '0.75rem',
                        textTransform: 'none',
                      }}
                    >
                      {isDeleting ? 'Удаление…' : 'Удалить'}
                    </Button>
                  )}
                </Box>
                <Box>{comment.text}</Box>
              </Box>
            );
          })
        ) : (
          <Box sx={{ color: 'text.secondary', mb: 2 }}>
            Пока комментариев нет
          </Box>
        )}
      </Box>

      {/* Форма — sticky внизу правой панели */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: '#fff',
          borderTop: '1px solid #ddd',
          zIndex: 1,
        }}
      >
        {currentUserId ? (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <TextField
              fullWidth
              label="Комментарий"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              multiline
              maxRows={4}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !text.trim()}
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              color: 'text.secondary',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            Войдите в аккаунт, чтобы оставить комментарий.
          </Box>
        )}
      </Box>
    </Box>
  );
}