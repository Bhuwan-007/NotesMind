export const khadiIndigoTheme = {
  "--color-bg-primary": "#F3EDE1",
  "--color-bg-surface": "#FBF8F2",
  "--color-bg-muted": "#E6DDC9",
  "--color-primary": "#2E2A5C",
  "--color-primary-hover": "#221F45",
  "--color-primary-subtle": "#E3E1F0",
  "--color-accent": "#B5613D",
  "--color-accent-subtle": "#F3E2D8",
  "--color-ink": "#2A241F",
  "--color-ink-muted": "#6E645A",
  "--color-success": "#3D5A45",
  "--color-warning": "#B5613D",
  "--color-danger": "#8B2E1F",
  "--color-border": "#DCD0B8",
};

export type ThemeName = "khadi-indigo";
export const themes: Record<ThemeName, Record<string, string>> = {
  "khadi-indigo": khadiIndigoTheme,
};
