# DEZIGLO SOFT Cricket Broadcast — v6 Selective Remix

This build keeps the `DEZIGLO_SOFT_Cricket_Broadcast_SplitScreen_Fixed_v6` application as the base and selectively remixes missing functionality from the second cricket broadcast source.

There is no separate tab for the second application. Added capabilities are integrated into the existing v6 Broadcast and Points/Fixtures screens.

## Build on Windows

```cmd
npm install
npm run build:exe
```

The Electron build output is written to the configured release directory.

See `SELECTIVE-REMIX-v11.md` for the exact merge scope and cricket scoring corrections.

## v1.0.2 Update System

This release is configured for GitHub-based Electron updates using `electron-updater` with repository `sasankacreate-afk/deziglo-soft-cricket-broadcast`. See `GITHUB-UPDATER-SETUP-v1.0.2.md` for release setup.
