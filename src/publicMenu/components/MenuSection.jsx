import { Box, Grid, Typography, Card, CardContent, Chip, Stack } from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

function ProductCard({ name, price, isNew, image }) {
  return (
    <Card elevation={0} sx={{ bgcolor: "transparent" }}>
      <Box sx={{
        position: "relative", bgcolor: "primary.main", borderRadius: { xs: 2, sm: 3 },
        aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        transition: "transform .3s", "&:hover": { transform: "translateY(-4px)" },
      }}>
        {isNew && (
          <Chip
            label="جديد"
            size="small"
            sx={{
              position: "absolute",
              top: { xs: 6, sm: 12 },
              insetInlineStart: { xs: 6, sm: 12 },
              bgcolor: "secondary.main",
              color: "primary.main",
              fontWeight: 700,
              height: { xs: 18, sm: 24 },
              fontSize: { xs: 10, sm: 13 },
              "& .MuiChip-label": { px: { xs: 0.75, sm: 1 } },
            }}
          />
        )}
        {/* لما تنرفع صورة للصنف من لوحة التحكم، بتنعرض هون تلقائيًا؛ إذا
            ما في صورة بعد، بيضل شكل الأيقونة الرمادية الافتراضي. */}
        {image ? (
          <Box
            component="img"
            src={image}
            alt={name}
            loading="lazy"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <ImageOutlinedIcon sx={{ fontSize: { xs: 32, sm: 56, md: 80 }, color: "secondary.main", opacity: 0.6 }} />
        )}
      </Box>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "baseline" },
          gap: { xs: 0.5, sm: 0 },
          px: 0,
          py: { xs: 1, sm: 2 },
          "&:last-child": { pb: { xs: 1, sm: 2 } },
        }}
      >
        <Typography
          sx={{
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 700,
            color: "primary.main",
            fontSize: { xs: 12.5, sm: 15 },
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 700,
            color: "primary.main",
            fontSize: { xs: 12.5, sm: 15 },
            whiteSpace: "nowrap",
            opacity: 0.9,
          }}
        >
          {price.toFixed(2)} ₪
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function MenuSection({ id, title, items, count }) {
  return (
    <Box id={id} sx={{ mb: { xs: 5, md: 8 } }}>
      {/* عنوان القسم ثابت (sticky) طول ما إحنا عم نمرّر بين عناصر نفس القسم —
          بيضل ملزوق أعلى الشاشة (top: 0) طول ما جسم القسم (Box الحاوي)
          نفسه لسا ظاهر بمنطقة التمرير، وأول ما ننتقل لقسم تاني بيطلع من
          الشاشة وياخذ مكانه عنوان القسم الجديد تلقائيًا. خط رفيع تحته
          يساعد العين تفصل العنوان الثابت عن الكروت يلي عم تتحرك تحته. */}
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          bgcolor: "background.default",
          py: { xs: 1.1, sm: 1.5 },
          mb: { xs: 1.5, sm: 2 },
          borderBottom: "1px solid rgba(31,77,43,0.08)",
        }}
      >
        <Typography
          variant="h3"
          color="primary"
          sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: { xs: 20, sm: 28, md: 34 } }}
        >
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 11, sm: 14 } }}>
          {count} صنف
        </Typography>
      </Stack>
      <Grid container spacing={{ xs: 1.25, sm: 2, md: 3 }}>
        {items.map((it) => (
          <Grid item xs={4} sm={4} md={4} key={it.name}><ProductCard {...it} /></Grid>
        ))}
      </Grid>
    </Box>
  );
}