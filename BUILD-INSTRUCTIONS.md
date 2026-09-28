# DEZIGLO SOFT Cricket Broadcast - Windows EXE Build

## Requirements
- Node.js LTS
- Windows 10/11
- npm install

## Build
1. Open Command Prompt in this folder.
2. Run: npm install
3. Run: npm run build:exe
4. Installer output will be in the `release` folder.

Branding:
- `build-assets/deziglo-logo.ico`: setup, shortcut, and application icon.
- `public/logo.png`: application header logo.
- `public/favicon.png` / `public/favicon.ico`: browser/favicon branding.

## Dependency and production-startup fixes
- esbuild is pinned to a Vite 8-compatible version range (`^0.28.2`).
- Vite is loaded only in development mode, so the packaged production server does not require Vite at runtime.

If npm reports a stale dependency tree, run:
```cmd
rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm install
```


IMPORTANT: The server build bundles runtime dependencies so the packaged app does not require a separate node_modules folder.


## Windows Snap / Split-screen fix
The Electron window is intentionally resizable with a 640px minimum width so Windows 10 can snap the application to a left/right half of the screen. Use the title bar drag, Windows+Left Arrow, or Windows+Right Arrow.
