# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/compact-mantine package:
compact size variants of Mantine UI components and the shared Mantine theme, for dense UIs. The
graphty app builds its controls from this package.

## UI Components

- Use the default components. Never write a bespoke control to work around one
- If a shared component is wrong, fix the shared component, so every caller gets the fix
- Example (2026-09-13): the app shell's lock button grew a custom contrast ring because
  Mantine's `light` active state measured 1.21:1 against the panel header where WCAG 1.4.11
  asks 3:1. The ring left one control in the app behaving unlike every other toggle. The fix
  belonged in `compact-mantine`'s ActionIcon theme, and once it was there the local ring was
  deleted
