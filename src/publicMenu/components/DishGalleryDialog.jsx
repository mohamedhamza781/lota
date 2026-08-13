import { useEffect, useState } from "react";
import { Dialog, DialogContent, Box, Typography, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import { resolveImageUrl } from "../../api/uploads";

// ديالوغ معرض صور الصنف - بينفتح لما الزبون يضغط على كارد صنف عنده صورة
// وحدة أو أكتر (شوف DishCard.jsx). بيسمح يتنقل بين لغاية ٣ صور بأسهم
// يمين/يسار أو نقاط بالأسفل. لو الصنف عنده صورة وحدة بس، الأسهم والنقاط
// ما بتظهر أصلاً (مالها داعي لصورة وحدة).
export default function DishGalleryDialog({ item, onClose }) {
  const [index, setIndex] = useState(0);

  // كل مرة يتفتح فيها ديالوغ لصنف جديد، نرجع نبلش من أول صورة
  useEffect(() => {
    setIndex(0);
  }, [item]);

  if (!item) return null;
  const images = (item.imageUrls || []).map((url) => resolveImageUrl(url)).filter(Boolean);
  const hasMultiple = images.length > 1;

  function goPrev(e) {
    e.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  }
  function goNext(e) {
    e.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  }

  return (
    <Dialog
      open={Boolean(item)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "18px", overflow: "hidden", bgcolor: "background.paper" } }}
    >
      <DialogContent sx={{ p: 0, position: "relative" }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            insetInlineEnd: 8,
            zIndex: 3,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "#fff",
            "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
          }}
          size="small"
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>

        <Box sx={{ position: "relative", width: "100%", aspectRatio: "1 / 1", bgcolor: (theme) => theme.palette.action.hover }}>
          {images.length > 0 ? (
            <Box
              component="img"
              key={images[index]}
              src={images[index]}
              alt={item.name}
              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography color="text.secondary" sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>
                ما في صور لهاد الصنف بعد
              </Typography>
            </Box>
          )}

          {hasMultiple && (
            <>
              <IconButton
                onClick={goPrev}
                sx={{
                  position: "absolute",
                  top: "50%",
                  insetInlineStart: 8,
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(0,0,0,0.4)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
                }}
                size="small"
              >
                {/* RTL: "السابق" بصريًا هو السهم يلي عم يشاور عاليمين */}
                <ArrowForwardIosRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={goNext}
                sx={{
                  position: "absolute",
                  top: "50%",
                  insetInlineEnd: 8,
                  transform: "translateY(-50%)",
                  bgcolor: "rgba(0,0,0,0.4)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
                }}
                size="small"
              >
                <ArrowBackIosNewRoundedIcon fontSize="small" sx={{ ml: "3px" }} />
              </IconButton>

              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 0.75,
                }}
              >
                {images.map((_, i) => (
                  <Box
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIndex(i);
                    }}
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      cursor: "pointer",
                      bgcolor: i === index ? "#fff" : "rgba(255,255,255,0.5)",
                      transition: "background-color 0.2s ease",
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: 16, color: "text.primary" }}>
            {item.name}
          </Typography>
          {item.category && (
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
              {item.category}
            </Typography>
          )}
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: 16, color: "primary.main", mt: 1 }}>
            {item.price.toFixed(2)} ₪
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}