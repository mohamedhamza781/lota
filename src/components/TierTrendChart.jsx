import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "../theme/theme";

// ألوان زاهية لكل تصنيف نشاط (نفس الترتيب من الأضعف للأقوى) - مستخدمة هون
// وبأي مكان تاني بالداشبورد بيعرض نفس التصنيفات (مثلاً شارة العميل بجدول
// العملاء)، عشان اللون يضل نفسه كمرجع بصري واحد بكل الصفحة.
export const TIER_COLORS = {
  new: "#38BDF8", // زائر جديد - سماوي زاهي
  hesitant: "#6366F1", // متردد - نيلي زاهي
  active: "#FACC15", // نشط - أصفر زاهي
  loyal: "#A855F7", // وفيّ - بنفسجي زاهي
  ambassador: "#F97316", // سفير - برتقالي زاهي
};
export const TIER_LABELS_AR = { new: "زائر جديد", hesitant: "متردد", active: "نشط", loyal: "وفيّ", ambassador: "سفير" };
const TIER_ORDER = ["new", "hesitant", "active", "loyal", "ambassador"];

function formatBucketLabel(bucket, granularity) {
  if (granularity === "month") {
    const [y, m] = bucket.split("-");
    return `${m}/${y.slice(2)}`;
  }
  if (granularity === "week") {
    const d = new Date(bucket);
    return `أسبوع ${d.getDate()}/${d.getMonth() + 1}`;
  }
  const d = new Date(bucket);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// منحنى Catmull-Rom محوّل لـ Bezier - بيرسم خط ناعم يمر فعليًا من كل نقطة
// (مش تقريب زي بعض تقنيات التنعيم التانية). startWithM=false بيرجع بس
// أوامر C (بيكمل من مكان القلم الحالي) - مفيد لما نبني شكل مساحة مغلق.
function smoothPath(points, startWithM = true) {
  if (points.length === 0) return "";
  if (points.length === 1) return startWithM ? `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}` : "";
  let d = startWithM ? `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}` : "";
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// شكل مساحة مغلق بين منحنيين (حد أعلى وحد أسفل لنفس الشريحة المكدّسة) -
// كلا المنحنيين بيستخدموا نفس دالة التنعيم، فالحدود المشتركة بين طبقتين
// متجاورتين بتطابق تمامًا بدون فجوات أو تراكب.
function stackedAreaPath(topPoints, bottomPoints) {
  const top = smoothPath(topPoints, true);
  const bottomReversed = [...bottomPoints].reverse();
  const closingLine = ` L ${bottomReversed[0][0].toFixed(1)},${bottomReversed[0][1].toFixed(1)}`;
  const bottomCurve = smoothPath(bottomReversed, false);
  return `${top}${closingLine}${bottomCurve} Z`;
}

/**
 * مساحات مكدّسة بمنحنيات ناعمة (مش أعمدة) بتبيّن تركيبة الزيارات حسب
 * تصنيف نشاط العميل (سفير/وفيّ/نشط/متردد/زائر جديد) بكل فترة زمنية.
 *
 * @param {Array<{bucket: string, tiers: Record<string, number>}>} trend
 * @param {"day"|"week"|"month"} granularity
 */
export function TierTrendChart({ trend, granularity = "day", height = 240 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 720;
  const padding = { top: 16, right: 36, bottom: 30, left: 36 };

  const { bars, maxTotal, gridLines, xForIndex, layerAreas } = useMemo(() => {
    const data = trend || [];
    const totals = data.map((t) => TIER_ORDER.reduce((sum, k) => sum + (t.tiers?.[k] || 0), 0));
    const max = Math.max(1, ...totals);
    const lines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: f, value: Math.round(max * f) }));

    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    const xFor = (i) => padding.left + step * i;
    const yFor = (v) => padding.top + innerH - (v / max) * innerH;

    // خطوط الحدود المتراكمة (٦ خطوط: صفر، ثم بعد كل شريحة) - كل خط بيتحسب
    // مرة وحدة بس، والمساحات بين خط وخط بتشكّل كل طبقة
    const boundaryValues = data.map((t) => {
      let running = 0;
      return [0, ...TIER_ORDER.map((k) => (running += t.tiers?.[k] || 0))];
    });
    const boundaryPoints = [0, 1, 2, 3, 4, 5].map((b) => data.map((_, i) => [xFor(i), yFor(boundaryValues[i]?.[b] || 0)]));

    const areas = TIER_ORDER.map((tierKey, k) => ({
      tierKey,
      path: data.length > 1 ? stackedAreaPath(boundaryPoints[k + 1], boundaryPoints[k]) : "",
      topPoints: boundaryPoints[k + 1],
    }));

    return { bars: data, maxTotal: max, gridLines: lines, xForIndex: xFor, layerAreas: areas };
  }, [trend, height]);

  if (!bars.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
        ما في بيانات كافية لعرض تركيبة الزيارات لسا
      </Typography>
    );
  }

  const labelEvery = Math.max(1, Math.ceil(bars.length / 6));
  const hovered = hoverIdx !== null ? bars[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xForIndex(hoverIdx) : null;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.75, minHeight: 28 }}>
        {hovered ? (
          <>
            <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: tokens.ink }}>
              {formatBucketLabel(hovered.bucket, granularity)}
            </Typography>
            {TIER_ORDER.map((t) => (
              <Stack key={t} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 9, height: 9, borderRadius: "3px", backgroundColor: TIER_COLORS[t], flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: tokens.muted }}>
                  {TIER_LABELS_AR[t]}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: TIER_COLORS[t] }}>
                  {(hovered.tiers?.[t] || 0).toLocaleString("ar")}
                </Typography>
              </Stack>
            ))}
            <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: tokens.ink }}>
              — الإجمالي: {TIER_ORDER.reduce((sum, k) => sum + (hovered.tiers?.[k] || 0), 0).toLocaleString("ar")}
            </Typography>
          </>
        ) : (
          TIER_ORDER.map((t) => (
            <Stack key={t} direction="row" spacing={0.6} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: TIER_COLORS[t] }} />
              <Typography variant="caption" sx={{ color: tokens.muted }}>
                {TIER_LABELS_AR[t]}
              </Typography>
            </Stack>
          ))
        )}
      </Stack>

      <Box sx={{ width: "100%", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
          <defs>
            {TIER_ORDER.map((t) => (
              <linearGradient key={t} id={`tierFill-${t}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TIER_COLORS[t]} stopOpacity="0.85" />
                <stop offset="100%" stopColor={TIER_COLORS[t]} stopOpacity="0.55" />
              </linearGradient>
            ))}
          </defs>

          {gridLines.map((g) => {
            const y = padding.top + (height - padding.top - padding.bottom) * (1 - g.value / maxTotal);
            return (
              <g key={g.y}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={tokens.hairline} strokeWidth={1} />
                <text x={padding.left - 8} y={y + 3} fontSize={10} fill={tokens.mutedLight} textAnchor="end" fontFamily='"IBM Plex Sans Arabic"'>
                  {g.value.toLocaleString("ar")}
                </text>
              </g>
            );
          })}

          {layerAreas.map((layer) => (
            <path
              key={layer.tierKey}
              d={layer.path}
              fill={`url(#tierFill-${layer.tierKey})`}
              stroke={TIER_COLORS[layer.tierKey]}
              strokeWidth={1.5}
              opacity={hoverIdx === null ? 1 : 0.9}
            />
          ))}

          {/* خط تأشير عمودي + نقاط عند كل طبقة بعمود الـ hover */}
          {hoverX !== null && (
            <>
              <line x1={hoverX} y1={padding.top} x2={hoverX} y2={height - padding.bottom} stroke={tokens.ink} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
              {layerAreas.map((layer) => {
                const pt = layer.topPoints[hoverIdx];
                return pt ? <circle key={layer.tierKey} cx={pt[0]} cy={pt[1]} r={3} fill={TIER_COLORS[layer.tierKey]} stroke={tokens.surface} strokeWidth={1.5} /> : null;
              })}
            </>
          )}

          {/* مناطق تفاعلية شفافة عشان الـ hover يشتغل بسهولة */}
          {bars.map((b, i) => (
            <rect
              key={b.bucket}
              x={xForIndex(i) - width / bars.length / 2}
              y={padding.top}
              width={width / bars.length}
              height={height - padding.top - padding.bottom}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            />
          ))}

          {bars.map((b, i) =>
            i % labelEvery === 0 || i === bars.length - 1 ? (
              <text
                key={b.bucket}
                x={xForIndex(i)}
                y={height - 8}
                fontSize={10}
                fill={tokens.mutedLight}
                textAnchor="middle"
                fontFamily='"IBM Plex Sans Arabic"'
              >
                {formatBucketLabel(b.bucket, granularity)}
              </text>
            ) : null
          )}
        </svg>
      </Box>
    </Stack>
  );
}