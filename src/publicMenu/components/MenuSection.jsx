import { Box, Typography, Stack } from "@mui/material";
import DishCard from "./DishCard";

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

      {/* شبكة كاردات الأصناف - ٣ أعمدة ثابتة على الموبايل (حسب الطلب، عشان
          تجربة التصفح تكون مضغوطة وسريعة)، وبتزيد تدريجيًا على الشاشات
          الأوسع. gap صغير على الموبايل عشان ٣ كاردات ترتاح بعرض الشاشة */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(3, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: { xs: 1, sm: 2.5 },
        }}
      >
        {items.map((it) => (
          <DishCard key={it.name} {...it} />
        ))}
      </Box>
    </Box>
  );
}