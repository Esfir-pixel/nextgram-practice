# NextGram

Учебный проект — аналог Instagram на Next.js 15 (App Router) + Supabase.
Выполнен в рамках производственной практики.

## Стек

- **Next.js 15.0.5** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — Auth, Postgres, Storage
- **MUI** (`@mui/material`) — UI-компоненты

## Возможности

- Регистрация и вход через Supabase Auth
- Загрузка фотографий в Supabase Storage
- Публичная галерея и лента подписок
- Теги и навигация по тегам
- Комментарии: добавление, удаление (автор комментария и автор поста)
- Подписки и отписки от пользователей
- Приватные фото с системой запросов доступа
- Модальный просмотр фото через parallel routes (`@modal`)

## Запуск локально

1. Клонируй репозиторий:

   ```bash
   git clone <URL-твоего-репозитория>
   cd nextgram
   ```

## Атрибуция

Изначальная идея структуры проекта (parallel routes для модалок) — из официального
примера Next.js: [vercel/nextgram](https://github.com/vercel/nextgram).
