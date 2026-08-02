import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "../theme/theme";

const DEFAULT_COLOR = "#6366F1"; // نيلي زاهي - نفس عائلة الألوان الزاهية المستخدمة بشارتات الداشبورد

/**
 * مخطط أعمدة بسيط (عمودي أو أفقي) لبيانات فئوية (يوم بالأسبوع، ساعة
 * باليوم، فئة وجبة...) - مش سلسلة زمنية، فمش مبني على TrendChart.
 *
 * @param {Array<{label: string, value: number}>} data
 * @param {boolean} [horizontal] - أعمدة أفقية (أفضل للتسميات الطويلة زي أسماء الوجبات)
 * @param {string} [color]
 * @param {string} [valueSuffix] - نص يضاف بعد الرقم (مثلاً "زيارة")
 */
export function SimpleBarChart({ data, horizontal = false, color = DEFAULT_COLOR, valueSuffix = "", height }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const items = data || [];
  const max = useMemo(() => Math.max(1, ...items.map((d) => d.value)), [items]);

  if (items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
        ما في بيانات كافية لعرض المخطط لسا
      </Typography>
    );
  }

  if (horizontal) {
    return (
      <Stack spacing={1.25} sx={{ py: 0.5 }}>
        {items.map((d, i) => (
          <Stack key={d.label} spacing={0.4}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.ink }} noWrap>
                {d.label}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color }}>
                {d.value.toLocaleString("ar")}
                {valueSuffix}
              </Typography>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, backgroundColor: tokens.surfaceAlt, overflow: "hidden" }}>
              <Box
                sx={{
                  height: "100%",
                  width: `${Math.max(3, (d.value / max) * 100)}%`,
                  borderRadius: 4,
                  backgroundColor: color,
                  transition: "width 0.4s ease",
                }}
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    );
  }

  // نسخة عمودية - SVG أبسط، مفيدة لعدد فئات أكبر (زي ٢٤ ساعة باليوم)
  const width = 720;
  const chartHeight = height || 200;
  const padding = { top: 12, right: 8, bottom: 26, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;
  const barSlot = innerW / items.length;
  const barWidth = Math.min(barSlot * 0.6, 34);
  const labelEvery = Math.max(1, Math.ceil(items.length / 12));
  const hovered = hoverIdx !== null ? items[hoverIdx] : null;

  return (
    <Stack spacing={1}>
      {hovered && (
        <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Sans Arabic"', fontWeight: 700, color: tokens.ink }}>
          {hovered.label}: {hovered.value.toLocaleString("ar")}
          {valueSuffix}
        </Typography>
      )}
      <Box sx={{ width: "100%", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${width} ${chartHeight}`} width="100%" height={chartHeight} preserveAspectRatio="none">
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={width - padding.right}
            y2={chartHeight - padding.bottom}
            stroke={tokens.hairline}
            strokeWidth={1}
          />
          {items.map((d, i) => {
            const x = padding.left + barSlot * i + (barSlot - barWidth) / 2;
            const h = (d.value / max) * innerH;
            const y = padding.top + innerH - h;
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(h, d.value > 0 ? 2 : 0)}
                  rx={3}
                  fill={color}
                  opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.4}
                />
                <rect
                  x={padding.left + barSlot * i}
                  y={padding.top}
                  width={barSlot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                />
                {i % labelEvery === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 8}
                    fontSize={10}
                    fill={tokens.mutedLight}
                    textAnchor="middle"
                    fontFamily='"IBM Plex Sans Arabic"'
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>
    </Stack>
  );
}