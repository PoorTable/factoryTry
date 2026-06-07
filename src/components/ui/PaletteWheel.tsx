import Svg, { Path } from 'react-native-svg';
import { View, type ViewProps } from 'react-native';

type PaletteSegment = {
  color: string;
  /** Percentage of the wheel — values must sum to 100 */
  pct: number;
};

type PaletteWheelProps = ViewProps & {
  /** Segments to display in the annular donut */
  segments: PaletteSegment[];
  /** Outer diameter — defaults to 200 */
  size?: number;
  /** Inner hole radius as a fraction of outer radius — defaults to 0.45 */
  innerRatio?: number;
};

/**
 * Convert polar coordinates to cartesian.
 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Build an SVG arc path for one donut segment.
 */
function buildArcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
  gap = 1.5,
): string {
  const adjustedStart = startAngle + gap / 2;
  const adjustedEnd = endAngle - gap / 2;

  const outerStart = polarToCartesian(cx, cy, outerR, adjustedStart);
  const outerEnd = polarToCartesian(cx, cy, outerR, adjustedEnd);
  const innerStart = polarToCartesian(cx, cy, innerR, adjustedEnd);
  const innerEnd = polarToCartesian(cx, cy, innerR, adjustedStart);

  const largeArc = adjustedEnd - adjustedStart > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

/**
 * PaletteWheel — SVG annular donut sized by percentage per segment.
 * Renders the wardrobe color palette distribution on the You screen.
 */
export function PaletteWheel({
  segments,
  size = 200,
  innerRatio = 0.45,
  style,
  ...rest
}: PaletteWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * innerRatio;

  // Build cumulative angles
  let currentAngle = 0;
  const paths: { path: string; color: string }[] = [];

  for (const seg of segments) {
    if (seg.pct <= 0) continue;
    const sweep = (seg.pct / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    paths.push({
      path: buildArcPath(cx, cy, outerR, innerR, startAngle, endAngle),
      color: seg.color,
    });
    currentAngle = endAngle;
  }

  return (
    <View style={[{ width: size, height: size }, style]} {...rest}>
      <Svg width={size} height={size}>
        {paths.map((p, i) => (
          <Path key={i} d={p.path} fill={p.color} />
        ))}
      </Svg>
    </View>
  );
}
