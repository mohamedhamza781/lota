import { Box, Grid, Typography, Stack, IconButton, Link } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import MusicVideoIcon from "@mui/icons-material/MusicVideo";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded"; // تم إضافة أيقونة الإيميل
import { scrollToSection } from "../scrollTo";
import MapCard from "./MapCard";

const SECTION_IDS = { المنيو: "menu", الفروع: "locations", "من نحن": "about" };

// links ممكن تكون مصفوفة نصوص عادية (زي "المنيو"، "الفروع" - بتتحل عن
// طريق SECTION_IDS الثابت فوق)، أو مصفوفة كائنات { id, label } (زي
// أقسام المنيو الفعلية - كل قسم إله id حقيقي جاي من الباك إند، فبنستخدمه
// هو مباشرة بدل ما نحاول نخمّنه من الاسم).
function FooterCol({ title, links }) {
  return (
    <>
      <Typography sx={{ opacity: 0.7, mb: 1 }}>{title}</Typography>
      <Stack spacing={0.5}>
        {links.map((l) => {
          const isObject = typeof l === "object" && l !== null;
          const label = isObject ? l.label : l;
          const sectionId = isObject ? l.id : SECTION_IDS[l];
          return (
            <Link
              key={isObject ? l.id : l}
              href={sectionId ? `#${sectionId}` : "#"}
              underline="hover"
              color="inherit"
              onClick={(e) => {
                if (!sectionId) return;
                e.preventDefault();
                scrollToSection(sectionId);
              }}
            >
              {label}
            </Link>
          );
        })}
      </Stack>
    </>
  );
}

function InfoRow({ icon: Icon, text }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Icon sx={{ fontSize: 18, opacity: 0.85 }} />
      <Typography variant="body2" sx={{ opacity: 0.85 }}>{text}</Typography>
    </Stack>
  );
}

export default function Footer({
  brandName = "المنشأة",
  categories = [
    { id: "menu", label: "قهوة" },
    { id: "menu", label: "مشروبات باردة" },
    { id: "menu", label: "مخبوزات" },
  ],
  city,
  address,
  hours,
  phone,
  email,
  socialLinks,
}) {
  const displayHours = hours || "يوميًا، من ٩:٠٠ صباحًا حتى ١١:٠٠ مساءً";
  const displayPhone = phone || "+970 59 000 0000";
  const displayEmail = email || `hello@${brandName.toLowerCase().replace(/\s+/g, "")}.com`;
  const social = socialLinks || {};
  const SOCIAL_ICONS = [
    { Icon: InstagramIcon, url: social.instagram },
    { Icon: FacebookIcon, url: social.facebook },
    { Icon: MusicVideoIcon, url: social.tiktok },
  ];

  return (
    <Box sx={{ bgcolor: "primary.main", color: "#fff", pt: 8, pb: 2 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 6 } }}>
        {/* قسم الموقع — مدموج هون بالفوتر بدل ما يكون قسم مستقل بالصفحة */}
        <Box id="locations" sx={{ mb: 7 }}>
          <Typography variant="h4" sx={{ fontFamily: '"IBM Plex Sans Arabic"', mb: 3 }}>
            وين تلاقي {brandName}
          </Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <MapCard />
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                <InfoRow icon={PlaceRoundedIcon} text={address || (city ? `الشارع الرئيسي، ${city}` : "الشارع الرئيسي")} />
                <InfoRow icon={AccessTimeRoundedIcon} text={displayHours} />
                <InfoRow icon={PhoneRoundedIcon} text={displayPhone} />
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={3}>
            <Typography variant="h5" sx={{ fontFamily: '"IBM Plex Sans Arabic"' }}>{brandName}</Typography>
            <Stack spacing={1} mt={2}>
              <InfoRow icon={PhoneRoundedIcon} text={displayPhone} />
              <InfoRow icon={EmailRoundedIcon} text={displayEmail} />
            </Stack>
          </Grid>
          <Grid item xs={6} md={3}><FooterCol title="الرئيسية" links={["المنيو", "الفروع"]} /></Grid>
          <Grid item xs={6} md={3}><FooterCol title="الأقسام" links={categories} /></Grid>
          <Grid item xs={12} md={3}>
            <Typography sx={{ opacity: 0.7, mb: 1 }}>تابعنا</Typography>
            <Stack direction="row" spacing={1}>
              {SOCIAL_ICONS.map(({ Icon, url }, i) => (
                <IconButton
                  key={i}
                  component={url ? "a" : "button"}
                  href={url || undefined}
                  target={url ? "_blank" : undefined}
                  rel={url ? "noopener noreferrer" : undefined}
                  disabled={!url}
                  sx={{
                    bgcolor: "#fff",
                    color: "#000",
                    "&:hover": { bgcolor: "#f0f0f0", color: "#000" },
                    "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.35)", color: "rgba(0,0,0,0.4)" },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Grid>
        </Grid>
        <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, textAlign: "center", fontSize: { xs: 60, md: 160 }, lineHeight: 1, mt: 6 }}>{brandName}</Typography>
        <Stack direction="row" justifyContent="space-between" mt={2} sx={{ opacity: 0.7, fontSize: 12 }}>
          <span>{brandName} © ٢٠٢٦</span>
          <Link
            href="#"
            underline="hover"
            color="inherit"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            sx={{ cursor: "pointer" }}
          >
            ↑ ارجع لفوق
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}