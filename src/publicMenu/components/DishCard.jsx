import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { resolveImageUrl } from "../../api/uploads";

// كارد صنف بستايل "الصورة الدائرية البارزة فوق الكارد" - بديل عن صف
// القائمة النصية القديم (MenuItemRow). لون الكارد (خلفية + حلقة الصورة +
// السعر) مبني على primary.main تبع الثيم الحالي، يلي أصلاً محسوب من
// menuPrimaryColor تبع كل منشأة (شوف buildPublicMenuTheme بـtheme.js) -
// فكل منشأة بتشوف كاردات بألوانها هي تلقائياً بدون أي كود إضافي هون.
export default function DishCard({ name, price, description, imageUrl, isNew }) {
  const resolvedImage = imageUrl ? resolveImageUrl(imageUrl) : null;

  return (
    <Box
      sx={{
        position: "relative",
        mt: { xs: 3.75, sm: 5.5 },
        borderRadius: { xs: "14px", sm: "18px" },
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.14),
        boxShadow: "0 10px 24px -16px rgba(0,0,0,0.25)",
        p: { xs: 1, sm: 2 },
        pt: { xs: 4.25, sm: 6 },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: { sm: "translateY(-3px)" },
          boxShadow: { sm: "0 14px 28px -16px rgba(0,0,0,0.3)" },
        },
      }}
    >
      {/* الصورة الدائرية بارزة فوق حافة الكارد - نفس فكرة الكارد المرجعي.
          لو الصنف ما إله صورة، منعرض دائرة بلون المنشأة مع أيقونة عامة
          بدل ما نسيب فراغ غريب أو نكسر محاذاة الشبكة */}
      <Box
        sx={{
          position: "absolute",
          top: { xs: -20, sm: -28 },
          insetInlineStart: { xs: 8, sm: 16 },
          width: { xs: 40, sm: 68 },
          height: { xs: 40, sm: 68 },
          borderRadius: "50%",
          border: "3px solid",
          borderColor: "background.paper",
          boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
          overflow: "hidden",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {resolvedImage ? (
          <Box
            component="img"
            src={resolvedImage}
            alt={name}
            loading="lazy"
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <RestaurantRoundedIcon sx={{ color: "primary.main", fontSize: { xs: 16, sm: 26 }, opacity: 0.6 }} />
        )}
      </Box>

      {isNew && (
        <Box
          sx={{
            position: "absolute",
            top: { xs: 6, sm: 10 },
            insetInlineEnd: { xs: 6, sm: 10 },
            bgcolor: "secondary.main",
            color: "primary.main",
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 700,
            fontSize: { xs: 8, sm: 10.5 },
            px: { xs: 0.7, sm: 1 },
            py: 0.2,
            borderRadius: "6px",
            lineHeight: 1.6,
          }}
        >
          جديد
        </Box>
      )}

      <Typography
        sx={{
          fontFamily: '"IBM Plex Sans Arabic"',
          fontWeight: 700,
          color: "primary.main",
          fontSize: { xs: 11, sm: 15 },
          lineHeight: 1.35,
          minHeight: { xs: 28, sm: 40 },
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {name}
      </Typography>

      {/* الشرح - مخفي بشاشات الموبايل الصغيرة عشان الكارد يضل مضغوط وقادر
          ياخد مكانه بشبكة ٣ أعمدة بدون ما ينكسر التصميم؛ بيظهر من sm فما فوق */}
      {description && (
        <Typography
          sx={{
            display: { xs: "none", sm: "-webkit-box" },
            fontFamily: '"IBM Plex Sans Arabic"',
            color: "text.secondary",
            fontSize: 12.5,
            lineHeight: 1.5,
            mt: 0.5,
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </Typography>
      )}

      <Typography
        sx={{
          mt: "auto",
          pt: { xs: 0.75, sm: 1.25 },
          fontFamily: '"IBM Plex Sans Arabic"',
          fontWeight: 800,
          color: "primary.main",
          fontSize: { xs: 11.5, sm: 16 },
        }}
      >
        {price.toFixed(2)} ₪
      </Typography>
    </Box>
  );
}