# Deployment Guide

## GitHub Pages Setup

This project uses a dual-build system to support both local development and GitHub Pages deployment.

### For GitHub Pages Deployment:

1. **Build the examples**:
   ```bash
   npm run build:examples
   ```
   This compiles TypeScript and copies `layout.js` to the `examples/` folder.

2. **Commit the built files**:
   ```bash
   git add examples/layout.js
   git commit -m "Update examples with latest layout.js"
   git push
   ```

3. **GitHub Pages will serve** the examples directly from the `examples/` folder.

### Local Development:

- **For development**: `npm run serve` or `npm run examples`
- **For testing**: Use any of the individual npm scripts
- **File watching**: `npm run dev` or `npm run watch`

### File Structure:

```
layout/
├── layout.ts              # Source TypeScript
├── dist/
│   └── layout.js          # Compiled for npm package
├── examples/
│   ├── layout.js          # Copy for GitHub Pages
│   ├── index.html         # Example index
│   ├── 3d-force-directed.html
│   └── ...other examples
└── package.json
```

### Notes:

- `examples/layout.js` is auto-generated and should not be edited directly
- The file is ignored in `.gitignore` for local development
- For GitHub Pages, you must commit this file manually before deployment
- All examples use `import ... from './layout.js'` for maximum compatibility

### GitHub Actions (Optional):

For automated deployment, you could add a GitHub Action that:
1. Runs `npm run build:examples`
2. Commits the updated `examples/layout.js`
3. Deploys to GitHub Pages

This ensures the examples are always in sync with the latest TypeScript source.