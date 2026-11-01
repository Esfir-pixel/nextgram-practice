'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';
import { deletePhotoAction } from '@/app/actions';

type DeletePhotoButtonProps = {
  photoId: number;
  storagePath: string | null;
};

export default function DeletePhotoButton({
  photoId,
  storagePath,
}: DeletePhotoButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (loading) return;

    const confirmed = window.confirm(
      'Удалить эту фотографию вместе со всеми комментариями?'
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await deletePhotoAction(photoId, storagePath);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('Ошибка удаления фотографии:', error);
      window.alert('Не удалось удалить фотографию.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outlined"
      color="error"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? 'Удаление...' : 'Удалить'}
    </Button>
  );
}