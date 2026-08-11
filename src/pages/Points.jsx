import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  TextField,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  Autocomplete,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { pointsRuleApi } from "../api/pointsRule";
import { transactionsApi } from "../api/transactions";
import { getCached, setCached } from "../utils/dataCache";

const EMPTY_PERCENTAGE_RULE = {
  enabled: false,
  pointsRequired: 100,
  percentValue: 5,
  couponCode: "",
  applyTo: "all",
  selectedCustomerIds: [],
};

const ROUNDING_LABELS = { floor: "لتحت", ceil: "لفوق", round: "لأقرب رقم" };

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function Points() {
  const { establishmentId } = useParams();
  const { establishments } = useAuth();
  const establishment = establishments.find((e) => e.id === establishmentId);

  const [pointsRule, setPointsRule] = useState(() => getCached(`pointsRule:${establishmentId}`) ?? null);
  const [transactions, setTransactions] = useState(() => getCached(`transactions:${establishmentId}`) ?? []);
  const [loading, setLoading] = useState(() => getCached(`transactions:${establishmentId}`) === undefined);

  // === دفتر نقاط العملاء (اسم + رصيد نقاط + هل مؤهل لهدية النسبة حالياً) ===
  const [customers, setCustomers] = useState(() => getCached(`pointsCustomers:${establishmentId}`) ?? []);

  // === معادلة الخصم بالنسبة المئوية (قابلة للتعديل من هون) ===
  const [percentageForm, setPercentageForm] = useState(EMPTY_PERCENTAGE_RULE);
  const [savingPercentage, setSavingPercentage] = useState(false);
  const [percentageMsg, setPercentageMsg] = useState(null); // { type: "success"|"error", text }

  // === إرسال الهدية يدوياً الآن ===
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState("eligible"); // "eligible" | "selected"
  const [sendSelectedCustomers, setSendSelectedCustomers] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  function loadAll() {
    if (!establishmentId) return;
    Promise.all([
      pointsRuleApi.get(establishmentId).catch(() => null),
      transactionsApi.list(establishmentId).catch(() => []),
      pointsRuleApi.customers(establishmentId).catch(() => []),
    ]).then(([rule, txns, custs]) => {
      setPointsRule(rule);
      setTransactions(txns || []);
      setCustomers(custs || []);
      setCached(`pointsRule:${establishmentId}`, rule);
      setCached(`transactions:${establishmentId}`, txns || []);
      setCached(`pointsCustomers:${establishmentId}`, custs || []);
      setLoading(false);
      if (rule?.percentageRedemption) {
        setPercentageForm({
          enabled: rule.percentageRedemption.enabled ?? false,
          pointsRequired: rule.percentageRedemption.pointsRequired ?? 100,
          percentValue: rule.percentageRedemption.percentValue ?? 5,
          couponCode: rule.percentageRedemption.couponCode ?? "",
          applyTo: rule.percentageRedemption.applyTo ?? "all",
          selectedCustomerIds: rule.percentageRedemption.selectedCustomerIds ?? [],
        });
      }
    });
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  const selectedCustomerObjects = useMemo(
    () => customers.filter((c) => percentageForm.selectedCustomerIds.includes(c.customerId)),
    [customers, percentageForm.selectedCustomerIds]
  );

  async function handleSavePercentageRule() {
    if (percentageForm.pointsRequired <= 0) {
      setPercentageMsg({ type: "error", text: "عدد النقاط المطلوب لازم يكون أكبر من صفر" });
      return;
    }
    if (percentageForm.applyTo === "selected" && percentageForm.selectedCustomerIds.length === 0) {
      setPercentageMsg({ type: "error", text: "اختار عميل واحد على الأقل لما تكون الهدية لعملاء محددين" });
      return;
    }
    setSavingPercentage(true);
    setPercentageMsg(null);
    try {
      const updated = await pointsRuleApi.update({ percentageRedemption: percentageForm }, establishmentId);
      setPointsRule(updated);
      setCached(`pointsRule:${establishmentId}`, updated);
      setPercentageMsg({ type: "success", text: "تم حفظ معادلة الخصم بالنسبة المئوية" });
    } catch (err) {
      setPercentageMsg({ type: "error", text: err.message || "تعذّر حفظ المعادلة" });
    } finally {
      setSavingPercentage(false);
    }
  }

  async function handleSendGiftNow() {
    setSending(true);
    setSendMsg(null);
    try {
      const payload =
        sendTarget === "eligible"
          ? { target: "eligible" }
          : { target: "selected", customerIds: sendSelectedCustomers.map((c) => c.customerId) };
      const result = await pointsRuleApi.sendPercentageGift(payload, establishmentId);
      setSendMsg({ type: "success", text: `تم إرسال الهدية لـ${result?.sentCount ?? 0} عميل` });
      loadAll();
    } catch (err) {
      setSendMsg({ type: "error", text: err.message || "تعذّر إرسال الهدية" });
    } finally {
      setSending(false);
    }
  }

  const summary = useMemo(() => {
    const issued = transactions.reduce((sum, t) => sum + (t.pointsEarned || 0), 0);
    const redeemed = transactions.reduce((sum, t) => sum + (t.pointsSpent || 0), 0);
    const purchases = transactions.filter((t) => t.type === "purchase").length;
    const redemptions = transactions.filter((t) => t.type === "redeem").length;
    return { issued, redeemed, purchases, redemptions };
  }, [transactions]);

  return (
    <Stack spacing={2.5}>
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard index="٠١" delay={0} label="نقاط صادرة" value={summary.issued.toLocaleString("ar")} unit="نقطة" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard index="٠٢" delay={1} label="نقاط مستبدلة" value={summary.redeemed.toLocaleString("ar")} unit="نقطة" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard index="٠٣" delay={2} label="عمليات شراء" value={summary.purchases.toLocaleString("ar")} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard index="٠٤" delay={3} label="عمليات استبدال" value={summary.redemptions.toLocaleString("ar")} />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: 2.5, height: "100%" }}>
              <SectionHeader title="معادلة النقاط الحالية" />
              {pointsRule ? (
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${tokens.hairline}` }}
                  >
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      كل {pointsRule.currencyPerPoint} من العملة = نقطة واحدة
                    </Typography>
                    <Chip
                      size="small"
                      label={pointsRule.isActive ? "مفعّلة" : "متوقفة"}
                      sx={{
                        backgroundColor: pointsRule.isActive ? tokens.ink : tokens.surfaceAlt,
                        color: pointsRule.isActive ? tokens.paper : tokens.muted,
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    وضع التقريب: {ROUNDING_LABELS[pointsRule.roundingMode] || pointsRule.roundingMode}
                  </Typography>

                  {/* معادلة الاستبدال - تحويل النقاط لخصم نقدي مباشر */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ p: 1.5, borderRadius: 3, border: `1px solid ${tokens.hairline}`, backgroundColor: tokens.surfaceAlt }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      كل {(pointsRule.pointsPerCurrencyDiscount ?? 100).toLocaleString("ar")} نقطة = خصم 1 ₪
                    </Typography>
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {loading ? "جاري التحميل…" : "ما في معادلة نقاط محدّدة لهاي المنشأة بعد."}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 2.5, height: "100%" }}>
              <SectionHeader title="آخر عمليات النقاط" />
              {transactions.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>
                  {loading ? "جاري التحميل…" : "ما في عمليات مسجّلة بعد."}
                </Typography>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
<Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>العميل</TableCell>
                      <TableCell>العملية</TableCell>
                      <TableCell align="center">النقاط</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.slice(0, 8).map((t) => (
                      <TableRow key={t._id} hover>
                        <TableCell sx={{ color: "text.secondary", fontFamily: '"IBM Plex Sans Arabic"', fontSize: "0.8rem" }}>
                          {fmtDateTime(t.createdAt)}
                        </TableCell>
                        <TableCell>{t.customerId?.name || "—"}</TableCell>
                        <TableCell>
                          {t.type === "purchase"
                            ? `شراء — ${t.amount}`
                            : t.rewardId?.name
                            ? `استبدال — ${t.rewardId.name}`
                            : `استبدال — خصم نقدي ${t.amount ? `${t.amount} ₪` : ""}`}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            component="span"
                            sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: t.type === "redeem" ? tokens.muted : tokens.ink }}
                          >
                            {t.type === "redeem" ? `-${t.pointsSpent}` : `+${t.pointsEarned}`}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
</Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* === معادلة الخصم بالنسبة المئوية (ديناميكية) === */}
      <Box sx={{ overflow: "hidden" }}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.5, height: "100%" }}>
              <SectionHeader title="معادلة الخصم بالنسبة المئوية" />
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                مثال: كل 100 نقطة = خصم 5%. أي عميل يوصل رصيده للحد المطلوب بياخد الهدية تلقائياً
                (بتظهر إله بتبويب "الهدايا" بشات الويب)، أو تقدر تحصرها بعملاء محددين وترسلها يدوياً.
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={percentageForm.enabled}
                      onChange={(e) => setPercentageForm((f) => ({ ...f, enabled: e.target.checked }))}
                    />
                  }
                  label={percentageForm.enabled ? "المعادلة مفعّلة" : "المعادلة متوقفة"}
                />

                <Stack direction="row" spacing={1.5}>
                  <TextField
                    label="عدد النقاط المطلوب"
                    size="small"
                    type="number"
                    value={percentageForm.pointsRequired}
                    onChange={(e) => setPercentageForm((f) => ({ ...f, pointsRequired: Number(e.target.value) }))}
                    sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                  />
                  <TextField
                    label="نسبة الخصم %"
                    size="small"
                    type="number"
                    value={percentageForm.percentValue}
                    onChange={(e) => setPercentageForm((f) => ({ ...f, percentValue: Number(e.target.value) }))}
                    sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                  />
                </Stack>

                <TextField
                  label="كود الكوبون (اختياري)"
                  size="small"
                  value={percentageForm.couponCode}
                  onChange={(e) => setPercentageForm((f) => ({ ...f, couponCode: e.target.value }))}
                  helperText="اتركه فاضي عشان يتولّد كود تلقائي - نفس الكود بيترسل لكل العملاء المؤهلين"
                  fullWidth
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />

                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                  الهدية لمين؟
                </Typography>
                <RadioGroup
                  row
                  value={percentageForm.applyTo}
                  onChange={(e) => setPercentageForm((f) => ({ ...f, applyTo: e.target.value }))}
                >
                  <FormControlLabel value="all" control={<Radio size="small" />} label="كل العملاء المؤهلين" />
                  <FormControlLabel value="selected" control={<Radio size="small" />} label="عملاء محددين" />
                </RadioGroup>

                {percentageForm.applyTo === "selected" && (
                  <Autocomplete
                    multiple
                    options={customers}
                    getOptionLabel={(c) => `${c.name || "—"} — ${(c.pointsBalance || 0).toLocaleString("ar")} نقطة`}
                    value={selectedCustomerObjects}
                    isOptionEqualToValue={(a, b) => a.customerId === b.customerId}
                    onChange={(e, value) =>
                      setPercentageForm((f) => ({ ...f, selectedCustomerIds: value.map((c) => c.customerId) }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="اختار العملاء"
                        size="small"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                      />
                    )}
                  />
                )}

                {percentageMsg && (
                  <Alert severity={percentageMsg.type} onClose={() => setPercentageMsg(null)}>
                    {percentageMsg.text}
                  </Alert>
                )}

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={handleSavePercentageRule}
                    disabled={savingPercentage}
                    sx={{ borderRadius: "12px", backgroundColor: tokens.ink }}
                  >
                    {savingPercentage ? "جاري الحفظ…" : "حفظ المعادلة"}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CardGiftcardRoundedIcon />}
                    onClick={() => setSendDialogOpen(true)}
                    sx={{ borderRadius: "12px" }}
                  >
                    إرسال الهدية الآن
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* === دفتر نقاط العملاء === */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.5, height: "100%" }}>
              <SectionHeader title="نقاط العملاء" />
              {customers.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>
                  {loading ? "جاري التحميل…" : "ما في عملاء مسجّلين بعد."}
                </Typography>
              ) : (
                <Box sx={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>العميل</TableCell>
                        <TableCell align="center">النقاط</TableCell>
                        <TableCell align="center">مؤهل للهدية؟</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customers.map((c) => (
                        <TableRow key={c.customerId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {c.name || "—"}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {c.phone || ""}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box component="span" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700 }}>
                              {(c.pointsBalance || 0).toLocaleString("ar")}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {c.eligibleForPercentageGift ? (
                              <Chip
                                size="small"
                                label="مؤهل"
                                sx={{ backgroundColor: tokens.ink, color: tokens.paper }}
                              />
                            ) : (
                              <Chip size="small" label="—" sx={{ backgroundColor: tokens.surfaceAlt, color: tokens.muted }} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* === Dialog إرسال الهدية يدوياً === */}
      <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>إرسال هدية النسبة المئوية الآن</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RadioGroup value={sendTarget} onChange={(e) => setSendTarget(e.target.value)}>
              <FormControlLabel value="eligible" control={<Radio size="small" />} label="كل العملاء المؤهلين حالياً" />
              <FormControlLabel value="selected" control={<Radio size="small" />} label="عملاء محددين (بغض النظر عن رصيدهم)" />
            </RadioGroup>

            {sendTarget === "selected" && (
              <Autocomplete
                multiple
                options={customers}
                getOptionLabel={(c) => `${c.name || "—"} — ${(c.pointsBalance || 0).toLocaleString("ar")} نقطة`}
                value={sendSelectedCustomers}
                isOptionEqualToValue={(a, b) => a.customerId === b.customerId}
                onChange={(e, value) => setSendSelectedCustomers(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="اختار العملاء"
                    size="small"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                  />
                )}
              />
            )}

            {sendMsg && (
              <Alert severity={sendMsg.type} onClose={() => setSendMsg(null)}>
                {sendMsg.text}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendDialogOpen(false)}>إغلاق</Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleSendGiftNow}
            disabled={sending || (sendTarget === "selected" && sendSelectedCustomers.length === 0)}
            sx={{ borderRadius: "12px", backgroundColor: tokens.ink }}
          >
            {sending ? "جاري الإرسال…" : "إرسال الآن"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}