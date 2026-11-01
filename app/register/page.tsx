"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteTitle from "@/components/SiteTitle";

import { supabaseBrowser } from '@/utils/supabase-browser';


import {Container,Box,Typography,TextField,Button,Snackbar,Alert,} from "@mui/material";

export default function RegisterPage() {
  const [nameFirst, setNameFirst] = useState("");
  const [nameLast, setNameLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  async function handleRegister() {
    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          name_first: nameFirst,
          name_last: nameLast,
        },
      },
    });

    console.log("data:", data);
    console.log("error:", error);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/");
  }

  return (
    <Container maxWidth="sm">

       <SiteTitle />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mt: 4,
        }}
      >
        <Typography variant="h4" component="h1">
          Регистрация
        </Typography>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleRegister();
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
            />

            <TextField
              label="Пароль"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
            />

            <TextField
              label="Имя"
              type="text"
              value={nameFirst}
              onChange={(event) => setNameFirst(event.target.value)}
              fullWidth
            />

            <TextField
              label="Фамилия"
              type="text"
              value={nameLast}
              onChange={(event) => setNameLast(event.target.value)}
              fullWidth
            />

            <Button type="submit" variant="contained">
              Зарегистрироваться
            </Button>
          </Box>
        </form>

        <Typography>
          Уже есть аккаунт?{" "}
          <Link href="/login">
            Войти
          </Link>
        </Typography>
      </Box>

      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={6000}
        onClose={() => setErrorMessage("")}
      >
        <Alert
          onClose={() => setErrorMessage("")}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}


