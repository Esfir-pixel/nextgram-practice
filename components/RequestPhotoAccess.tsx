
'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material';

type Props = {
  photoId: number;
  isAuthenticated: boolean;
};

export default function RequestPhotoAccess({
  photoId,
  isAuthenticated,
}: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(
        `/api/photo-access-requests/${photoId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Не удалось отправить запрос.'
        );
      }

      setSuccess('Запрос отправлен автору фотографии.');
      setEmail('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Произошла ошибка.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 3,
        p: 3,
        border: '1px solid #e5e7eb',
        borderRadius: 3,
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        Запросить доступ
      </Typography>

      <Typography color="text.secondary">
        Эта фотография скрыта. Автор должен одобрить
        запрос, прежде чем ты сможешь её просмотреть.
      </Typography>

      {!isAuthenticated && (
        <TextField
          label="Твой email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
          inputProps={{ maxLength: 254 }}
          helperText="Укажи адрес, по которому с тобой можно связаться."
        />
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {success && <Alert severity="success">{success}</Alert>}

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
      >
        {loading ? 'Отправка...' : 'Отправить запрос'}
      </Button>
    </Box>
  );
}