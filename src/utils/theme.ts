export type ThemeMode = 'light' | 'dark' | 'system';
export type DensityMode = 'comfortable' | 'compact';
export type WidthMode = 'standard' | 'wide';

export interface UIPreferences {
  theme: ThemeMode;
  density: DensityMode;
  width: WidthMode;
}

const UI_PREFS_KEY = 'clinical_shop_ui_prefs_v1';

export const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'system',
  density: 'comfortable',
  width: 'standard',
};

export function loadUIPreferences(): UIPreferences {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (raw) {
      return { ...DEFAULT_UI_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load UI preferences', e);
  }
  return DEFAULT_UI_PREFERENCES;
}

export function saveUIPreferences(prefs: UIPreferences): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save UI preferences', e);
  }
}

export function applyTheme(theme: ThemeMode): boolean {
  const root = document.documentElement;
  let isDark = false;

  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'light') {
    isDark = false;
  } else {
    // system
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  return isDark;
}
