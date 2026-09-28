# DEZIGLO SOFT Cricket Broadcast – Real-Time Sync Fix

## Main fixes
- WebSocket is now the primary state transport.
- The same scoring event is no longer sent through WebSocket and HTTP simultaneously.
- Removed the 200 ms polling loop; fallback polling is 2 seconds and only runs when WebSocket is unavailable.
- Added WebSocket heartbeat/ping so phones on Wi-Fi do not silently lose the connection.
- Added `/api/connect-info` to detect the PC's private LAN IPv4 address.
- Mobile QR/link now uses the LAN address instead of the packaged app's `127.0.0.1` address.
- OBS on the same PC continues to use the local URL for best reliability.
- Disabled WebSocket per-message compression to reduce CPU spikes for live scoring payloads.

## Network requirement
The PC and phone must be connected to the same Wi-Fi/LAN. Windows Firewall must allow the app/server on TCP port 3000 for remote phone access.
