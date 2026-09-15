# Almost Twenty-One

A private fake-credit blackjack game with occasional absurd dealer outcomes.

Live: https://mpurgailis.github.io/almost-twenty-one/

## Component provenance

Genuine Kobra Systems components (public free registry, https://kobra.systems/r/),
vendored unmodified into `src/`:

- `components/ui/command-menu.tsx` (+ `lib/command-filter.ts`) - the Cmd/Ctrl-K table console (deal, hit, stand, double-ish, rules, sound, fresh table).
- `components/ui/navigation-menu.tsx` - the header navigation.
- `components/ui/toast.tsx` (+ `lib/smoky-dissolve.ts`) - outcome and dealer-betrayal notifications.
- `components/ui/halftone-dots.tsx` - the interactive halftone felt backdrop (renders `public/felt.svg`).
- `components/ui/sound.tsx` - the synthesized UI sound system and mute toggle.

Kobra's form primitives (button, slider, dialog, table, etc.) are part of its paid
library and require a registry token, so those roles are filled by shadcn
components supporting the Kobra surfaces: accordion, alert, badge, button, card,
dialog, input, kbd, progress, scroll-area, separator, slider, table, toggle-group.

Two small shadcn-side support shims keep the genuine Kobra toast unmodified
(`alert.tsx` exports `ALERT_MARKS`/`AlertTone`; `spinner.tsx` exports
`StatusBadge`) because their Kobra siblings are paid-only.

## Money

House credits only. No deposits, purchases, prizes, cash-out, or real-value wagering.
