# Graphty - Graph Visualization Tool

A React TypeScript application providing a user-friendly interface for graph visualization and exploration, built on top of the powerful `graphty-element` web component.

## Features

- Interactive graph visualization
- Multiple layout algorithms (Force-directed, Circular, etc.)
- Rich styling and theming options
- 2D/3D visualization modes
- Export and import capabilities

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run Storybook
npm run storybook
```

### Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run Vitest tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook

## Architecture

The application is structured as follows:

- `/src/components` - React components
- `/src/hooks` - Custom React hooks
- `/src/utils` - Utility functions
- `/src/stories` - Storybook stories
- `/src/test` - Test setup and utilities

## Working with graphty-element

This project wraps the `graphty-element` web component. During development, it references the local graphty-element project at `../graphty-element`.

When graphty-element is published to npm, update the import in:

- `package.json` - Add as dependency
- `vite.config.ts` - Remove alias
- `tsconfig.json` - Remove path mapping
- `src/components/Graphty.tsx` - Update import path

## Contributing

This project uses:

- ESLint for code linting
- Prettier formatting (via ESLint)
- Conventional commits with commitlint
- Husky for git hooks

Please ensure all tests pass and linting is clean before submitting PRs.
