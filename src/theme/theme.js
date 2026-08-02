import { createTheme } from "@mui/material/styles";
import { arSA } from "@mui/material/locale";

/**
 * Design tokens — "الختم المطبوع" (Letterpress Stamp) direction.
 *
 * Concept: no color at all — every signal (tier, status, urgency) has to be
 * carried by weight, fill, and form instead of hue, the way a real rubber
 * stamp or an embossed seal only ever has "ink or no ink." The canvas reads
 * like heavy card stock (warm off-white, never clinical #FFFFFF), the nav
 * rail is solid ink black for contrast, and tier/segment states are told
 * apart by fill density (hollow → dashed → solid → double ring) rather
 * than color coding — which also happens to make the UI colorblind-proof
 * by construction.
 *
 * Palette (grayscale only, warm-neutral undertone)
 *  paper       #FAFAF7  — app background, "card stock"
 *  surface     #FFFFFF  — cards / paper elements
 *  surfaceAlt  #F0EFEB  — raised surfaces, table headers
 *  hairline    #E2E0DA  — quiet dividers
 *  ink         #0A0A09  — primary text, nav rail, filled stamps
 *  inkSoft     #2B2A27  — secondary ink (hover states)
 *  muted       #79766E  — secondary text
 *  mutedLight  #A6A399  — tertiary text, placeholders
 */
export const tokens = {
  paper: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceAlt: "#F0EFEB",
  hairline: "#E2E0DA",
  ink: "#0A0A09",
  inkSoft: "#2B2A27",
  muted: "#79766E",
  mutedLight: "#A6A399",
  // legacy aliases kept so components can still reference semantic names
  brass: "#0A0A09",
  brassLight: "#2B2A27",
  sage: "#0A0A09",
  coral: "#0A0A09",
  cream: "#0A0A09",
};

const theme = createTheme(
  {
    direction: "rtl",
    palette: {
      mode: "light",
      background: {
        default: tokens.paper,
        paper: tokens.surface,
      },
      primary: {
        main: tokens.ink,
        light: tokens.inkSoft,
        contrastText: tokens.paper,
      },
      secondary: {
        main: tokens.inkSoft,
        contrastText: tokens.paper,
      },
      error: {
        main: tokens.ink,
      },
      success: {
        main: tokens.ink,
      },
      text: {
        primary: tokens.ink,
        secondary: tokens.muted,
      },
      divider: tokens.hairline,
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", sans-serif',
      h1: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600 },
      h4: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "@keyframes fadeIn": {
            from: { opacity: 0, transform: "translateY(4px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "@keyframes fadeInUp": {
            from: { opacity: 0, transform: "translateY(10px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "@keyframes scaleIn": {
            from: { opacity: 0, transform: "scale(0.96)" },
            to: { opacity: 1, transform: "scale(1)" },
          },
          "@keyframes floatSlow": {
            "0%, 100%": { transform: "translate(0, 0)" },
            "50%": { transform: "translate(-14px, 14px)" },
          },
          body: {
            backgroundColor: tokens.paper,
            backgroundImage: `
              radial-gradient(circle at 100% 0%, rgba(10,10,9,0.03), transparent 45%),
              url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")
            `,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${tokens.hairline}`,
            borderRadius: 16,
            boxShadow: "none",
            transition: "box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: "all 0.22s cubic-bezier(0.25, 0.8, 0.25, 1)",
          },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 8px 20px rgba(10,10,9,0.16)",
              backgroundColor: tokens.inkSoft,
              transform: "translateY(-1px)",
            },
            "&:active": { transform: "translateY(0)" },
          },
          outlined: {
            borderColor: tokens.hairline,
            "&:hover": {
              borderColor: tokens.ink,
              backgroundColor: tokens.surfaceAlt,
              transform: "translateY(-1px)",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontFamily: '"IBM Plex Sans Arabic"',
            fontSize: "0.72rem",
            letterSpacing: "0.06em",
            color: tokens.muted,
            backgroundColor: tokens.surfaceAlt,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: "box-shadow 0.2s ease, border-color 0.2s ease",
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 1.5,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
    },
  },
  arSA
);

export default theme;