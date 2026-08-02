import { Box, Typography, Stack, Chip } from "@mui/material";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import { resolveImageUrl } from "../../api/uploads";

// قسم "الإعلانات والعروض" بالصفحة الرئيسية لمنيو المنشأة العام - بطاقات
// أفقية قابلة للتمرير، كل بطاقة إعلان بيحدده صاحب المنشأة من داشبورده
// (صفحة "الإعلانات والعروض"). القسم كله ما بيظهر خالص لو ما في إعلانات
// فعّالة هلق (شوف فلترة isActive + مدة السريان بـ publicMenu.controller.js).
export default function PromotionsSection({ promotions = [] }) {
  if (!promotions.length) return null;

  return (
    <Box sx={{ bgcolor: "background.default", py: { xs: 4, md: 6 } }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 6 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <LocalOfferRoundedIcon sx={{ color: "primary.main" }} />
          <Typography variant="h4" sx={{ fontFamily: '"IBM Plex Sans Arabic"', color: "primary.main" }}>
            عروضنا وخصوماتنا
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            pb: 1,
            scrollSnapType: "x mandatory",
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 999 },
          }}
        >
          {promotions.map((promo) => (
            <PromotionCard key={promo.id} promo={promo} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function PromotionCard({ promo }) {
  const image = resolveImageUrl(promo.imageUrl);
  const CardWrapper = promo.linkUrl ? "a" : "div";
  const linkProps = promo.linkUrl ? { href: promo.linkUrl, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Box
      component={CardWrapper}
      {...linkProps}
      sx={{
        flex: "0 0 auto",
        width: { xs: 260, sm: 300 },
        scrollSnapAlign: "start",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#efe5c4",
        textDecoration: "none",
        color: "inherit",
        display: "block",
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease",
        "&:hover": promo.linkUrl ? { transform: "translateY(-3px)" } : undefined,
      }}
    >
      <Box sx={{ position: "relative", height: 150, bgcolor: "rgba(0,0,0,0.06)" }}>
        {image ? (
          <Box component="img" src={image} alt={promo.title} sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LocalOfferRoundedIcon sx={{ fontSize: 34, color: "primary.main", opacity: 0.4 }} />
          </Box>
        )}
        {promo.badgeText && (
          <Chip
            label={promo.badgeText}
            size="small"
            sx={{
              position: "absolute",
              top: 10,
              insetInlineStart: 10,
              bgcolor: "primary.main",
              color: "secondary.main",
              fontWeight: 700,
            }}
          />
        )}
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: "primary.main" }}>
          {promo.title}
        </Typography>
        {promo.description && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, fontFamily: "IBM Plex Sans Arabic" }}>
            {promo.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}