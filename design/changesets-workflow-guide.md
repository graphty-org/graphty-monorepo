# Changesets Release Workflow - Step by Step Guide

## Overview

Changesets separates the release process into distinct phases:
1. **Development**: Make changes and create changesets
2. **Version**: Update package versions and changelogs
3. **Publish**: Release packages to npm

## Initial Setup (One Time)

### 1. Install Changesets
```bash
# In your monorepo root
npm install -D @changesets/cli
```

### 2. Initialize Changesets
```bash
npx changeset init
```

This creates `.changeset/` directory with:
- `config.json` - Configuration file
- `README.md` - Instructions for your team

### 3. Configure for Graphty
```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@graphty/graphty"],  // Private package
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true
  }
}
```

## Development Workflow

### Step 1: Make Your Code Changes

```bash
# Create a feature branch
git checkout -b feature/add-new-algorithm

# Make your changes
# Edit files in packages/algorithms/src/...
```

### Step 2: Create a Changeset

```bash
# Run the changeset command
npx changeset
```

You'll see an interactive prompt:

```
🦋  Which packages would you like to include? · @graphty/algorithms
🦋  Which packages should have a major bump? · No items were selected
🦋  Which packages should have a minor bump? · @graphty/algorithms
🦋  Please enter a summary for this change (this will be in the changelogs).
🦋  (submit empty line to open external editor)
🦋  Summary · Added new PageRank algorithm with customizable damping factor
```

This creates a file like `.changeset/fluffy-pandas-dance.md`:

```markdown
---
"@graphty/algorithms": minor
---

Added new PageRank algorithm with customizable damping factor
```

### Step 3: Commit Everything

```bash
# Add your code changes AND the changeset file
git add .
git commit -m "feat: add PageRank algorithm"
git push origin feature/add-new-algorithm
```

### Step 4: Create Pull Request

The PR now contains:
- Your code changes
- The changeset file describing the version bump

**Important**: Reviewers can see and comment on the changeset file!

## Multiple Package Changes

If your change affects multiple packages:

```bash
npx changeset
```

```
🦋  Which packages would you like to include? · @graphty/algorithms, @graphty/layout
🦋  Which packages should have a major bump? · No items were selected
🦋  Which packages should have a minor bump? · @graphty/algorithms
🦋  Which packages should have a patch bump? · @graphty/layout
```

Creates:
```markdown
---
"@graphty/algorithms": minor
"@graphty/layout": patch
---

Added new PageRank algorithm with customizable damping factor
- algorithms: New PageRank implementation
- layout: Updated to use new PageRank for force-directed layouts
```

## Release Process (Usually CI/CD)

### Step 5: Version Packages (After PR Merge)

```bash
# This is typically run in CI after merging to main
npx changeset version
```

This command:
1. Reads all changeset files in `.changeset/`
2. Updates `package.json` versions:
   - `@graphty/algorithms`: 1.2.0 → 1.3.0
   - `@graphty/layout`: 1.2.9 → 1.2.10
3. Updates `CHANGELOG.md` files in each package
4. Updates internal dependencies
5. Deletes consumed changeset files

### Step 6: Review and Commit Version Changes

```bash
# Review the changes
git diff

# You'll see:
# - Updated package.json files with new versions
# - Updated CHANGELOG.md files
# - Deleted changeset files
# - Updated dependencies between packages

git add .
git commit -m "Version Packages"
git push
```

### Step 7: Publish to npm

```bash
# Build all packages first
npm run build

# Publish changed packages
npx changeset publish
```

This command:
1. Publishes only packages that have changed
2. Respects the `access` config (public/restricted)
3. Creates git tags for each package release

### Step 8: Push Tags

```bash
git push --follow-tags
```

## CI/CD Automation with GitHub Actions

### Basic Workflow
```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### What the GitHub Action Does

1. **When changesets exist**: Creates/updates a "Version Packages" PR
   - This PR contains all version bumps and changelog updates
   - Review this PR before merging
   
2. **When no changesets exist** (after merging version PR): Publishes to npm

## Common Scenarios

### Hotfix Release
```bash
# Make fix
git checkout -b hotfix/critical-bug

# Create changeset marking as patch
npx changeset
# Select: patch bump

# Commit and merge quickly
```

### Breaking Change
```bash
npx changeset
# Select: major bump
```

```markdown
---
"@graphty/algorithms": major
---

BREAKING CHANGE: Renamed `runPageRank()` to `pagerank()` for consistency

Migration guide:
- Change `runPageRank(graph)` to `pagerank(graph)`
- Parameters remain the same
```

### Pre-release (Beta/Alpha)
```bash
# Enter pre-release mode
npx changeset pre enter beta

# Now all versions will be beta
npx changeset version  # Creates 2.0.0-beta.0

# Exit pre-release mode
npx changeset pre exit
```

### Dependent Package Updates

If `@graphty/layout` depends on `@graphty/algorithms`:

```json
// When algorithms gets minor bump (1.2.0 → 1.3.0)
// And updateInternalDependencies: "patch"
// Then layout automatically gets patch bump (1.2.9 → 1.2.10)
// Even if layout had no direct changes
```

## Best Practices

### 1. Changeset Descriptions
Write changesets for users, not developers:
```markdown
❌ Bad: "Updated PageRank implementation"
✅ Good: "Added PageRank algorithm with customizable damping factor"
```

### 2. Group Related Changes
One changeset can cover multiple packages:
```markdown
---
"@graphty/algorithms": minor
"@graphty/layout": minor
"@graphty/graphty-element": patch
---

Added new clustering algorithms suite
- algorithms: New k-means and hierarchical clustering
- layout: New cluster-based layout algorithm
- graphty-element: Fixed cluster visualization bug
```

### 3. Require Changesets in PRs
Add a GitHub Action to enforce:
```yaml
name: Changeset Check

on: pull_request

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx changeset status --since=origin/main
```

### 4. Versioning Strategy for Graphty

Given your packages:
- `@graphty/algorithms` (1.2.0) - Library
- `@graphty/layout` (1.2.9) - Library  
- `@graphty/graphty-element` (1.0.4) - Web Component
- `@graphty/graphty` - Private app
- `gpu-3d-force-layout` (1.0.0) - Experimental

Configure `updateInternalDependencies: "patch"` so:
- Library changes bump dependents as patches
- Breaking changes cascade appropriately
- Private packages are ignored

## Troubleshooting

### "No changesets found"
- Did you forget to run `npx changeset`?
- Check `.changeset/` directory for `.md` files

### "Package version already exists"
- Someone else released while you were working
- Pull latest, run `npx changeset version` again

### Dependencies not updating
- Check `updateInternalDependencies` config
- Ensure packages are listed in `dependencies` not `devDependencies`

## Summary

The Changesets workflow:
1. **Develop**: Make changes, create changeset file
2. **Review**: PR includes changeset for transparency
3. **Version**: CI creates version PR after merge
4. **Publish**: CI publishes after version PR merges

This two-PR approach (feature PR + version PR) ensures:
- Version changes are reviewed
- Changelog entries can be edited
- No accidental publishes
- Clear audit trail