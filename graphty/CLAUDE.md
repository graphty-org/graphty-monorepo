# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/graphty package.

## Project Overview

graphty is a React application that wraps `<graphty-element>` with a full-featured UI for graph visualization. It provides controls for styling, layout configuration, data viewing, and AI-powered graph manipulation.

**Key Technologies:**
- **React 19** with TypeScript
- **Mantine** UI framework
- **graphty-element** Web Component for graph rendering
- **Vite** build tool
- **Storybook** for component development

## Package Structure

```
graphty/
├── src/
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Entry point
│   ├── theme.ts              # Mantine theme configuration
│   ├── components/
│   │   ├── Graphty.tsx       # Main wrapper for graphty-element
│   │   ├── ai/               # AI chat and settings components
│   │   ├── data-view/        # Data grid and accordion views
│   │   ├── layout/           # TopMenuBar, modals
│   │   ├── layout-options/   # Layout configuration UI
│   │   ├── sidebar/          # Right sidebar panels
│   │   │   ├── controls/     # Reusable control components
│   │   │   ├── node-controls/ # Node styling controls
│   │   │   ├── edge-controls/ # Edge styling controls
│   │   │   └── panels/       # Sidebar panel components
│   │   └── demo/             # Demo components
│   ├── hooks/                # React hooks
│   ├── lib/                  # Utilities (Sentry integration)
│   ├── types/                # TypeScript type definitions
│   ├── constants/            # Color palettes, style defaults
│   ├── utils/                # Helper functions
│   └── stories/              # Storybook stories
└── index.html
```

## Essential Commands

```bash
# Development
npm run dev              # Start Vite dev server (port 9050)
npm run storybook        # Start Storybook (port 9035, requires SSL cert)

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run coverage         # Run with coverage
npm run coverage:preview # Serve coverage report on port 9054

# Linting
npm run lint             # ESLint + TypeScript check
npm run lint:fix         # Auto-fix lint issues

# Building
npm run build            # TypeScript + Vite build
npm run build-storybook  # Build Storybook

# Pre-commit
npm run ready:commit     # Build, lint, and test
```

## UI Framework

This project uses **Mantine** for all UI components. When building new UI:
- Use Mantine components (Button, Modal, TextInput, etc.)
- Follow Mantine theming conventions in `src/theme.ts`
- Use Mantine hooks for common patterns

## Mobile Development

When testing from mobile devices:
- **Always include eruda** in the UI for console access
- eruda is already integrated - ensure it remains available

## Component Patterns

### Sidebar Controls
Controls in `src/components/sidebar/controls/` are reusable across different panels:
- `StyleColorInput` - Color picker with label
- `StyleNumberInput` - Number input with constraints
- `StyleSelect` - Dropdown selection
- `ControlSection` - Collapsible section wrapper

### graphty-element Integration
The `Graphty.tsx` component wraps `<graphty-element>`:
- Passes configuration via attributes
- Handles events from the Web Component
- Manages React state for UI controls

## Testing

- Tests use **Vitest** with **Playwright** for browser testing
- Component tests are co-located with components in `__tests__/` directories
- Use `assert` instead of `expect` for assertions
- Store temporary files in `./tmp`

## Storybook

- Runs on port 9035 with HTTPS (requires SSL certificate)
- Stories are in `src/stories/`
- Visual regression via Chromatic

## graphty-element Feedback

If you encounter bugs or API difficulties with graphty-element while working on this app:
- Document the issue clearly
- Report it so the graphty-element package can be improved
- The graphty-element API should be intuitive and easy to use
