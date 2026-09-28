# DEZIGLO SOFT Cricket Broadcast — Selective Remix v11

## Base application
The entire application remains based on `DEZIGLO_SOFT_Cricket_Broadcast_SplitScreen_Fixed_v6`.
The v6 UI/theme, scoring console, overlay system, squads, points/fixtures, tournament stats, scorecards, settings, realtime/mobile architecture, Electron window behavior and Windows Snap behavior are retained.

## What was remixed from 2.zip
Only functionality that was not already represented in v6 was integrated into the existing v6 screens — no separate "2.zip" tab was created.

### Existing v6 Broadcast tab now also includes
- Broadcast Studio controls
- Sponsor/ticker text
- Image/video advertising
- YouTube advertising (watch, youtu.be, Shorts and embed URLs)
- Broadcast scene shortcuts
- Manual FOUR / SIX / WICKET highlight banner triggers
- Timeout trigger

These controls are embedded in the existing `BroadcastController` and use the v6 visual language.

### Existing v6 Points & Fixtures tab now also includes
- Rename/delete group controls
- Create-next-stage workflow using qualified teams

These are integrated into the existing v6 tournament workflow rather than adding a new tab.

## Cricket scoring corrections
### Retired Hurt
`Hurt Retired` is now treated as an injury/retirement event, not a wicket:
- innings wicket count is unchanged
- fall of wickets is unchanged
- bowler wicket count is unchanged
- batter remains `not out`
- broadcast wicket animation is not triggered
- it is displayed as `RH` / Retired Hurt where appropriate

### Wicket deliveries are not dot balls
A delivery containing any dismissal is excluded from dot-ball statistics, even if runs scored are zero. This applies to:
- tournament total dots
- batter dot-ball count
- bowler dot-ball count
- dot milestone trigger

A real legal zero-run delivery without a dismissal remains a dot ball.

## Branding
The original `assets/Deziglo_New.png` from the supplied second source is used for the v6 application header/logo and Windows build icon source.
