'use client';

import { useState } from 'react';
import { Box, Button } from '@mui/material';

type PhotoDescriptionProps = {
  caption: string | null;
  tagNames: string[];
};

export default function PhotoDescription({
  caption,
  tagNames,
}: PhotoDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const hasCaption = Boolean(caption && caption.trim());
  const hasTags = tagNames.length > 0;

  if (!hasCaption && !hasTags) return null;

  return (
    <Box sx={{ mb: 1 }}>
      {/* Подпись */}
      {hasCaption && (
        <Box
          sx={{
            fontWeight: 500,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            mb: hasTags ? 1 : 0,
            ...(expanded
              ? {}
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {caption}
        </Box>
      )}

      {/* Теги */}
      {hasTags && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            ...(expanded
              ? {}
              : {
                  maxHeight: 48,        // ~2 строки тегов
                  overflow: 'hidden',
                }),
          }}
        >
          {tagNames.map((tag) => (
            <a
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              style={{
                color: '#1976d2',
                fontSize: '0.9rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              #{tag}
            </a>
          ))}
        </Box>
      )}

      {/* Кнопка свернуть/развернуть — показываем всегда, если есть контент.*/}
      {(hasCaption || hasTags) && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            mt: 0.5,
            px: 0,
            minWidth: 0,
            fontSize: '0.8rem',
            textTransform: 'none',
          }}
        >
          {expanded ? 'Свернуть' : 'Показать полностью'}
        </Button>
      )}
    </Box>
  );
}