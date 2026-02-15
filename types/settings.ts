export const COLOR_THEME_IDS = [ 'light', 'dim', 'midnight', 'dark', 'seth' ] as const;
export type ColorThemeId = typeof COLOR_THEME_IDS[number];

export const TIME_FORMAT = [ 'relative', 'absolute' ] as const;
export type TimeFormat = typeof TIME_FORMAT[number];
