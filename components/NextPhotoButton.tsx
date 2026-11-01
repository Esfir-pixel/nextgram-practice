'use client';

import { useState } from 'react';
import { CircularProgress, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useRouter } from 'next/navigation';

export default function NextPhotoButton({
  photoId,
}: {
  photoId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleNext() {
    setLoading(true);
    router.replace(`/photos/${photoId}`);
  }

  return (
    <IconButton
      onClick={handleNext}
      aria-label="Следующая фотография"
      disabled={loading}
    >
      {loading ? <CircularProgress size={24} /> : <ArrowForwardIcon />}
    </IconButton>
  );
}