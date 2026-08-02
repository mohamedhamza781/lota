import { Box, Typography, Stack, Avatar, Card } from "@mui/material";
import Grid from "@mui/material/Grid2"; 
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

const POINTS = [
  { Icon: FavoriteRoundedIcon, title: "Made with care", text: "Every dish is prepared fresh, the same day it's served." },
  { Icon: EmojiEventsRoundedIcon, title: "Quality first", text: "We source local, seasonal ingredients whenever we can." },
  { Icon: GroupsRoundedIcon, title: "For everyone", text: "A welcoming table for families, friends, and first-timers." },
];

export default function AboutSection({ id, brandName = "us", city }) {
  return (
    <Box 
      id={id} 
      sx={{ 
        maxWidth: 1200, 
        mx: "auto", 
        px: { xs: 3, md: 8 }, 
        py: { xs: 8, md: 12 },
        position: "relative"
      }}
    >
      {/* لمسة خلفية ضبابية خفيفة جداً تعطي طابعاً عصرياً */}
      <Box 
        sx={{
          position: "absolute",
          top: "10%",
          left: "-5%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(239,229,196,0.4) 0%, rgba(255,255,255,0) 70%)",
          zIndex: -1,
          filter: "blur(40px)",
        }}
      />

      <Grid container spacing={{ xs: 6, md: 10 }} alignItems="center">
        {/* القسم الأيسر: العناوين */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* TODO: بمجرد ما يجهز شعار المطعم، استبدل هاد الـ Avatar بـ:
              <Avatar src={logoUrl} alt="Logo" sx={{ mb: 3, width: 64, height: 64 }} /> */}
          <Avatar 
            variant="rounded"
            sx={{ 
              bgcolor: "primary.main", 
              color: "secondary.main",
              mb: 3, 
              width: 64, 
              height: 64,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            }}
          >
            LOGO
          </Avatar>
          
          <Typography 
            variant="h2" 
            component="h2"
            sx={{ 
              fontFamily: "IBM Plex Sans Arabic", 
              fontWeight: 800, 
              color: "primary.main",
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              letterSpacing: "-0.02em",
              lineHeight: 1.1
            }}
          >
            About {brandName}
          </Typography>
          
          <Typography 
            color="text.secondary" 
            sx={{ 
              mt: 3, 
              fontSize: "1.1rem", 
              lineHeight: 1.7,
              fontWeight: 400,
              opacity: 0.85
            }}
          >
            {city
              ? `Proudly serving ${city} with a menu built around fresh ingredients, honest recipes, and a warm welcome for every guest.`
              : "A menu built around fresh ingredients, honest recipes, and a warm welcome for every guest."}
          </Typography>
        </Grid>
        
        {/* القسم الأيمن: المميزات بأسلوب الكروت الفخمة */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2.5}>
            {POINTS.map(({ Icon, title, text }) => (
              <Card
                key={title}
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(254, 254, 254, 0.6)",
                  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.05)",
                    border: "1px solid rgba(239, 229, 196, 0.5)",
                    "& .feature-avatar": {
                      bgcolor: "primary.main",
                      color: "#efe5c4",
                      transform: "scale(1.05) rotate(5deg)"
                    }
                  }
                }}
              >
                <Stack direction="row" spacing={3} alignItems="center">
                  <Avatar 
                    className="feature-avatar"
                    sx={{ 
                      bgcolor: "#efe5c4", 
                      color: "primary.main", 
                      width: 52, 
                      height: 52,
                      transition: "all 0.3s ease"
                    }}
                  >
                    <Icon fontSize="medium" />
                  </Avatar>
                  <Box>
                    <Typography 
                      sx={{ 
                        fontFamily: "IBM Plex Sans Arabic", 
                        fontWeight: 700, 
                        color: "primary.main",
                        fontSize: "1.2rem",
                        mb: 0.5
                      }}
                    >
                      {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, lineHeight: 1.5 }}>
                      {text}
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}