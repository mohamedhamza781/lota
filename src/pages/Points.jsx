import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Box, Chip } from "@mui/material";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { tokens } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { pointsRuleApi } from "../api/pointsRule";
import { transactionsApi } from "../api/transactions";
import { getCached, setCached } from "../utils/dataCache";

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

  useEffect(() => {
    if (!establishmentId) return;
    Promise.all([
      pointsRuleApi.get(establishmentId).catch(() => null),
      transactionsApi.list(establishmentId).catch(() => []),
    ]).then(([rule, txns]) => {
      setPointsRule(rule);
      setTransactions(txns || []);
      setCached(`pointsRule:${establishmentId}`, rule);
      setCached(`transactions:${establishmentId}`, txns || []);
      setLoading(false);
    });
  }, [establishmentId]);

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
    </Stack>
  );
}