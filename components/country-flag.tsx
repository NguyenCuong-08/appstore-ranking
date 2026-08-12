"use client";

import * as Flags from "country-flag-icons/react/3x2";

const flagMap = Flags as unknown as Record<
  string,
  React.ComponentType<{
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    title?: string;
  }>
>;

export function CountryFlag({
  code,
  width = 20,
  height = 15,
  style,
}: {
  code: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}) {
  const Flag = flagMap[code.toUpperCase()];
  if (!Flag) return <span style={style}>{code.toUpperCase()}</span>;
  return <Flag width={width} height={height} style={style} />;
}
