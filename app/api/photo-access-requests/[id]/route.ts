import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const photoId = Number(id);

    if (!Number.isSafeInteger(photoId) || photoId <= 0) {
      return NextResponse.json(
        { error: 'Некорректный ID фотографии.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const email =
      typeof body?.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: 'Не удалось проверить авторизацию.' },
        { status: 500 }
      );
    }

    if (
      !user &&
      (email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      return NextResponse.json(
        { error: 'Укажи корректный email.' },
        { status: 400 }
      );
    }

    const { data: canRequest, error: checkError } =
      await supabase.rpc('can_request_photo_access', {
        p_photo_id: photoId,
      });

    if (checkError) {
      console.error(
        'Ошибка проверки возможности запроса:',
        checkError
      );

      return NextResponse.json(
        { error: 'Не удалось проверить доступ к фотографии.' },
        { status: 500 }
      );
    }

    if (!canRequest) {
      return NextResponse.json(
        { error: 'Скрытая фотография не найдена.' },
        { status: 404 }
      );
    }



   const { data: debugUid } = await supabase.rpc('debug_photo_auth');
console.log('[ACCESS REQUEST AUTH]', {
  userId: user?.id,
  authUid: debugUid,
  hasSession: Boolean((await supabase.auth.getSession()).data.session),
});

console.log('[ACCESS REQUEST]', {
  userId: user?.id,
  photoId,
});

const { data: rlsUid, error: rlsUidError } = await supabase.rpc('whoami');
console.log('[RLS WHOAMI]', { userId: user?.id, rlsUid, rlsUidError });

    const insertPayload = {
      photo_id: photoId,
      requester_user_id: user?.id ?? null,
      requester_email: user ? null : email,
      status: 'pending' as const,
    };

    console.log('[ACCESS REQUEST PAYLOAD]', insertPayload);

    // Для авторизованного — RETURNING (есть SELECT-политика).
    // Для гостя — без RETURNING (политики для anon нет, RETURNING упадёт).
    if (user) {
      const { data: insertedRequest, error: insertError } =
        await supabase
          .from('photo_access_requests')
          .insert(insertPayload)
          .select('id, status, created_at')
          .single();

      if (insertError || !insertedRequest) {
        console.error('Ошибка создания запроса:', insertError);

        return NextResponse.json(
          {
            error:
              'Не удалось отправить запрос. Проверь настройки доступа Supabase.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Запрос отправлен автору.',
          request: insertedRequest,
        },
        { status: 201 }
      );
    }


    const { error: insertError } = await supabase
      .from('photo_access_requests')
      .insert(insertPayload);

    if (insertError) {
      console.error('Ошибка создания запроса (гость):', insertError);

      return NextResponse.json(
        {
          error:
            'Не удалось отправить запрос. Проверь настройки доступа Supabase.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Запрос отправлен автору.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Ошибка отправки запроса:', error);

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const requestId = id;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        requestId
      )
    ) {
      return NextResponse.json(
        { error: 'Некорректный ID запроса.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      !['approved', 'rejected'].includes(body.status)
    ) {
      return NextResponse.json(
        { error: 'Допустимые статусы: approved, rejected.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Войди в аккаунт.' },
        { status: 401 }
      );
    }

    // ВАЖНО: если RLS на photos не отдаёт эту строку автору —
    // JOIN вернёт пусто. Используем отдельный запрос без join.
    const { data: accessRequest, error: lookupError } =
      await supabase
        .from('photo_access_requests')
        .select('id, photo_id, status')
        .eq('id', requestId)
        .maybeSingle();

    if (lookupError) {
      console.error('Ошибка поиска запроса:', lookupError);

      return NextResponse.json(
        { error: 'Не удалось проверить запрос.' },
        { status: 500 }
      );
    }

    if (!accessRequest) {
      return NextResponse.json(
        { error: 'Запрос не найден.' },
        { status: 404 }
      );
    }

    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, user_id, visibility')
      .eq('id', accessRequest.photo_id)
      .maybeSingle();

    if (photoError) {
      console.error('Ошибка загрузки фото:', photoError);

      return NextResponse.json(
        { error: 'Не удалось проверить фото.' },
        { status: 500 }
      );
    }

    if (!photo || photo.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Нет прав для этого действия.' },
        { status: 403 }
      );
    }

    if (photo.visibility !== 'request_only') {
      return NextResponse.json(
        { error: 'Фотография не является скрытой.' },
        { status: 409 }
      );
    }

    if (accessRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Этот запрос уже обработан.' },
        { status: 409 }
      );
    }

    const { data: updatedRequest, error: updateError } =
      await supabase
        .from('photo_access_requests')
        .update({
          status: body.status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .select('id, status, reviewed_at')
        .maybeSingle();

    if (updateError) {
      console.error('Ошибка обновления запроса:', updateError);

      return NextResponse.json(
        { error: 'Не удалось сохранить решение.' },
        { status: 500 }
      );
    }

    if (!updatedRequest) {
      return NextResponse.json(
        { error: 'Запрос уже обработан или недоступен.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Ошибка обработки запроса:', error);

    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера.' },
      { status: 500 }
    );
  }
}