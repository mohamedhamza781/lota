import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { resolveImageUrl } from "../../api/uploads";

// كارد صنف بستايل "صورة مستطيلة عريضة فوق الكارد" - صورة تاخد كامل عرض
// الكارد بأعلاه (زوايا مدوّرة من فوق بس)، وتحتها اسم الصنف + التصنيف
// (category = اسم القسم يلي الصنف تابعله) + السعر بلون بارز. لون الكارد
// (السعر + التصنيف الفعّال) مبني على primary.main تبع الثيم الحالي، يلي
// أصلاً محسوب من menuPrimaryColor تبع كل منشأة (شوف buildPublicMenuTheme
// بـtheme.js) - فكل منشأة بتشوف كاردات بألوانها هي تلقائياً بدون أي كود
// إضافي هون.
export default function DishCard({ name, price, description, imageUrl, imageUrls, isNew, category, onOpenGallery }) {
  const resolvedImage = imageUrl ? resolveImageUrl(imageUrl) : null;
  // الديالوغ إله معنى بس لو في صورة وحدة عالأقل - لو الصنف بدون صور
  // خالص، الكارد بيضل قابل للعرض العادي بس مش قابل للضغط
  const hasImages = Boolean(imageUrls?.length);

  return (
    <Box
      onClick={hasImages ? () => onOpenGallery?.({ name, price, description, imageUrls, category }) : undefined}
      sx={{
        position: "relative",
        borderRadius: { xs: "16px", sm: "20px" },
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.1),
        boxShadow: "0 10px 24px -16px rgba(0,0,0,0.25)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: hasImages ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: { sm: "translateY(-3px)" },
          boxShadow: { sm: "0 14px 28px -16px rgba(0,0,0,0.3)" },
        },
      }}
    >
      {/* الصورة - عريضة كامل الكارد فوق، بنسبة عرض/ارتفاع ثابتة عشان
          الشبكة تضل متراصفة حتى لو الصور بأحجام مختلفة */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
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
          <RestaurantRoundedIcon sx={{ color: "primary.main", fontSize: { xs: 26, sm: 34 }, opacity: 0.5 }} />
        )}

        {isNew && (
          <Box
            sx={{
              position: "absolute",
              top: { xs: 8, sm: 10 },
              insetInlineEnd: { xs: 8, sm: 10 },
              bgcolor: "secondary.main",
              color: "primary.main",
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 700,
              fontSize: { xs: 9, sm: 10.5 },
              px: { xs: 0.8, sm: 1 },
              py: 0.25,
              borderRadius: "6px",
              lineHeight: 1.6,
            }}
          >
            جديد
          </Box>
        )}
      </Box>

      {/* محتوى الكارد النصي - كل عنصر إله ارتفاع ثابت (سواء موجود مضمونه
          أو لأ) عشان كل الكاردات تطلع بنفس الحجم بالضبط بغض النظر عن طول
          اسم الصنف أو وجود قسم/وصف من عدمه؛ أي نص أطول من المساحة المحجوزة
          بينقص (clamp) جوا حدود الكارد نفسه وما بيوسّعه */}
      <Box
        sx={{
          p: { xs: 1.25, sm: 1.75 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 0.25, sm: 0.4 },
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 700,
            color: "text.primary",
            fontSize: { xs: 12.5, sm: 15 },
            lineHeight: 1.35,
            height: { xs: 32, sm: 42 },
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {name}
        </Typography>

        {/* الشرح - مساحته محجوزة دايماً (سطرين) حتى لو الصنف بدون وصف،
            عشان الكارد يضل بنفس الحجم بالضبط مع باقي كاردات نفس الشبكة */}
        <Typography
          sx={{
            display: "-webkit-box",
            fontFamily: '"IBM Plex Sans Arabic"',
            color: "text.secondary",
            fontSize: { xs: 11, sm: 12.5 },
            lineHeight: 1.5,
            height: { xs: 33, sm: 37.5 },
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description || "\u00A0"}
        </Typography>

        <Typography
          sx={{
            mt: { xs: 0.5, sm: 0.75 },
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 800,
            color: "primary.main",
            fontSize: { xs: 13, sm: 17 },
          }}
        >
          {price.toFixed(2)} ₪
        </Typography>
      </Box>
    </Box>
  );
}