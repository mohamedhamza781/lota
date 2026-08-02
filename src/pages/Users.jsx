import { useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Tooltip,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import { SuperAdminHeader } from "../components/SuperAdminHeader";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../mock/users";

const EMPTY_FORM = { name: "", email: "", password: "", role: "establishment_admin", establishmentId: "" };

export default function Users() {
  const { users, establishments, currentUser, addUser, updateUser, deleteUser, toggleUserStatus } = useAuth();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const establishmentName = (id) => establishments.find((e) => e.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim();
    return users.filter((u) => u.name.includes(q) || u.email.includes(q));
  }, [users, query]);

  function openAddDialog() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(user) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      establishmentId: user.establishmentId ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("الاسم والإيميل إلزاميون");
      return;
    }
    if (form.role === "establishment_admin" && !form.establishmentId) {
      setFormError("لازم تختار منشأة لأدمن المنشأة");
      return;
    }
    const emailTaken = users.some(
      (u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== editingId
    );
    if (emailTaken) {
      setFormError("هذا الإيميل مستخدم من حساب آخر");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      establishmentId: form.role === "super_admin" ? null : form.establishmentId,
    };

    if (editingId) {
      if (form.password) payload.password = form.password;
      updateUser(editingId, payload);
    } else {
      addUser({ ...payload, password: form.password || "changeme123" });
    }
    setDialogOpen(false);
  }

  return (
    <Box sx={{ backgroundColor: tokens.paper, minHeight: "100vh" }}>
      <SuperAdminHeader />

      <Box sx={{ px: { xs: 3, md: 6 }, py: 4 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Stack>
              <Typography sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, fontSize: "1.1rem" }}>
                المستخدمون
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                إدارة حسابات لوحة التحكم — سوبر أدمن وأدمن كل منشأة
              </Typography>
            </Stack>
            <Button
              onClick={openAddDialog}
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ backgroundColor: tokens.ink, fontFamily: '"IBM Plex Sans Arabic"', "&:hover": { backgroundColor: tokens.inkSoft } }}
            >
              مستخدم جديد
            </Button>
          </Stack>

          <TextField
            size="small"
            placeholder="بحث بالاسم أو الإيميل"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ maxWidth: 380 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Paper elevation={0} sx={{ overflow: "hidden" }}>
            <Box sx={{ overflowX: "auto" }}>
<Table>
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الإيميل</TableCell>
                  <TableCell>الدور</TableCell>
                  <TableCell>المنشأة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="left">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 600 }}>
                      {u.name}
                      {u.id === currentUser.id && (
                        <Chip label="أنت" size="small" sx={{ ml: 1, height: 18, fontSize: "0.65rem" }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.8rem" }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ROLE_LABELS[u.role]}
                        variant="outlined"
                        sx={{ borderColor: tokens.hairline, borderRadius: 1.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                      {u.role === "super_admin" ? "كل المنشآت" : establishmentName(u.establishmentId)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={u.status === "active" ? "فعّال" : "موقوف"}
                        sx={{
                          borderRadius: 1.5,
                          backgroundColor: u.status === "active" ? tokens.ink : "transparent",
                          color: u.status === "active" ? tokens.paper : tokens.muted,
                          border: `1px solid ${u.status === "active" ? tokens.ink : tokens.hairline}`,
                        }}
                      />
                    </TableCell>
                    <TableCell align="left">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title={u.status === "active" ? "إيقاف الحساب" : "تفعيل الحساب"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => toggleUserStatus(u.id)}
                              disabled={u.id === currentUser.id}
                            >
                              {u.status === "active" ? (
                                <BlockRoundedIcon fontSize="small" />
                              ) : (
                                <CheckCircleOutlineRoundedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEditDialog(u)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setConfirmDeleteId(u.id)}
                              disabled={u.id === currentUser.id}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      ما في نتائج مطابقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
</Box>
          </Paper>
        </Stack>
      </Box>

      {/* حوار إضافة/تعديل مستخدم */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
          {editingId ? "تعديل مستخدم" : "مستخدم جديد"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Typography variant="caption" sx={{ color: "error.main" }}>
                {formError}
              </Typography>
            )}
            <TextField
              label="الاسم الكامل"
              size="small"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="الإيميل"
              size="small"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label={editingId ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
              size="small"
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              fullWidth
              placeholder={editingId ? "اتركها فاضية إذا ما بدك تغييرها" : "6 أحرف على الأقل (افتراضي: changeme123)"}
            />
            <TextField
              select
              label="الدور"
              size="small"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, establishmentId: "" }))}
              fullWidth
            >
              <MenuItem value="super_admin">سوبر أدمن</MenuItem>
              <MenuItem value="establishment_admin">أدمن منشأة</MenuItem>
            </TextField>
            {form.role === "establishment_admin" && (
              <TextField
                select
                label="المنشأة"
                size="small"
                value={form.establishmentId}
                onChange={(e) => setForm((f) => ({ ...f, establishmentId: e.target.value }))}
                fullWidth
              >
                {establishments.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: tokens.muted }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ backgroundColor: tokens.ink, "&:hover": { backgroundColor: tokens.inkSoft } }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>حذف المستخدم؟</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            هذا الإجراء نهائي ومش قابل للتراجع.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDeleteId(null)} sx={{ color: tokens.muted }}>
            إلغاء
          </Button>
          <Button
            onClick={() => {
              deleteUser(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
            variant="contained"
            color="error"
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}