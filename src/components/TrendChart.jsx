import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "../theme/theme";

// ألوان مخصّصة لهاد الرسم بس (خروج مقصود عن نظام "بلا ألوان" المتّبع
// بباقي الواجهة) - كل مؤشر لازم يتميّز بلمحة سريعة بلون واضح خاص فيه.
const DEFAULT_PRIMARY_COLOR = "#2563EB"; // أزرق - المؤشر الأساسي (مثلاً الزيارات)
const DEFAULT_SECONDARY_COLOR = "#F97316"; // برتقالي - المؤشر الثانوي (مثلاً عملاء جدد)

/**
 * رسم خطي بألوان واضحة (مش أحادي اللون زي باقي المكوّنات) عشان كل جزئية
 * (زيارات مقابل عملاء جدد مثلاً) تتميّز فوراً بدون لبس. فيه:
 *  - تعبئة شفافة تحت خط المؤشر الأساسي
 *  - خطوط شبكة أفقية + قيم على المحور العمودي
 *  - نقاط واضحة على كل يوم لكل خط (مش بس عند الـ hover)
 *  - خط تأشير عمودي + Tooltip عند الـ hover
 *
 * @param {Array<{date: string, primary: number, secondary?: number}>} data
 * @param {string} primaryLabel
 * @param {string} [secondaryLabel]
 * @param {string} [primaryColor]
 * @param {string} [secondaryColor]
 */
export function TrendChart({
  data,
  primaryLabel,
  secondaryLabel,
  primaryColor = DEFAULT_PRIMARY_COLOR,
  secondaryColor = DEFAULT_SECONDARY_COLOR,
  height = 220,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 720; // viewBox units - scales responsively عن طريق الـ SVG container
  const padding = { top: 16, right: 40, bottom: 26, left: 40 };

  const { points, secondaryPoints, xForIndex, gridLines } = useMemo(() => {
    const values = data.map((d) => d.primary);
    const secondaryValues = secondaryLabel ? data.map((d) => d.secondary ?? 0) : [];
    const max = Math.max(1, ...values, ...secondaryValues);
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const xFor = (i) => padding.left + step * i;
    const yFor = (v) => padding.top + innerH - (v / max) * innerH;

    // ٥ خطوط شبكة أفقية (٠٪، ٢٥٪، ٥٠٪، ٧٥٪، ١٠٠٪ من القيمة القصوى)
    const lines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: padding.top + innerH - f * innerH,
      value: Math.round(max * f),
    }));

    return {
      points: values.map((v, i) => [xFor(i), yFor(v)]),
      secondaryPoints: secondaryValues.map((v, i) => [xFor(i), yFor(v)]),
      xForIndex: xFor,
      gridLines: lines,
    };
  }, [data, secondaryLabel, height]);

  if (!data || data.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
        ما في بيانات كافية لعرض الرسم البياني لسا
      </Typography>
    );
  }

  const toPath = (pts) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const areaPath = (pts) => {
    if (pts.length < 2) return "";
    const baseline = height - padding.bottom;
    return [
      `M ${pts[0][0].toFixed(1)} ${baseline}`,
      ...pts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`),
      `L ${pts[pts.length - 1][0].toFixed(1)} ${baseline}`,
      "Z",
    ].join(" ");
  };

  // نعرض حوالي ٦ تسميات على المحور الأفقي بس (مش كل يوم) عشان ما تتزاحم
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? xForIndex(hoverIdx) : null;

  const gradientId = `trendChartGradient-${primaryColor.replace("#", "")}`;

  return (
    <Stack spacing={1.5}>
      {(primaryLabel || secondaryLabel) && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ flexWrap: "wrap", rowGap: 1 }}>
          <Stack direction="row" spacing={2.5} alignItems="center">
            {primaryLabel && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 11, height: 11, borderRadius: "3px", backgroundColor: primaryColor }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.ink }}>
                  {primaryLabel}
                </Typography>
              </Stack>
            )}
            {secondaryLabel && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 11, height: 11, borderRadius: "3px", backgroundColor: secondaryColor }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.ink }}>
                  {secondaryLabel}
                </Typography>
              </Stack>
            )}
          </Stack>
          {hovered && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
              <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: tokens.muted }}>
                {hovered.date}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: primaryColor }} />
                {primaryLabel && (
                  <Typography variant="caption" sx={{ color: tokens.muted }}>
                    {primaryLabel}:
                  </Typography>
                )}
                <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: primaryColor }}>
                  {hovered.primary.toLocaleString("ar")}
                </Typography>
              </Stack>
              {secondaryLabel && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: secondaryColor }} />
                  <Typography variant="caption" sx={{ color: tokens.muted }}>
                    {secondaryLabel}:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: secondaryColor }}>
                    {(hovered.secondary ?? 0).toLocaleString("ar")}
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      )}

      <Box sx={{ width: "100%", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* خطوط شبكة أفقية + قيم المحور العمودي */}
          {gridLines.map((g) => (
            <g key={g.value}>
              <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke={tokens.hairline} strokeWidth={1} />
              <text x={padding.left - 8} y={g.y + 3} fontSize={10} fill={tokens.mutedLight} textAnchor="end" fontFamily='"IBM Plex Sans Arabic"'>
                {g.value.toLocaleString("ar")}
              </text>
            </g>
          ))}

          {/* تعبئة شفافة تحت خط المؤشر الأساسي */}
          {points.length > 1 && <path d={areaPath(points)} fill={`url(#${gradientId})`} stroke="none" />}

          {/* خط تأشير عمودي عند الـ hover */}
          {hoverX !== null && (
            <line x1={hoverX} y1={padding.top} x2={hoverX} y2={height - padding.bottom} stroke={tokens.mutedLight} strokeWidth={1} strokeDasharray="3 3" />
          )}

          {secondaryLabel && secondaryPoints.length > 1 && (
            <path d={toPath(secondaryPoints)} fill="none" stroke={secondaryColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {points.length > 1 && (
            <path d={toPath(points)} fill="none" stroke={primaryColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* نقاط واضحة على كل يوم لكل خط - مش بس عند الـ hover */}
          {points.map(([x, y], i) => (
            <circle key={`p-${i}`} cx={x} cy={y} r={hoverIdx === i ? 4.5 : 2.5} fill={tokens.surface} stroke={primaryColor} strokeWidth={2} />
          ))}
          {secondaryLabel &&
            secondaryPoints.map(([x, y], i) => (
              <circle key={`s-${i}`} cx={x} cy={y} r={hoverIdx === i ? 4.5 : 2.5} fill={tokens.surface} stroke={secondaryColor} strokeWidth={2} />
            ))}

          {/* مناطق تفاعلية شفافة أعرض من الخط عشان hover يشتغل بسهولة */}
          {points.map(([x], i) => (
            <rect
              key={`hit-${i}`}
              x={x - width / data.length / 2}
              y={padding.top}
              width={width / data.length}
              height={height - padding.top - padding.bottom}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            />
          ))}

          {/* تسميات المحور الأفقي */}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text
                key={d.date}
                x={xForIndex(i)}
                y={height - 6}
                fontSize={10}
                fill={tokens.mutedLight}
                textAnchor="middle"
                fontFamily='"IBM Plex Sans Arabic"'
              >
                {d.date.slice(5)}
              </text>
            ) : null
          )}
        </svg>
      </Box>
    </Stack>
  );
}