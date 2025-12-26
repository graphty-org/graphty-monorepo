# Nx Automatic Releases with GitHub Actions

## Complete GitHub Action Workflow

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write # To push release commit and tags
      pull-requests: write # To create release PR (optional)
      id-token: write # For npm provenance
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Critical for conventional commits analysis
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npx nx run-many -t build

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Release
        run: npx nx release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }} # Optional
```

## Nx Configuration for Automated Releases

```json
// nx.json
{
  "release": {
    "projects": ["packages/*"],
    "projectsRelationship": "independent",
    "version": {
      "conventionalCommits": true,
      "generatorOptions": {
        "updateDependents": "auto",
        "skipLockFileUpdate": false
      }
    },
    "changelog": {
      "projectChangelogs": {
        "createRelease": "github",
        "renderOptions": {
          "authors": true,
          "commitReferences": true,
          "versionTitleDate": true
        }
      }
    },
    "git": {
      "commit": true,
      "tag": true,
      "push": true,
      "commitMessage": "chore(release): publish",
      "commitArgs": "--no-verify", // Skip pre-commit hooks
      "tagMessage": "Release {version}",
      "tagArgs": "--no-verify"
    }
  },
  "targetDefaults": {
    "nx-release-publish": {
      "options": {
        "packageRoot": "dist/{projectRoot}"
      }
    }
  }
}
```

## NPM Token Setup

### 1. Generate NPM Token
```bash
# Login to npm
npm login

# Generate automation token
npm token create --read-only=false --cidr=0.0.0.0/0
```

### 2. Add to GitHub Secrets
1. Go to Settings → Secrets → Actions
2. Add `NPM_TOKEN` with your token value

## Advanced Workflows

### Option 1: PR-Based Releases (Recommended)

This creates a PR for version bumps that you can review:

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      - name: Check for releasable changes
        id: check
        run: |
          npx nx release --dry-run > release-plan.txt
          if grep -q "No changes were detected" release-plan.txt; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Create Release PR
        if: steps.check.outputs.has_changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore(release): version packages'
          title: 'chore(release): version packages'
          body: |
            This PR was auto-generated to version and release packages.
            
            ```
            $(cat release-plan.txt)
            ```
          branch: release/auto
          delete-branch: true
```

### Option 2: Direct Release (Fully Automated)

```yaml
name: Release

on:
  push:
    branches:
      - main
  workflow_dispatch: # Manual trigger option

jobs:
  release:
    runs-on: ubuntu-latest
    # Prevent multiple releases running at once
    concurrency:
      group: ${{ github.workflow }}-${{ github.ref }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npx nx run-many -t build

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Release
        run: |
          npx nx release --yes --verbose
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Option 3: Scheduled Releases

```yaml
name: Scheduled Release

on:
  schedule:
    - cron: '0 10 * * 1' # Every Monday at 10 AM
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      # Same as above
```

## Handling Edge Cases

### Skip CI Loops

To prevent infinite CI loops:

```json
// nx.json
{
  "release": {
    "git": {
      "commitMessage": "chore(release): publish [skip ci]"
    }
  }
}
```

### Dry Run First

For safety, you can add a dry run job:

```yaml
jobs:
  dry-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx nx release --dry-run

  release:
    needs: dry-run
    runs-on: ubuntu-latest
    # ... rest of release job
```

### Publishing from dist folder

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["{options.outputPath}"]
    },
    "nx-release-publish": {
      "dependsOn": ["build"],
      "options": {
        "packageRoot": "dist/{projectRoot}"
      }
    }
  }
}
```

## Security Best Practices

### 1. Use Fine-grained Personal Access Token

Instead of `GITHUB_TOKEN`, create a PAT:

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.RELEASE_PAT }}
```

### 2. Restrict Who Can Trigger

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      dry-run:
        description: 'Perform a dry run'
        required: false
        default: false
        type: boolean

jobs:
  release:
    if: github.actor == 'username' || github.event_name == 'push'
```

### 3. Environment Protection

```yaml
jobs:
  release:
    environment: production
    # Requires approval for production environment
```

## Debugging

### Enable Verbose Logging

```yaml
- name: Release with debugging
  run: |
    npx nx release --verbose
  env:
    NX_VERBOSE_LOGGING: true
```

### Check What Will Happen

```yaml
- name: Preview changes
  run: |
    echo "::group::Conventional Commits"
    git log --oneline --pretty=format:"%s" origin/main..HEAD
    echo "::endgroup::"
    
    echo "::group::Release Plan"
    npx nx release --dry-run
    echo "::endgroup::"
```

## For Graphty Specifically

```yaml
name: Release Graphty Packages

on:
  push:
    branches:
      - main
    paths:
      - 'packages/**'
      - '!packages/**/**.md'
      - '!packages/**/**.spec.ts'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write # For npm provenance
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - name: Cache
        uses: actions/cache@v3
        with:
          path: |
            node_modules
            ~/.cache/Cypress
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - run: npm ci
      - run: npm run build:packages

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Version and Release
        run: npx nx release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Monitoring Releases

Add status badges to your README:

```markdown
[![Release](https://github.com/graphty-org/graphty/actions/workflows/release.yml/badge.svg)](https://github.com/graphty-org/graphty/actions/workflows/release.yml)
```

## Summary

Yes, Nx can fully automate releases in GitHub Actions! The key requirements:

1. **Fetch full history**: `fetch-depth: 0`
2. **Configure Git identity**: For commits/tags
3. **Set environment tokens**: `GITHUB_TOKEN` and `NODE_AUTH_TOKEN`
4. **Run nx release**: With appropriate flags

The automation level is configurable - from fully automatic on every push to PR-based workflows with manual approval.