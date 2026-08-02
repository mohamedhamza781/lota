import { Box, Typography, Grid, Stack, Avatar } from "@mui/material";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";

export default function LocationsSection({ id, brandName = "us", city }) {
  return (
    <Box id={id} sx={{ bgcolor: "#efe5c4", py: 8 }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 6 } }}>
        <Stack spacing={1} alignItems="center" textAlign="center" mb={5}>
          <Typography variant="h3" color="primary">
            Find {brandName}
          </Typography>
          <Typography color="text.secondary">
            {city ? `Come visit us in ${city}.` : "Come visit us at our location."}
          </Typography>
        </Stack>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.5} alignItems="center" textAlign="center">
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <PlaceRoundedIcon sx={{ color: "secondary.main" }} />
              </Avatar>
              <Typography sx={{ fontFamily: "IBM Plex Sans Arabic", fontWeight: 700, color: "primary.main" }}>
                Address
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {city ? `Main Street, ${city}` : "Main Street"}
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.5} alignItems="center" textAlign="center">
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <AccessTimeRoundedIcon sx={{ color: "secondary.main" }} />
              </Avatar>
              <Typography sx={{ fontFamily: "IBM Plex Sans Arabic", fontWeight: 700, color: "primary.main" }}>
                Hours
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Daily, 9:00 AM – 11:00 PM
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.5} alignItems="center" textAlign="center">
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <PhoneRoundedIcon sx={{ color: "secondary.main" }} />
              </Avatar>
              <Typography sx={{ fontFamily: "IBM Plex Sans Arabic", fontWeight: 700, color: "primary.main" }}>
                Contact
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +1 (813) 555-0188
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}