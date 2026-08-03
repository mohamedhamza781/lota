import { Box, Typography, Chip, Stack } from "@mui/material";

// صف صنف واحد بقائمة نصية أنيقة - الاسم يمين، خط منقّط (leader) بيوصل
// لحد السعر يسار، بستايل قوائم المطاعم الكلاسيكي. ما في صور أصناف
// إطلاقاً (اتشالت بناءً على طلب صريح) - النص والسعر بس، مرتب ونظيف.
function MenuItemRow({ name, price, isNew }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-end"
      spacing={{ xs: 1, sm: 1.5 }}
      sx={{
        py: { xs: 1.1, sm: 1.5 },
        borderBottom: "1px solid rgba(31,77,43,0.08)",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0, maxWidth: "70%" }}>
        <Typography
          sx={{
            fontFamily: '"IBM Plex Sans Arabic"',
            fontWeight: 700,
            color: "primary.main",
            fontSize: { xs: 13.5, sm: 16 },
            lineHeight: 1.4,
          }}
        >
          {name}
        </Typography>
        {isNew && (
          <Chip
            label="جديد"
            size="small"
            sx={{
              bgcolor: "secondary.main",
              color: "primary.main",
              fontWeight: 700,
              height: { xs: 17, sm: 20 },
              fontSize: { xs: 9, sm: 10.5 },
              flexShrink: 0,
              "& .MuiChip-label": { px: 0.9 },
            }}
          />
        )}
      </Stack>

      {/* الخط المنقط الفاصل بين الاسم والسعر - عنصر بصري بس، ما إله أي
          معنى دلالي، فمخفي عن قارئ الشاشة */}
      <Box
        aria-hidden="true"
        sx={{
          flex: 1,
          minWidth: 16,
          borderBottom: "2px dotted",
          borderColor: "rgba(31,77,43,0.25)",
          mb: "5px",
        }}
      />

      <Typography
        sx={{
          fontFamily: '"IBM Plex Sans Arabic"',
          fontWeight: 700,
          color: "primary.main",
          fontSize: { xs: 13.5, sm: 16 },
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {price.toFixed(2)} ₪
      </Typography>
    </Stack>
  );
}

export default function MenuSection({ id, title, items, count }) {
  return (
    <Box id={id} sx={{ mb: { xs: 5, md: 8 } }}>
      {/* عنوان القسم ثابت (sticky) طول ما إحنا عم نمرّر بين عناصر نفس القسم —
          بيضل ملزوق أعلى الشاشة (top: 0) طول ما جسم القسم (Box الحاوي)
          نفسه لسا ظاهر بمنطقة التمرير، وأول ما ننتقل لقسم تاني بيطلع من
          الشاشة وياخذ مكانه عنوان القسم الجديد تلقائيًا. خط رفيع تحته
          يساعد العين تفصل العنوان الثابت عن الأصناف يلي عم تتحرك تحته. */}
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
          mb: { xs: 0.5, sm: 1 },
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
      <Stack>
        {items.map((it) => (
          <MenuItemRow key={it.name} {...it} />
        ))}
      </Stack>
    </Box>
  );
}