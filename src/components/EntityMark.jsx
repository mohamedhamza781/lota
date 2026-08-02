import { tokens } from "../theme/theme";

/**
 * The "كيان" (kayān — entity/being) mark: a diamond drawn in full outline,
 * with exactly half of it inked solid. The name means something that has
 * taken shape, has presence — so the mark itself is caught mid-formation:
 * one half still just an outline, one half fully realized. It's the same
 * "ink or no ink" logic as the tier badges, elevated into the wordmark
 * itself, so the brand and the product language are literally the same
 * shape.
 */
export function EntityMark({ size = 34, inverted = false }) {
  const strokeColor = inverted ? tokens.paper : tokens.ink;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,6 94,50 50,94" fill={strokeColor} />
      <polygon points="50,6 94,50 50,94 6,50" stroke={strokeColor} strokeWidth="7" fill="none" strokeLinejoin="round" />
    </svg>
  );
}
