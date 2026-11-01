'use client';

import {Alert,Box,Button,Checkbox,Container,FormControlLabel,TextField,Typography,} from '@mui/material';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/utils/supabase-browser';
import SiteTitle from '@/components/SiteTitle';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 2000;
const MAX_TAGS = 30;
const MAX_TAG_LENGTH = 50;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default function UploadPage() {
  const [caption, setCaption] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setFile(null);
      event.target.value = '';
      setErrorMessage(
        'Разрешены только изображения JPEG, PNG и WebP.'
      );
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      event.target.value = '';
      setErrorMessage('Выбранный файл пуст.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      event.target.value = '';
      setErrorMessage(
        'Размер фотографии не должен превышать 5 МБ.'
      );
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (isUploading) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (!file) {
      setErrorMessage('Сначала выбери фотографию.');
      return;
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
      setErrorMessage(
        `Подпись не должна превышать ${MAX_CAPTION_LENGTH} символов.`
      );
      return;
    }

    const tags = [
      ...new Set(
        tagsInput
          .split(',')
          .map((tag) => tag.trim().replace(/^#+/, '').trim())
          .filter(Boolean)
      ),
    ];

    if (tags.length > MAX_TAGS) {
      setErrorMessage(
        `Можно добавить не более ${MAX_TAGS} тегов.`
      );
      return;
    }

    if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      setErrorMessage(
        `Длина каждого тега не должна превышать ${MAX_TAG_LENGTH} символов.`
      );
      return;
    }

    if (
      !ALLOWED_TYPES.includes(file.type) ||
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      setErrorMessage('Проверь формат и размер фотографии.');
      return;
    }

    setIsUploading(true);

    let uploadedFilePath: string | null = null;
    let insertedPhotoId: number | null = null;
    let photoInsertSucceeded = false;

    try {
      // 1. Проверяем авторизацию.
      const {
        data: { user },
        error: authError,
      } = await supabaseBrowser.auth.getUser();

      if (authError) {
        throw new Error(
          `Ошибка авторизации: ${authError.message}`
        );
      }

      if (!user) {
        throw new Error(
          'Войди в аккаунт, чтобы публиковать фотографии.'
        );
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          'Активная сессия не найдена. Перезайди в аккаунт.'
        );
      }

      if (session.user.id !== user.id) {
        throw new Error(
          'ID пользователя и сессии не совпадают.'
        );
      }

      // 2. Загружаем изображение в Storage.
      const extension = ALLOWED_EXTENSIONS[file.type];

      if (!extension) {
        throw new Error('Не удалось определить формат файла.');
      }

      const filePath =
        `${user.id}/${crypto.randomUUID()}.${extension}`;

      const {
        data: uploadedFile,
        error: storageError,
      } = await supabaseBrowser.storage
        .from('photos')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (storageError || !uploadedFile) {
        console.error('[STORAGE UPLOAD ERROR]', {
          message: storageError?.message ?? null,
          name: storageError?.name ?? null,
        });

        throw new Error(
          `Ошибка загрузки в Storage: ${
            storageError?.message ?? 'файл не загружен'
          }`
        );
      }

      uploadedFilePath = uploadedFile.path;

      // 3. Получаем URL загруженного изображения.
      const { data: publicUrlData } =
        supabaseBrowser.storage
          .from('photos')
          .getPublicUrl(uploadedFile.path);

      if (!publicUrlData.publicUrl) {
        throw new Error('Не удалось получить URL фотографии.');
      }

      // 4. Подготавливаем запись.
      const photoPayload = {
        user_id: user.id,
        url: publicUrlData.publicUrl,
        storage_path: uploadedFile.path,
        caption: caption.trim() || null,
        is_private: false,
        visibility: isHidden ? 'request_only' : 'public',
      };

      // 5. Сохраняем запись фотографии.
      const {
        data: insertedPhoto,
        error: insertError,
      } = await supabaseBrowser
        .from('photos')
        .insert(photoPayload)
        .select('id')
        .single();

      if (insertError) {
        console.error('[PHOTO INSERT ERROR]', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          userId: user.id,
          payloadUserId: photoPayload.user_id,
        });

        if (insertError.code === '42501') {
          throw new Error(
            'PostgreSQL отклонил INSERT по политике RLS. ' +
            'ID пользователя совпадает, поэтому нужно проверить ' +
            'триггеры таблицы photos и фактический контекст ' +
            'выполнения INSERT.'
          );
        }

        throw new Error(
          `Ошибка создания фотографии (${insertError.code}): ` +
          insertError.message
        );
      }

      if (!insertedPhoto) {
        throw new Error(
          'Supabase не вернул ID созданной фотографии.'
        );
      }

      insertedPhotoId = insertedPhoto.id;
      photoInsertSucceeded = true;

      // 6. Сохраняем теги.
      if (tags.length > 0) {
        const { error: tagsUpsertError } =
          await supabaseBrowser
            .from('tags')
            .upsert(
              tags.map((name) => ({ name })),
              {
                onConflict: 'name',
                ignoreDuplicates: true,
              }
            );

        if (tagsUpsertError) {
          throw new Error(
            `Ошибка сохранения тегов: ${tagsUpsertError.message}`
          );
        }

        const {
          data: savedTags,
          error: tagsSelectError,
        } = await supabaseBrowser
          .from('tags')
          .select('id, name')
          .in('name', tags);

        if (tagsSelectError || !savedTags) {
          throw new Error(
            `Ошибка получения тегов: ${
              tagsSelectError?.message ?? 'нет данных'
            }`
          );
        }

        if (savedTags.length !== tags.length) {
          throw new Error(
            'Получены не все теги после сохранения.'
          );
        }

        const { error: linksError } =
          await supabaseBrowser
            .from('photo_tags')
            .insert(
              savedTags.map((tag) => ({
                photo_id: insertedPhoto.id,
                tag_id: tag.id,
              }))
            );

        if (linksError) {
          throw new Error(
            `Ошибка привязки тегов: ${linksError.message}`
          );
        }
      }

      setSuccessMessage('Фотография успешно опубликована!');

      router.push('/my-photos');
      router.refresh();
    } catch (error) {
      console.error('[PHOTO UPLOAD FAILED]', error);

      // Удаляем запись только если она была создана.
      if (photoInsertSucceeded && insertedPhotoId !== null) {
        const { error: cleanupPhotoError } =
          await supabaseBrowser
            .from('photos')
            .delete()
            .eq('id', insertedPhotoId);

        if (cleanupPhotoError) {
          console.error('[PHOTO CLEANUP ERROR]', {
            message: cleanupPhotoError.message,
            code: cleanupPhotoError.code,
          });
        }
      }

      // Удаляем загруженный файл при неудаче.
      if (uploadedFilePath) {
        const { error: cleanupStorageError } =
          await supabaseBrowser.storage
            .from('photos')
            .remove([uploadedFilePath]);

        if (cleanupStorageError) {
          console.error('[STORAGE CLEANUP ERROR]', {
            message: cleanupStorageError.message,
          });
        }
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Произошла непредвиденная ошибка.'
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <SiteTitle />

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleUpload();
        }}
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          mt: 4,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            fontFamily: 'Montserrat, sans-serif',
            textAlign: 'center',
          }}
        >
          Upload photo
        </Typography>

        {errorMessage && (
          <Alert severity="error">{errorMessage}</Alert>
        )}

        {successMessage && (
          <Alert severity="success">{successMessage}</Alert>
        )}

        <TextField
          fullWidth
          label="Caption"
          placeholder="Write a caption..."
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          inputProps={{ maxLength: MAX_CAPTION_LENGTH }}
          helperText={`${caption.length}/${MAX_CAPTION_LENGTH}`}
        />

        <TextField
          fullWidth
          label="Tags"
          placeholder="котики, природа, лето"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          helperText="Введи теги через запятую, максимум 30"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={isHidden}
              onChange={(event) =>
                setIsHidden(event.target.checked)
              }
            />
          }
          label="Скрытая фотография (доступ по запросу)"
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: -1 }}
        >
          Такая фотография будет видна в галерее размытой,
          а смотреть её смогут только те, кому ты одобришь
          запрос.
        </Typography>

        <Button
          variant="outlined"
          component="label"
          disabled={isUploading}
        >
          Выбрать фото
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleFileChange}
          />
        </Button>

        {file && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: 'anywhere' }}
          >
            Выбран файл: {file.name} (
            {(file.size / (1024 * 1024)).toFixed(2)} МБ)
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={!file || isUploading}
        >
          {isUploading ? 'Загрузка...' : 'Загрузить фото'}
        </Button>
      </Box>
    </Container>
  );
}