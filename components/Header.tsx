import Link from "next/link";
import { Box, Typography, Button, IconButton } from "@mui/material";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import LogoutButton from "@/components/LogoutButton";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import NotificationsIcon from "@mui/icons-material/Notifications";

export default async function Header() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Box
      sx={{
        mt: 3,
        mb: 2,
      }}
    >
      {/* Название сайта */}
      <Box
        sx={{
          textAlign: "flex-start",
        }}
      >
        <Typography variant="h4" component="div">
          <Link
            href="/"
            style={{
              color: "black",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "5rem",
              fontFamily: "Montserrat",
            }}
          >
            Nextgram
          </Link>
        </Typography>
      </Box>

      {/* Профиль */}
      {user && (
        <Box
          sx={{
            mt: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              color: "black",
              fontWeight: "bold",
              fontSize: "2rem",
              fontFamily: "Montserrat",
            }}
          >
            Профиль
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography
              sx={{
                color: "black",
                fontWeight: "bold",
                fontSize: "1rem",
                fontFamily: "Montserrat",
              }}
            >
              {user.email}
            </Typography>

            {/* Загрузить фотографию */}
            <IconButton
              component={Link}
              href="/upload"
              aria-label="Загрузить фотографию"
            >
              <CameraAltIcon />
            </IconButton>

            {/* Запросы на доступ */}
            <IconButton
              component={Link}
              href="/requests"
              aria-label="Запросы на доступ"
            >
              <NotificationsIcon />
            </IconButton>

            {/* Мои фотографии */}
            <Button
              variant="outlined"
              component={Link}
              href="/my-photos"
            >
              Мои фото
            </Button>

            {/* Выход из аккаунта */}
            <LogoutButton />
          </Box>
        </Box>
      )}

      {/* Вход для неавторизованных пользователей */}
      {!user && (
        <Box
          sx={{
            mt: 2,
          }}
        >
          <Button
            variant="outlined"
            component={Link}
            href="/login"
          >
            Войти
          </Button>
        </Box>
      )}
    </Box>
  );
}

