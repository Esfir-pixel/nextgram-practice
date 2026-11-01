'use server';

import { createSupabaseServerClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';

// Удаление фотографии и файла из Storage
export async function deletePhotoAction(
  photoId: number,
  storagePath: string | null
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: 'Необходимо войти в аккаунт.',
    };
  }

  // 1. Проверяем, что фото принадлежит пользователю, и берём storage_path
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('id, user_id, storage_path')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (photoError) {
    console.error('Ошибка проверки фотографии:', photoError);

    return {
      success: false,
      message: 'Не удалось проверить фотографию.',
    };
  }

  if (!photo) {
    return {
      success: false,
      message:
        'Фотография не найдена или у вас нет прав на её удаление.',
    };
  }

  const path = storagePath ?? photo.storage_path;

  // 2. Удаляем строку из photos
  const { data: deletedPhotos, error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photo.id)
    .eq('user_id', user.id)
    .select('id');

  if (deleteError) {
    console.error('Ошибка удаления поста:', deleteError);

    return {
      success: false,
      message: 'Не удалось удалить запись поста.',
    };
  }

  if (!deletedPhotos || deletedPhotos.length === 0) {
    return {
      success: false,
      message: 'Запись поста не была удалена.',
    };
  }

  // 3. Удаляем файл из Storage (если путь известен)
  if (path) {
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([path]);

    if (storageError) {
      console.error('Ошибка удаления файла:', storageError);

      return {
        success: false,
        message:
          'Пост удалён, но файл не удалось удалить из Storage.',
      };
    }
  } else {
    console.warn(
      '[deletePhotoAction] storage_path отсутствует, файл не удалён:',
      photoId
    );
  }

  revalidatePath('/');
  revalidatePath('/my-photos');

  return {
    success: true,
    message: 'Пост и файл успешно удалены.',
  };
}
// Редактирование подписи фотографии
export async function updatePhotoCaptionAction(
  photoId: number,
  caption: string
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: 'Необходимо войти в аккаунт.',
    };
  }

  if (
    !Number.isSafeInteger(photoId) ||
    photoId <= 0 ||
    typeof caption !== 'string'
  ) {
    return {
      success: false,
      message: 'Некорректные данные публикации.',
    };
  }

  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (photoError) {
    console.error('Ошибка проверки поста:', photoError);

    return {
      success: false,
      message: 'Не удалось проверить пост.',
    };
  }

  if (!photo) {
    return {
      success: false,
      message: 'Пост не найден или у вас нет прав на его редактирование.',
    };
  }

  const { data: updatedPhoto, error: updateError } = await supabase
    .from('photos')
    .update({
      caption: caption.trim() || null,
    })
    .eq('id', photoId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedPhoto) {
    console.error('Ошибка редактирования поста:', updateError);

    return {
      success: false,
      message: 'Не удалось сохранить изменения.',
    };
  }

  revalidatePath('/');
  revalidatePath('/my-photos');
  revalidatePath(`/photos/${photoId}`);

  return {
    success: true,
    message: 'Текст поста успешно обновлён.',
  };
}

// Редактирование подписи и тегов
export async function updatePhotoWithTagsAction(
  photoId: number,
  caption: string,
  tagsInput: string[]
) {
  const supabase = await createSupabaseServerClient();

  // 1. Проверяем авторизацию
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: 'Необходимо войти в аккаунт.',
    };
  }

  // 2. Проверяем входные данные
  if (
    !Number.isSafeInteger(photoId) ||
    photoId <= 0 ||
    typeof caption !== 'string' ||
    !Array.isArray(tagsInput) ||
    tagsInput.some((tag) => typeof tag !== 'string')
  ) {
    return {
      success: false,
      message: 'Некорректные данные публикации.',
    };
  }

  // 3. Проверяем владельца публикации
  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (photoError) {
    console.error('Ошибка проверки публикации:', photoError);

    return {
      success: false,
      message: 'Не удалось проверить публикацию.',
    };
  }

  if (!photo) {
    return {
      success: false,
      message: 'Публикация не найдена или у вас нет прав на редактирование.',
    };
  }

  // 4. Очищаем теги и убираем дубликаты
  const tags = [
    ...new Set(
      tagsInput
        .map((tag) => tag.trim().replace(/^#+/, ''))
        .filter((tag) => tag.length > 0)
    ),
  ];

  if (tags.length > 30 || tags.some((tag) => tag.length > 50)) {
    return {
      success: false,
      message: 'Допускается не более 30 тегов длиной до 50 символов каждый.',
    };
  }

  // 5. Создаём отсутствующие теги
  if (tags.length > 0) {
    const { error: upsertError } = await supabase
      .from('tags')
      .upsert(
        tags.map((name) => ({ name })),
        {
          onConflict: 'name',
          ignoreDuplicates: true,
        }
      );

    if (upsertError) {
      console.error('Ошибка сохранения тегов:', upsertError);

      return {
        success: false,
        message: 'Не удалось сохранить названия тегов.',
      };
    }
  }

  // 6. Получаем ID тегов
  let tagIds: number[] = [];

  if (tags.length > 0) {
    const { data: savedTags, error: savedTagsError } = await supabase
      .from('tags')
      .select('id, name')
      .in('name', tags);

    if (savedTagsError || !savedTags) {
      console.error('Ошибка получения тегов:', savedTagsError);

      return {
        success: false,
        message: 'Не удалось получить сохранённые теги.',
      };
    }

    if (savedTags.length !== tags.length) {
      return {
        success: false,
        message: 'Не удалось найти все теги. Проверьте права доступа.',
      };
    }

    tagIds = savedTags.map((tag) => tag.id);
  }

  // 7. Получаем существующие связи фотографии с тегами
  const { data: currentLinks, error: linksError } = await supabase
    .from('photo_tags')
    .select('tag_id')
    .eq('photo_id', photoId);

  if (linksError || !currentLinks) {
    console.error('Ошибка чтения связей тегов:', linksError);

    return {
      success: false,
      message: 'Не удалось прочитать текущие теги.',
    };
  }

  const currentIds = currentLinks.map((link) => link.tag_id);

  const idsToAdd = tagIds.filter(
    (id) => !currentIds.includes(id)
  );

  const idsToRemove = currentIds.filter(
    (id) => !tagIds.includes(id)
  );

  // 8. Добавляем новые связи
  if (idsToAdd.length > 0) {
    const { error: insertLinksError } = await supabase
      .from('photo_tags')
      .insert(
        idsToAdd.map((tagId) => ({
          photo_id: photoId,
          tag_id: tagId,
        }))
      );

    if (insertLinksError) {
      console.error('Ошибка добавления тегов:', insertLinksError);

      return {
        success: false,
        message: 'Не удалось добавить новые теги.',
      };
    }
  }

  // 9. Удаляем связи с удалёнными тегами
  if (idsToRemove.length > 0) {
    const { error: removeLinksError } = await supabase
      .from('photo_tags')
      .delete()
      .eq('photo_id', photoId)
      .in('tag_id', idsToRemove);

    if (removeLinksError) {
      console.error('Ошибка удаления связей тегов:', removeLinksError);

      return {
        success: false,
        message: 'Не удалось обновить связи тегов.',
      };
    }
  }

  // 10. Обновляем подпись
  const { data: updatedPhoto, error: updateError } = await supabase
    .from('photos')
    .update({
      caption: caption.trim() || null,
    })
    .eq('id', photoId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedPhoto) {
    console.error('Ошибка сохранения публикации:', updateError);

    return {
      success: false,
      message: 'Теги обработаны, но не удалось сохранить подпись.',
    };
  }

  revalidatePath('/');
  revalidatePath('/my-photos');
  revalidatePath(`/photos/${photoId}`);

  return {
    success: true,
    message: 'Подпись и теги успешно сохранены.',
  };
}

// Подписка на пользователя
export async function followUser(followingId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: 'Войдите в аккаунт, чтобы подписаться.',
    };
  }

  if (
    typeof followingId !== 'string' ||
    !followingId ||
    user.id === followingId
  ) {
    return {
      success: false,
      message: 'Некорректный пользователь для подписки.',
    };
  }

  // Проверяем существование пользователя
  const { data: targetUser, error: targetError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', followingId)
    .maybeSingle();

  if (targetError || !targetUser) {
    console.error('Ошибка проверки пользователя:', targetError);

    return {
      success: false,
      message: 'Пользователь не найден.',
    };
  }

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: followingId,
    });

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        message: 'Вы уже подписаны на этого пользователя.',
      };
    }

    console.error('Ошибка подписки:', error);

    return {
      success: false,
      message: 'Не удалось оформить подписку.',
    };
  }

  revalidatePath('/users');
  revalidatePath('/feed');

  return {
    success: true,
    message: 'Вы успешно подписались!',
  };
}

// Отписка от пользователя

export async function unfollowUser(followingId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: 'Войдите в аккаунт, чтобы отписаться.',
    };
  }

  if (
    typeof followingId !== 'string' ||
    !followingId ||
    user.id === followingId
  ) {
    return {
      success: false,
      message: 'Некорректный пользователь.',
    };
  }

  const { data: deletedFollow, error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .select('following_id');

  if (error) {
    console.error('Ошибка отписки:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      message: 'Не удалось отменить подписку.',
    };
  }

  if (!deletedFollow || deletedFollow.length === 0) {
    return {
      success: false,
      message: 'Подписка не найдена или удаление запрещено.',
    };
  }

  revalidatePath('/users');
  revalidatePath('/feed');
  revalidatePath('/');

  return {
    success: true,
    message: '',
  };
}
  