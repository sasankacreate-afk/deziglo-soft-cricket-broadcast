# DEZIGLO SOFT Cricket Broadcast — v1.0.1 Bug Fixes

## Fixed

1. No-ball + 4 is displayed as **N4** instead of **NB+4 / 4**.
2. No-ball + 6 is displayed as **N6** instead of **NB+6 / 6**.
3. A no-ball now triggers a broadcast popup showing **FREE HIT!**.
4. The FREE HIT popup also shows **N4** or **N6** when the no-ball itself contains a boundary.
5. The existing wicket / normal 4 / normal 6 popup behavior remains unchanged.

## Important scoring behavior

The scorer still records a no-ball as:
- 1 extra no-ball run
- batter runs separately
- no legal ball
- batter boundary statistics preserved for a batter-hit 4 or 6

The overlay presentation is changed only to make the broadcast notation clearer.
