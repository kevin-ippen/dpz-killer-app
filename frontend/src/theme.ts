/**
 * Unified UI Theme System
 *
 * Supports multiple clients (Domino's, Wyndham, etc.) with a single codebase.
 * Themes are applied via CSS variables for instant switching.
 */

export interface AppTheme {
  id: string;
  name: string;
  logoGlyph: string;
  colors: {
    accent: string;
    accentSoft: string;
    accentStrong: string;
    accentBorder: string;
  };
}

export const themes: Record<string, AppTheme> = {
  default: {
    id: "default",
    name: "Lakehouse AI",
    logoGlyph: "🧱",
    colors: {
      accent: "#3b82f6",
      accentSoft: "rgba(59, 130, 246, 0.15)",
      accentStrong: "#2563eb",
      accentBorder: "rgba(59, 130, 246, 0.6)",
    },
  },
  dominos: {
    id: "dominos",
    name: "Domino's Insight Studio",
    logoGlyph: "🍕",
    colors: {
      accent: "#006491",
      accentSoft: "rgba(0, 100, 145, 0.18)",
      accentStrong: "#E31837",
      accentBorder: "rgba(0, 100, 145, 0.6)",
    },
  },
  wyndham: {
    id: "wyndham",
    name: "Wyndham AI Console",
    logoGlyph: "🏨",
    colors: {
      accent: "#0071C5",
      accentSoft: "rgba(0, 113, 197, 0.18)",
      accentStrong: "#00B5E2",
      accentBorder: "rgba(0, 113, 197, 0.6)",
    },
  },
};

/**
 * Apply theme by setting CSS custom properties
 */
export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;

  // Apply color variables
  root.style.setProperty("--color-accent", theme.colors.accent);
  root.style.setProperty("--color-accent-soft", theme.colors.accentSoft);
  root.style.setProperty("--color-accent-strong", theme.colors.accentStrong);
  root.style.setProperty("--color-accent-border", theme.colors.accentBorder);

  // Store theme ID for component logic
  root.setAttribute("data-theme", theme.id);
}

/**
 * Detect theme from environment or URL
 */
export function detectTheme(): AppTheme {
  // Check URL parameter first (for development)
  const urlParams = new URLSearchParams(window.location.search);
  const themeParam = urlParams.get("theme");
  if (themeParam && themes[themeParam]) {
    return themes[themeParam];
  }

  // Check hostname for production detection
  const hostname = window.location.hostname;
  if (hostname.includes("dominos") || hostname.includes("dpz")) {
    return themes.dominos;
  }
  if (hostname.includes("wyndham")) {
    return themes.wyndham;
  }

  // Default theme
  return themes.default;
}
