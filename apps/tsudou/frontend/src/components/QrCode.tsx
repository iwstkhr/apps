import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * URL の QR コード。外部サービスに URL (管理用 URL のトークンを含む) を送らないよう、
 * ブラウザ内で生成して SVG で描く。ダークモードでも読み取れるよう背景は常に白にする。
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    // border は QR コードの規格で推奨される余白 (クワイエットゾーン) の幅
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
