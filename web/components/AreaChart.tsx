/* Dependency-free stacked-area chart (SVG). Pure render from props — no hooks,
   no chart lib. Series stack in order; a single data point renders as a flat
   filled band so sparse demo data still reads as a chart. */

export interface Series {
  name: string;
  color: string;
  /** One value per label, in the same order as `labels`. */
  points: number[];
}

interface Props {
  labels: string[];
  series: Series[];
  height?: number;
  /** Formats the y-axis ticks (e.g. amounts). */
  formatY?: (v: number) => string;
}

const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

export default function AreaChart({ labels, series, height = 260, formatY }: Props) {
  const width = 720; // viewBox units; SVG scales to container width
  const n = labels.length;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  // Stack totals per index to find the max.
  const stackedMax = Math.max(
    1,
    ...labels.map((_, i) => series.reduce((s, ser) => s + (ser.points[i] ?? 0), 0)),
  );
  const niceMax = niceCeil(stackedMax);

  const x = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW) + PAD.left;
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;

  // Build cumulative stacks (bottom → top).
  const cum = labels.map(() => 0);
  const bands = series.map((ser) => {
    const lower = cum.slice();
    const upper = labels.map((_, i) => (cum[i] += ser.points[i] ?? 0));
    return { ser, lower, upper };
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  const fy = formatY ?? ((v: number) => String(Math.round(v)));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img"
        aria-label="Volume over time by asset">
        {/* gridlines + y ticks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)}
              stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end"
              fontSize={10} fill="var(--faint)" fontFamily="var(--font-mono)">
              {fy(t)}
            </text>
          </g>
        ))}

        {/* stacked bands */}
        {bands.map(({ ser, lower, upper }, bi) => {
          if (n === 1) {
            const yl = y(lower[0]);
            const yu = y(upper[0]);
            return (
              <rect key={bi} x={PAD.left} y={yu} width={innerW} height={Math.max(0, yl - yu)}
                fill={ser.color} opacity={0.9} />
            );
          }
          const top = labels.map((_, i) => `${x(i)},${y(upper[i])}`);
          const bottom = labels.map((_, i) => `${x(i)},${y(lower[i])}`).reverse();
          return (
            <polygon key={bi} points={[...top, ...bottom].join(" ")} fill={ser.color}
              opacity={0.9} />
          );
        })}

        {/* x labels: first + last only, to stay uncluttered */}
        {n > 0 && (
          <>
            <text x={x(0)} y={height - 6} textAnchor="start" fontSize={10}
              fill="var(--faint)" fontFamily="var(--font-mono)">
              {labels[0]}
            </text>
            {n > 1 && (
              <text x={x(n - 1)} y={height - 6} textAnchor="end" fontSize={10}
                fill="var(--faint)" fontFamily="var(--font-mono)">
                {labels[n - 1]}
              </text>
            )}
          </>
        )}
      </svg>

      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}>
            <i className="swatch" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}
