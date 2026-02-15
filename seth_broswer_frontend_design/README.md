# Seth Browser Frontend Design

Static UI prototype (Tailwind + Vite) for the Seth Explorer. The design has been merged into the main Blockscout frontend.

## Design tokens (merged)

- **Background:** `#040608` (seth-bg)
- **Card:** `#0a1014` (seth-card)
- **Border:** `#15222b` (seth-border)
- **Primary / accent:** `#00FFA3`, `#00CC83` (seth-primary, seth-accent)
- **Effects:** Dark body, radial green/emerald glows, glass panels, neon nav highlight

## Using Seth theme in the app

1. **Color theme**  
   Set default theme to Seth so the app uses the dark Seth background and tokens:
   - `NEXT_PUBLIC_COLOR_THEME_DEFAULT=seth`

2. **Logo**  
   Use the Seth logo in the header/nav:
   - `NEXT_PUBLIC_NETWORK_LOGO=/assets/seth-logo.png`  
   (Logo file is at `public/assets/seth-logo.png`.)

3. **Optional: full green accent**  
   To match the prototype’s green links/buttons, override theme colors via JSON:
   - `NEXT_PUBLIC_COLOR_THEME_OVERRIDES` — e.g. set `theme.link.primary._dark.value` to `#00FFA3` and other semantic tokens as needed. See `toolkit/theme/foundations/colors.ts` for the `theme` structure and `colors.seth` for token names.

When the Seth theme is active, the app sets `data-color-theme="seth"` on the document and applies the Seth body background (with radial gradients) and scrollbar styling via `toolkit/theme/globalCss.ts`.
