import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { uploadImage, resolveImageUrl } from "../api/uploads";
import { fetchWebChatQrCode } from "../api/webChat";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";

const EMPTY_ITEM_FORM = { name: "", price: "", isNew: false, categoryId: "", imageUrl: null };

export default function Menu() {
  const { establishmentId } = useParams();
  const {
    establishments,
    ensureEstablishmentDetail,
    addMenuCategory,
    deleteMenuCategory,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    updateEstablishment,
  } = useAuth();

  useEffect(() => {
    if (establishmentId) ensureEstablishmentDetail(establishmentId);
  }, [establishmentId, ensureEstablishmentDetail]);

  const establishment = establishments.find((e) => e.id === establishmentId);
  const categories = establishment?.menu?.categories ?? [];

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [formError, setFormError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);

  // لون المنيو العام (اللون الأساسي لصفحة المنيو الخاصة بهاي المنشأة) -
  // منخزنه محلياً وقت التعديل، ومنحفظه فعلياً (PATCH establishment) بس لما
  // يدوس "حفظ"، عشان ما نبعت طلب لكل نقرة على منتقي اللون
  const [colorDraft, setColorDraft] = useState(null);
  const [savingColor, setSavingColor] = useState(false);
  const currentColor = colorDraft ?? establishment?.menuPrimaryColor ?? "#1f4d2b";
  const colorChanged = colorDraft !== null && colorDraft !== (establishment?.menuPrimaryColor ?? "#1f4d2b");

  async function handleSaveColor() {
    if (!colorChanged) return;
    setSavingColor(true);
    try {
      await updateEstablishment(establishmentId, { menuPrimaryColor: colorDraft });
      setColorDraft(null);
    } finally {
      setSavingColor(false);
    }
  }

  // رمز QR الخاص بشات الويب (العميل بيمسحه بالمطعم عشان تُحسب زيارته -
  // شوف تعليق isValidQrVisit بـwhatsapp.service.js بالباك إند لتفاصيل ليش
  // هاد مهم) - منولّده كسول (بس أول ما صاحب المنشأة يفتح الديالوغ)، ومنكاشه
  // بالـstate عشان ما نطلبه من جديد كل مرة يفتح فيها
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrData, setQrData] = useState(null);

  function openQrDialog() {
    setQrDialogOpen(true);
    if (qrData || qrLoading) return;
    setQrLoading(true);
    setQrError("");
    fetchWebChatQrCode(establishment.slug)
      .then((data) => setQrData(data))
      .catch((err) => setQrError(err.message || "تعذّر توليد رمز QR"))
      .finally(() => setQrLoading(false));
  }

  function openAddItem(categoryId) {
    setEditingItem(null);
    setItemForm({ ...EMPTY_ITEM_FORM, categoryId });
    setFormError("");
    setItemDialogOpen(true);
  }

  function openEditItem(categoryId, item) {
    setEditingItem({ categoryId, itemId: item.id });
    setItemForm({
      name: item.name,
      price: String(item.price),
      isNew: Boolean(item.isNew),
      categoryId,
      imageUrl: item.imageUrl ?? null,
    });
    setFormError("");
    setItemDialogOpen(true);
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFormError("");
    setUploadingImage(true);
    try {
      const { url } = await uploadImage(file);
      setItemForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setFormError(err.message || "تعذّر رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleSaveItem() {
    const price = Number(itemForm.price);
    if (!itemForm.name.trim()) {
      setFormError("اسم الصنف إلزامي");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError("السعر لازم يكون رقم صحيح");
      return;
    }
    const payload = { name: itemForm.name.trim(), price, isNew: itemForm.isNew, imageUrl: itemForm.imageUrl };
    if (editingItem) {
      updateMenuItem(establishmentId, editingItem.categoryId, editingItem.itemId, payload);
    } else {
      addMenuItem(establishmentId, itemForm.categoryId, payload);
    }
    setItemDialogOpen(false);
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    addMenuCategory(establishmentId, newCategoryName.trim());
    setNewCategoryName("");
    setCategoryDialogOpen(false);
  }

  if (!establishment) return null;

  return (
    <Stack spacing={3.5}>
      {/* الهيدر العلوي */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>
            المنيو
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            هاد المنيو مستقل عن باقي المنشآت — أي تعديل هون بينعكس فورًا على صفحة <strong>{establishment.name}</strong> العامة
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            component="a"
            href={`/m/${establishment.slug}`}
            target="_blank"
            rel="noopener"
            variant="outlined"
            startIcon={<OpenInNewRoundedIcon fontSize="small" />}
            sx={{
              borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
              color: tokens.ink,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "12px",
              px: 2,
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.03)",
                borderColor: tokens.ink,
              },
            }}
          >
            معاينة المنيو
          </Button>
          <Button
            onClick={() => setCategoryDialogOpen(true)}
            variant="contained"
            startIcon={<AddRoundedIcon />}
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "12px",
              px: 2.5,
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              transition: "all 0.2s ease",
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" },
            }}
          >
            قسم جديد
          </Button>
        </Stack>
      </Stack>

      {/* تحكم بلون المنيو العام - كل منشأة بلونها الخاص بدل اللون الأخضر
          الثابت يلي كان مشترك لكل المنشآت */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
              لون المنيو العام
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              اللون الأساسي يلي بيظهر بصفحة المنيو العامة (العناوين، الأزرار...) الخاصة بـ {establishment.name}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              component="input"
              type="color"
              value={currentColor}
              onChange={(e) => setColorDraft(e.target.value)}
              sx={{
                width: 44,
                height: 44,
                p: 0,
                border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.15)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                background: "none",
              }}
            />
            <TextField
              size="small"
              value={currentColor}
              onChange={(e) => setColorDraft(e.target.value)}
              sx={{ width: 120 }}
              inputProps={{ style: { fontFamily: "monospace", direction: "ltr" } }}
            />
            <Button
              variant="contained"
              disabled={!colorChanged || savingColor}
              onClick={handleSaveColor}
              sx={{
                backgroundColor: tokens.ink,
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                borderRadius: "10px",
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              {savingColor ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* رمز QR الخاص بشات الويب - العميل لازم يمسحه فعلياً بالمطعم عشان
          الزيارة (الأولى أو المتكررة) تنحسب صح بالنظام؛ فتح شات الويب من
          غيره (تطبيق مثبّت، رابط قديم...) ما بيسجّل زيارة جديدة */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5}>
            <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.95rem" }}>
              رمز QR شات الويب
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              اطبع هاد الرمز وحطّه بالمطعم — الزبون لازم يمسحه عشان تُحسب زيارته وتُضاف نقاطها؛ فتح شات الويب من رابط محفوظ أو تطبيق مثبّت من غيره ما بيسجّل زيارة جديدة
            </Typography>
          </Stack>
          <Button
            onClick={openQrDialog}
            variant="outlined"
            startIcon={<QrCode2RoundedIcon fontSize="small" />}
            sx={{
              borderColor: tokens.hairline || "rgba(0,0,0,0.12)",
              color: tokens.ink,
              fontFamily: '"IBM Plex Sans Arabic"',
              fontWeight: 600,
              borderRadius: "12px",
              px: 2,
              whiteSpace: "nowrap",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.03)",
                borderColor: tokens.ink,
              },
            }}
          >
            عرض رمز QR
          </Button>
        </Stack>
      </Paper>

      {/* ديالوغ عرض/تحميل رمز QR */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 800 }}>
          رمز QR شات الويب — {establishment.name}
        </DialogTitle>
        <DialogContent>
          <Stack alignItems="center" spacing={2} sx={{ py: 1 }}>
            {qrLoading && (
              <Typography variant="body2" sx={{ color: "text.secondary", py: 6 }}>
                جاري توليد الرمز...
              </Typography>
            )}
            {qrError && (
              <Typography variant="body2" sx={{ color: "error.main", py: 3, textAlign: "center" }}>
                {qrError}
              </Typography>
            )}
            {qrData && !qrLoading && (
              <>
                <Box
                  component="img"
                  src={qrData.qrDataUrl}
                  alt="QR Code"
                  sx={{
                    width: 260,
                    height: 260,
                    borderRadius: 3,
                    border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.1)"}`,
                    p: 1.5,
                    backgroundColor: "#fff",
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary", direction: "ltr", wordBreak: "break-all", textAlign: "center" }}>
                  {qrData.checkinUrl}
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setQrDialogOpen(false)} sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
            إغلاق
          </Button>
          {qrData && (
            <Button
              component="a"
              href={qrData.qrDataUrl}
              download={`qr-${establishment.slug}.png`}
              variant="contained"
              startIcon={<DownloadRoundedIcon fontSize="small" />}
              sx={{
                backgroundColor: tokens.ink,
                fontFamily: '"IBM Plex Sans Arabic"',
                fontWeight: 600,
                borderRadius: "10px",
                "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
              }}
            >
              تحميل الصورة
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* قائمة الأقسام بتصميم Glassmorphism */}
      <Stack spacing={2.5}>
        {categories.map((cat) => (
          <Accordion
            key={cat.id}
            defaultExpanded
            elevation={0}
            sx={{
              borderRadius: "20px !important",
              border: "1px solid",
              borderColor: tokens.hairline || "rgba(0, 0, 0, 0.06)",
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #fdfdfd 100%)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)",
              transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              overflow: "hidden",
              "&:hover": {
                boxShadow: "0 14px 40px -12px rgba(0,0,0,0.08)",
              },
              "&:before": { display: "none" },
            }}
          >
            <Box sx={{ position: "relative" }}>
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon sx={{ color: tokens.muted }} />}
                sx={{
                  px: 3,
                  py: 1,
                  pl: 6,
                  "&:hover": { backgroundColor: "rgba(0,0,0,0.01)" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", pr: 1 }}>
                  <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "1.05rem" }}>
                    {cat.name}
                    <Typography component="span" variant="caption" sx={{ color: "text.secondary", ml: 1.5, fontWeight: 500 }}>
                      ({cat.items.length} صنف)
                    </Typography>
                  </Typography>
                </Stack>
              </AccordionSummary>
              {/* زر الحذف لازم يكون برّا AccordionSummary (مش جواها) - لأنها
                  أصلاً بترندر كعنصر <button> بنفسها، وحط <IconButton> (زر
                  كمان) جواها بيعمل "button جوا button" (HTML غير صالح +
                  تحذير React + سلوك ضغط غير متوقع بالمتصفح) */}
              <Tooltip title="حذف القسم">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteCategory(cat.id);
                  }}
                  sx={{
                    position: "absolute",
                    insetInlineEnd: 44,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: tokens.muted,
                    transition: "all 0.2s ease",
                    "&:hover": { color: "error.main", backgroundColor: "rgba(211, 47, 47, 0.08)" },
                  }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { borderBottom: `1px solid ${tokens.hairline || "rgba(0,0,0,0.08)"}`, color: tokens.muted, fontWeight: 600, fontSize: "0.8rem" } }}>
                    <TableCell sx={{ width: 60 }}></TableCell>
                    <TableCell>الصنف</TableCell>
                    <TableCell>السعر</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="left">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cat.items.map((it) => (
                    <TableRow
                      key={it.id}
                      sx={{
                        transition: "background-color 0.15s ease",
                        "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                        "&:last-child td": { borderBottom: "none" },
                      }}
                    >
                      <TableCell sx={{ width: 60, py: 1.5 }}>
                        {it.imageUrl ? (
                          <Box
                            component="img"
                            src={resolveImageUrl(it.imageUrl)}
                            alt={it.name}
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: "12px",
                              objectFit: "cover",
                              display: "block",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                              border: "1px solid rgba(0,0,0,0.05)",
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: "12px",
                              bgcolor: "rgba(0,0,0,0.02)",
                              border: "1px dashed",
                              borderColor: tokens.hairline || "rgba(0,0,0,0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ImageOutlinedIcon fontSize="small" sx={{ color: tokens.muted, opacity: 0.6 }} />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600, fontSize: "0.92rem" }}>
                        {it.name}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "0.92rem" }}>
                        {Number(it.price).toFixed(2)} ₪
                      </TableCell>
                      <TableCell>
                        {it.isNew && (
                          <Chip
                            size="small"
                            label="جديد"
                            sx={{
                              borderRadius: "8px",
                              backgroundColor: tokens.ink,
                              color: tokens.paper,
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              height: 24,
                              px: 0.5,
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="left">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            onClick={() => openEditItem(cat.id, it)}
                            sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: tokens.ink, backgroundColor: "rgba(0,0,0,0.04)" } }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setConfirmDeleteItem({ categoryId: cat.id, itemId: it.id, name: it.name })}
                            sx={{ color: tokens.muted, transition: "all 0.2s ease", "&:hover": { color: "error.main", backgroundColor: "rgba(211,47,47,0.08)" } }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cat.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary", fontSize: "0.88rem" }}>
                        ما في أصناف بهاد القسم بعد
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Button
                onClick={() => openAddItem(cat.id)}
                size="small"
                startIcon={<AddRoundedIcon fontSize="small" />}
                sx={{
                  mt: 2.5,
                  color: tokens.ink,
                  fontFamily: '"IBM Plex Sans Arabic"',
                  fontWeight: 600,
                  borderRadius: "10px",
                  px: 2,
                  py: 0.8,
                  backgroundColor: "rgba(0,0,0,0.03)",
                  transition: "all 0.2s ease",
                  "&:hover": { backgroundColor: "rgba(0,0,0,0.07)" },
                }}
              >
                إضافة صنف
              </Button>
            </AccordionDetails>
          </Accordion>
        ))}

        {categories.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: "20px",
              border: `2px dashed ${tokens.hairline || "rgba(0,0,0,0.1)"}`,
              backgroundColor: "transparent",
            }}
          >
            <Typography sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 500 }}>
              ما في أقسام بالمنيو بعد — ابدأ بإضافة قسم
            </Typography>
          </Paper>
        )}
      </Stack>

      {/* حوار إضافة قسم */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, pb: 1 }}>قسم جديد</DialogTitle>
        <DialogContent>
          <TextField
            label="اسم القسم"
            size="small"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ mt: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            placeholder="مثال: مشروبات ساخنة"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCategoryDialogOpen(false)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={handleAddCategory}
            variant="contained"
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              borderRadius: "10px",
              px: 2.5,
              fontWeight: 600,
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* حوار إضافة/تعديل صنف */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, pb: 1 }}>
          {editingItem ? "تعديل صنف" : "صنف جديد"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                {formError}
              </Typography>
            )}
            <TextField
              label="اسم الصنف"
              size="small"
              fullWidth
              value={itemForm.name}
              onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <TextField
              label="السعر (₪)"
              size="small"
              type="number"
              fullWidth
              value={itemForm.price}
              onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
              inputProps={{ step: "0.01", min: 0 }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
            <Stack spacing={1}>
              <Typography variant="caption" sx={{ color: tokens.muted, fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
                صورة الصنف
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: "14px",
                    overflow: "hidden",
                    flexShrink: 0,
                    bgcolor: "rgba(0,0,0,0.03)",
                    border: `1px solid ${tokens.hairline || "rgba(0,0,0,0.1)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {itemForm.imageUrl ? (
                    <Box
                      component="img"
                      src={resolveImageUrl(itemForm.imageUrl)}
                      alt="معاينة"
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ImageOutlinedIcon sx={{ color: tokens.muted, opacity: 0.5 }} />
                  )}
                </Box>
                <Stack spacing={1} direction="row" alignItems="center">
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    disabled={uploadingImage}
                    startIcon={<CloudUploadRoundedIcon fontSize="small" />}
                    sx={{
                      borderColor: tokens.hairline || "rgba(0,0,0,0.15)",
                      color: tokens.ink,
                      borderRadius: "10px",
                      fontFamily: '"IBM Plex Sans Arabic"',
                      fontWeight: 600,
                    }}
                  >
                    {uploadingImage ? "جاري الرفع..." : itemForm.imageUrl ? "تغيير الصورة" : "رفع صورة"}
                    <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                  </Button>
                  {itemForm.imageUrl && !uploadingImage && (
                    <Button
                      size="small"
                      onClick={() => setItemForm((f) => ({ ...f, imageUrl: null }))}
                      sx={{ color: "error.main", borderRadius: "10px", fontWeight: 600 }}
                    >
                      إزالة
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
            {!editingItem && (
              <TextField
                select
                label="القسم"
                size="small"
                fullWidth
                value={itemForm.categoryId}
                onChange={(e) => setItemForm((f) => ({ ...f, categoryId: e.target.value }))}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={itemForm.isNew}
                  onChange={(e) => setItemForm((f) => ({ ...f, isNew: e.target.checked }))}
                  sx={{ color: tokens.ink, "&.Mui-checked": { color: tokens.ink } }}
                />
              }
              label={
                <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.85rem", fontWeight: 500 }}>
                  عرضه كصنف جديد (New)
                </Typography>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setItemDialogOpen(false)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveItem}
            variant="contained"
            disabled={uploadingImage}
            sx={{
              backgroundColor: tokens.ink,
              color: tokens.paper,
              borderRadius: "10px",
              px: 2.5,
              fontWeight: 600,
              "&:hover": { backgroundColor: tokens.inkSoft || tokens.ink },
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد حذف قسم */}
      <Dialog
        open={Boolean(confirmDeleteCategory)}
        onClose={() => setConfirmDeleteCategory(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف القسم؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"' }}>
            رح ينحذف معه كل الأصناف يلي جواه. هذا الإجراء نهائي.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteCategory(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              deleteMenuCategory(establishmentId, confirmDeleteCategory);
              setConfirmDeleteCategory(null);
            }}
            variant="contained"
            color="error"
            sx={{ borderRadius: "10px", px: 2.5, fontWeight: 600 }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد حذف صنف */}
      <Dialog
        open={Boolean(confirmDeleteItem)}
        onClose={() => setConfirmDeleteItem(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            p: 1,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              theme.palette.mode === "dark" ? "rgba(30,30,30,0.9)" : "rgba(255,255,255,0.95)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
          حذف "{confirmDeleteItem?.name}"؟
        </DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteItem(null)} sx={{ color: tokens.muted, borderRadius: "10px" }}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              deleteMenuItem(establishmentId, confirmDeleteItem.categoryId, confirmDeleteItem.itemId);
              setConfirmDeleteItem(null);
            }}
            variant="contained"
            color="error"
            sx={{ borderRadius: "10px", px: 2.5, fontWeight: 600 }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}