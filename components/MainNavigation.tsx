'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Box, Button } from '@mui/material';
import { supabaseBrowser } from '@/utils/supabase-browser';

const navigationItems = [
  { label: 'Галерея', href: '/' },
  { label: 'Пользователи', href: '/users' },
  { label: 'Моя лента', href: '/feed' },
  { label: 'Запросы', href: '/requests' },
];

export default function MainNavigation() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCount() {
      const { data, error } = await supabaseBrowser.rpc(
        'count_pending_requests'
      );

      if (cancelled) return;

      if (error) {
        // гость или нет прав — просто 0
        setPendingCount(0);
        return;
      }

      setPendingCount(Number(data ?? 0));
    }

    void loadCount();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Box
      component="nav"
      aria-label="Основная навигация"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
        mt: 2,
        mb: 2,
        width: '100%',
      }}
    >
      {navigationItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

        const showBadge =
          item.href === '/requests' && pendingCount > 0;

        return (
          <Badge
            key={item.href}
            color="error"
            badgeContent={showBadge ? pendingCount : 0}
            overlap="rectangular"
          >
            <Button
              component={Link}
              href={item.href}
              variant={isActive ? 'contained' : 'outlined'}
              aria-current={isActive ? 'page' : undefined}
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: 'none',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                borderColor: '#1976d2',
                color: isActive ? '#fff' : '#1976d2',
                backgroundColor: isActive
                  ? '#1976d2'
                  : 'transparent',
                '&:hover': {
                  borderColor: '#1565c0',
                  backgroundColor: isActive
                    ? '#1565c0'
                    : 'rgba(25, 118, 210, 0.08)',
                },
              }}
            >
              {item.label}
            </Button>
          </Badge>
        );
      })}
    </Box>
  );
}