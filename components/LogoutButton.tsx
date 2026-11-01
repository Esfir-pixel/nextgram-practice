"use client";

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

import { supabaseBrowser } from "@/utils/supabase-browser";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();

    router.refresh();
  }

  return (
    <Button
      variant="outlined"
      onClick={handleLogout}
    >
      Выйти
    </Button>
  );
}

