'use client';

import { useState } from 'react';
import { CircularProgress, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

export default function PreviousPhotoButton({
  photoId,
}: {
  photoId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handlePrevious() {
    setLoading(true);
    router.replace(`/photos/${photoId}`);
  }

  return (
    <IconButton
      onClick={handlePrevious}
      aria-label="Предыдущая фотография"
      disabled={loading}
    >
      {loading ? <CircularProgress size={24} /> : <ArrowBackIcon />}
    </IconButton>
  );
}