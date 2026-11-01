'use client';

import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';

type Props = {
  photoId: number;
  caption: string | null;
};

export default function HiddenPhotoCard({ photoId, caption }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        backgroundColor: '#111',
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Размытая заглушка */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 30% 30%, #555, #222 70%)',
          filter: 'blur(12px)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Контент поверх */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          color: '#fff',
          px: 2,
        }}
      >
        <Typography variant="body2" sx={{ mb: 1, opacity: 0.85 }}>
          {caption || 'Скрытая фотография'}
        </Typography>

        <Button
          component={Link}
          href={`/photos/${photoId}`}
          variant="contained"
          size="small"
        >
          Запросить доступ
        </Button>
      </Box>
    </Box>
  );
}