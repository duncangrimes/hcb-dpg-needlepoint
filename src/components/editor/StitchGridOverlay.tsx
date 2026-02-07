"use client";

interface StitchGridOverlayProps {
  width: number;
  height: number;
  stitchesWide: number;
  stitchesTall: number;
  color?: string;
  opacity?: number;
}

/**
 * Renders a grid overlay showing stitch boundaries
 * Useful for previewing how the needlepoint will look
 */
export function StitchGridOverlay({
  width,
  height,
  stitchesWide,
  stitchesTall,
  color = "#000000",
  opacity = 0.15,
}: StitchGridOverlayProps) {
  const stitchWidth = width / stitchesWide;
  const stitchHeight = height / stitchesTall;

  // Only render grid if stitches are large enough to see
  if (stitchWidth < 3 || stitchHeight < 3) return null;

  // Generate grid lines
  const verticalLines = [];
  const horizontalLines = [];

  for (let i = 0; i <= stitchesWide; i++) {
    const x = i * stitchWidth;
    verticalLines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={color}
        strokeWidth={i % 10 === 0 ? 0.5 : 0.25}
        opacity={opacity}
      />
    );
  }

  for (let i = 0; i <= stitchesTall; i++) {
    const y = i * stitchHeight;
    horizontalLines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth={i % 10 === 0 ? 0.5 : 0.25}
        opacity={opacity}
      />
    );
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {verticalLines}
      {horizontalLines}
    </svg>
  );
}

/**
 * CSS-based grid overlay (lighter weight for large grids)
 */
export function StitchGridOverlayCSS({
  width,
  height,
  stitchesWide,
  stitchesTall,
  color = "rgba(0,0,0,0.1)",
}: StitchGridOverlayProps) {
  const stitchWidth = width / stitchesWide;
  const stitchHeight = height / stitchesTall;

  // Don't render if stitches are too small to see
  if (stitchWidth < 2 || stitchHeight < 2) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, ${color} 1px, transparent 1px),
          linear-gradient(to bottom, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `${stitchWidth}px ${stitchHeight}px`,
      }}
    />
  );
}
