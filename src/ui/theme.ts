import type { DashboardTab } from "../types";

export interface Palette {
  ink: string;
  muted: string;
  soft: string;
  border: string;
  product: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  accentSoftText: string;
  accentAlt: string;
  info: string;
  success: string;
  warning: string;
  danger: string;
  tabText: string;
}

export const LIGHT_PALETTE: Palette = {
  ink: "#2f241d",
  muted: "#6d6258",
  soft: "#8f8275",
  border: "#bcae9d",
  product: "#b5642d",
  accent: "#c86f3a",
  accentText: "#fff6eb",
  accentSoft: "#e7c4a0",
  accentSoftText: "#36281d",
  accentAlt: "#6f8a45",
  info: "#4a7896",
  success: "#6f8a45",
  warning: "#c27a33",
  danger: "#b14f45",
  tabText: "#74675b",
};

export const DARK_PALETTE: Palette = {
  ink: "#eadfce",
  muted: "#baa996",
  soft: "#93826f",
  border: "#5f544b",
  product: "#f0a464",
  accent: "#e48a4b",
  accentText: "#1f1712",
  accentSoft: "#5d4132",
  accentSoftText: "#f1e4d4",
  accentAlt: "#95b863",
  info: "#78a9cc",
  success: "#95b863",
  warning: "#d59b56",
  danger: "#d87a6f",
  tabText: "#bba997",
};

export const PRODUCT_LINES = [
  "                                                                          ",
  "                                                                          ",
  "  /$$$$$$$ /$$  /$$  /$$  /$$$$$$   /$$$$$$   /$$$$$$  /$$   /$$  /$$$$$$ ",
  " /$$_____/| $$ | $$ | $$ /$$__  $$ /$$__  $$ /$$__  $$| $$  | $$ /$$__  $$",
  "|  $$$$$$ | $$ | $$ | $$| $$$$$$$$| $$$$$$$$| $$  \\ $$| $$  | $$| $$  \\__/",
  " \\____  $$| $$ | $$ | $$| $$_____/| $$_____/| $$  | $$| $$  | $$| $$      ",
  " /$$$$$$$/|  $$$$$/$$$$/|  $$$$$$$|  $$$$$$$| $$$$$$$/|  $$$$$$/| $$      ",
  "|_______/  \\_____/\\___/  \\_______/ \\_______/| $$____/  \\______/ |__/      ",
  "                                            | $$                          ",
  "                                            | $$                          ",
  "                                            |__/                          ",
] as const;

export function getPalette(themeMode: string | null | undefined): Palette {
  return themeMode === "light" ? LIGHT_PALETTE : DARK_PALETTE;
}

export function getActiveAccent(tab: DashboardTab, palette: Palette): string {
  return tab === "ports" ? palette.info : palette.product;
}

export function getAnimatedProductLineColors(
  palette: Palette,
  activeAccent: string,
  motionTick: number,
): string[] {
  return PRODUCT_LINES.map((_, index) => {
    const wave = (Math.sin(motionTick + index * 0.55) + 1) / 2;
    const accentMix = 0.18 + wave * 0.36;
    const coolMix = ((Math.cos(motionTick * 0.7 + index * 0.8) + 1) / 2) * 0.16;
    const waveColor = blendHex(palette.product, activeAccent, accentMix);
    return blendHex(waveColor, palette.info, coolMix);
  });
}

export function getSelectedRowBackground(
  themeMode: string | null | undefined,
  palette: Palette,
  activeAccent: string,
): string {
  return themeMode === "light"
    ? blendHex("#ffffff", activeAccent, 0.12)
    : blendHex("#000000", activeAccent, 0.26);
}

function blendHex(from: string, to: string, amount: number): string {
  const mix = clamp(amount, 0, 1);
  const source = hexToRgb(from);
  const target = hexToRgb(to);

  const red = Math.round(source.r + (target.r - source.r) * mix);
  const green = Math.round(source.g + (target.g - source.g) * mix);
  const blue = Math.round(source.b + (target.b - source.b) * mix);

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}
