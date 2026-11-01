'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, TextField, Box, Alert } from '@mui/material';
import { updatePhotoWithTagsAction } from '@/app/actions';

type EditPhotoButtonProps = {
  photoId: number;
  initialCaption: string | null;
  initialTags: string[];
};

export default function EditPhotoButton({
  photoId,
  initialCaption,
  initialTags,
}: EditPhotoButtonProps) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(initialCaption ?? '');
  const [tagsInput, setTagsInput] = useState(initialTags.join(', '));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSave() {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const result = await updatePhotoWithTagsAction(
        photoId,
        caption,
        tags
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      setEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Ошибка редактирования публикации:', error);
      setError('Не удалось сохранить изменения.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setCaption(initialCaption ?? '');
    setTagsInput(initialTags.join(', '));
    setEditing(false);
    setError('');
  }

  if (!editing) {
    return (
      <Button
        variant="outlined"
        onClick={() => setEditing(true)}
      >
        Редактировать пост
      </Button>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 2,
      }}
    >
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Текст поста"
        placeholder="Напиши описание фотографии..."
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        multiline
        minRows={3}
        fullWidth
        disabled={loading}
        sx={{
          backgroundColor: '#fff',
          '& .MuiInputBase-root': {
            backgroundColor: '#fff',
          },
        }}
      />

      <TextField
        label="Теги"
        placeholder="котики, природа, лето"
        helperText="Вводи теги через запятую"
        value={tagsInput}
        onChange={(event) => setTagsInput(event.target.value)}
        fullWidth
        disabled={loading}
        sx={{
          backgroundColor: '#fff',
          '& .MuiInputBase-root': {
            backgroundColor: '#fff',
          },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </Button>

        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={loading}
        >
          Отмена
        </Button>
      </Box>
    </Box>
  );
}

