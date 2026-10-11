import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * The URL's QR code. To avoid sending the URL (including the manage URL's token) to an external service,
 * it is generated in the browser and drawn as SVG. The background is always white so it can be scanned in dark mode.
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    // border is the width of the margin (quiet zone) recommended by the QR code standard
    const { size, data } = encode(value, { border: 4 });
    const cells: string[] = [];
    data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) cells.push(`M${x} ${y}h1v1h-1z`);
      });
    });
    return { size, path: cells.join('') };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-48 rounded bg-white"
    >
      <path d={path} fill="#000" />
    </svg>
  );
}
