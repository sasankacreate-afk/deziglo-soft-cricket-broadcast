# DEZIGLO SOFT Cricket Broadcast v1.0.2 — YouTube Sound Fix

- YouTube advertisement embeds now use `autoplay=1` and `mute=0`.
- Existing YouTube watch, youtu.be, Shorts, and embed URLs are normalized to the sound-enabled embed URL.
- Electron Chromium autoplay policy is configured to permit audible autoplay.
- The ad configuration now sets `customAdVideoMuted: false`.
- N4/N6 and FREE HIT fixes from v1.0.1 are preserved.
- App version is now `1.0.2`.

Note: This applies to the YouTube advertisement iframe. Browser/YouTube policies can still affect playback in non-Electron web previews, but the packaged Electron app is configured for audible autoplay.
