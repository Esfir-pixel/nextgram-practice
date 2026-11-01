
import Link from "next/link";
import { Box, Typography } from "@mui/material";

export default function SiteTitle() {
  return (
    <Box
      sx={{
        textAlign: "center",
      }}
    >
      <Typography variant="h4" component="div">
        <Link
          href="/"
          style={{
            color: "black",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "3rem",
          }}
        >
          Nextgram
        </Link>
      </Typography>
    </Box>
  );
}

