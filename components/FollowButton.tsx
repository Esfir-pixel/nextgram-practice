
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Box } from '@mui/material';
import {
  followUser,
  unfollowUser,
} from '@/app/actions';

type FollowButtonProps = {
  followingId: string;
  initiallyFollowing: boolean;
};

export default function FollowButton({
  followingId,
  initiallyFollowing,
}: FollowButtonProps) {
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleToggleFollow() {
    if (loading) return;

    setLoading(true);
    setMessage('');

    try {
      const result = isFollowing
        ? await unfollowUser(followingId)
        : await followUser(followingId);

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setIsFollowing((previous) => !previous);
      router.refresh();
    } catch (error) {
      console.error('Ошибка изменения подписки:', error);
      setMessage('Не удалось изменить подписку. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Button
        variant={isFollowing ? 'outlined' : 'contained'}
        onClick={handleToggleFollow}
        disabled={loading}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
        }}
      >
        {loading
          ? 'Подождите...'
          : isFollowing
            ? 'Отписаться'
            : 'Подписаться'}
      </Button>

      {message && (
        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
          {message}
        </Alert>
      )}
    </Box>
  );
}