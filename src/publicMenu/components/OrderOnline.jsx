import { Box, Typography, Stack, Button, Avatar } from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import DeliveryDiningIcon from "@mui/icons-material/DeliveryDining";
import { resolveImageUrl } from "../../api/uploads";
const btn = { bgcolor: "primary.main", color: "secondary.main", borderRadius: 999, px: 3, "&:hover": { bgcolor: "#163a20" } };
const btnIcon = { ...btn, minWidth: 48 };

function LogoPlaceholder() {
  return (
    <Avatar
      variant="rounded"
      sx={{ bgcolor: "primary.main", color: "secondary.main", mx: "auto", mb: 2, width: 56, height: 56, fontSize: 12, fontWeight: 700 }}
    >
      شعار
    </Avatar>
  );
}

export default function OrderOnline({ adBannerUrl }) {
  // لو صاحب المطعم رفع صورة إعلانية خاصة فيه، منعرضها هي بدل المحتوى
  // الافتراضي (اللوجو + النص + أزرار التوصيل) بالكامل
  if (adBannerUrl) {
    return (
      <Box sx={{ py: 8, bgcolor: "#efe5c4" }}>
        <Box
          component="img"
          src={resolveImageUrl(adBannerUrl)}
          alt="إعلان"
          sx={{
            display: "block",
            maxWidth: 900,
            width: "100%",
            mx: "auto",
            borderRadius: 3,
            px: { xs: 2, md: 0 },
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: "center", py: 8, bgcolor: "#efe5c4" }}>
      <LogoPlaceholder />
      <Typography variant="h3" color="primary">اطلب أونلاين</Typography>
      <Typography color="text.secondary" mt={1}>خليك مرتاح ووصلك طلبك المفضل بأسرع وقت.</Typography>
      <Stack direction="row" spacing={1.5} justifyContent="center" mt={3}>
        <Button variant="contained" sx={btn}>Uber Eats</Button>
        <Button variant="contained" sx={btnIcon}><ShoppingBagIcon /></Button>
        <Button variant="contained" sx={btnIcon}><DeliveryDiningIcon /></Button>
      </Stack>
    </Box>
  );
}