# Semantic Releases with Nx - Complete Guide

## Overview

Nx provides **Nx Release** as its built-in semantic release solution, which replaced the need for external semantic-release tools. However, you can still use traditional semantic-release with Nx if preferred.

## Option 1: Nx Release (Recommended)

### How It Works

Nx Release uses conventional commits to automatically determine version bumps:

```bash
# Commit messages determine versions
feat: add new feature     → 1.0.0 → 1.1.0 (minor)
fix: resolve bug         → 1.1.0 → 1.1.1 (patch)  
feat!: breaking change   → 1.1.1 → 2.0.0 (major)
```

### Basic Configuration

```json
// nx.json
{
  "release": {
    "version": {
      "conventionalCommits": true
    },
    "changelog": {
      "projectChangelogs": true
    }
  }
}
```

### Complete Workflow

#### 1. Development Phase
```bash
# Make changes
git add .
git commit -m "feat(algorithms): add PageRank algorithm"
git commit -m "fix(layout): correct edge calculations"
```

#### 2. Release Phase
```bash
# Dry run first
nx release --dry-run

# Actual release
nx release
```

This single command:
1. Analyzes commits since last release
2. Determines version bumps per package
3. Updates package.json files
4. Generates changelogs
5. Creates git tags
6. Publishes to npm (if configured)

### Independent vs Fixed Versioning

#### Independent (Each package versioned separately)
```json
{
  "release": {
    "projects": ["packages/*"],
    "projectsRelationship": "independent",
    "version": {
      "conventionalCommits": true
    }
  }
}
```

#### Fixed (All packages share version)
```json
{
  "release": {
    "projects": ["packages/*"],
    "projectsRelationship": "fixed",
    "version": {
      "conventionalCommits": true
    }
  }
}
```

### Advanced Configuration

#### Custom Commit Types
```json
{
  "release": {
    "conventionalCommits": {
      "types": {
        "feat": {
          "semverBump": "minor",
          "changelog": {
            "title": "🎸 Features",
            "hidden": false
          }
        },
        "fix": {
          "semverBump": "patch",
          "changelog": {
            "title": "🐛 Bug Fixes"
          }
        },
        "perf": {
          "semverBump": "patch",
          "changelog": {
            "title": "⚡ Performance"
          }
        },
        "docs": {
          "semverBump": "none",
          "changelog": {
            "title": "📖 Documentation",
            "hidden": false
          }
        },
        "deps": {
          "semverBump": "patch",
          "changelog": {
            "title": "📦 Dependencies"
          }
        }
      }
    }
  }
}
```

#### Scoped Commits for Monorepos
```bash
# Scope indicates which package is affected
feat(algorithms): add new clustering algorithm
fix(layout): resolve memory leak in force simulation
feat(graphty-element)!: change API for graph initialization
```

#### Dependency Bumping
```json
{
  "release": {
    "version": {
      "conventionalCommits": true,
      "generatorOptions": {
        "updateDependents": "auto"  // or "never"
      }
    }
  }
}
```

### GitHub Actions Integration

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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Important for commit history
          
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          registry-url: 'https://registry.npmjs.org'
          
      - run: npm ci
      - run: npx nx run-many -t build
      
      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          
      - name: Release
        run: npx nx release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Interactive Mode

For manual control:
```bash
# Prompts for version selection
nx release --interactive

# Skip certain phases
nx release --skip-publish
nx release --skip-changelog
```

## Option 2: Traditional semantic-release with Nx

If you prefer the original semantic-release:

### Setup
```bash
npm install -D semantic-release @semantic-release/changelog @semantic-release/git
```

### Configuration for Each Package
```json
// packages/algorithms/.releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    ["@semantic-release/git", {
      "assets": ["package.json", "CHANGELOG.md"]
    }]
  ],
  "tagFormat": "@graphty/algorithms-v${version}"
}
```

### Run with Nx
```json
// packages/algorithms/project.json
{
  "targets": {
    "semantic-release": {
      "executor": "nx:run-commands",
      "options": {
        "command": "semantic-release",
        "cwd": "packages/algorithms"
      }
    }
  }
}
```

### Execute
```bash
nx run algorithms:semantic-release
# or for all
nx run-many -t semantic-release
```

## Option 3: Nx Release with Manual Versioning

If you don't want conventional commits:

```json
{
  "release": {
    "version": {
      "conventionalCommits": false  // Manual version selection
    }
  }
}
```

Then:
```bash
nx release --interactive  # Prompts for version choices
```

## Comparison for Graphty

### Nx Release Advantages
- **Integrated**: No extra tools needed
- **Graph-aware**: Understands project dependencies
- **Simpler**: One tool instead of many plugins
- **Monorepo-native**: Built for multiple packages

### Traditional semantic-release Advantages
- **Familiar**: If team knows semantic-release
- **Plugins**: Extensive ecosystem
- **Control**: More granular configuration

### Recommended Approach for Graphty

Given your structure, use Nx Release with independent versioning:

```json
// nx.json
{
  "release": {
    "projects": [
      "@graphty/algorithms",
      "@graphty/layout",
      "@graphty/graphty-element",
      "gpu-3d-force-layout"
    ],
    "projectsRelationship": "independent",
    "version": {
      "conventionalCommits": true,
      "generatorOptions": {
        "updateDependents": "auto"
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
      "commitMessage": "chore(release): publish {projectName} v{version}",
      "tagMessage": "{projectName}@{version}"
    }
  },
  "targetDefaults": {
    "nx-release-publish": {
      "options": {
        "packageRoot": "dist/packages/{projectName}"
      }
    }
  }
}
```

## Migration Path from semantic-release

1. **Week 1**: Set up Nx workspace
```bash
npx nx@latest init
```

2. **Week 2**: Configure Nx Release
```bash
npx nx release --first-release --dry-run
```

3. **Week 3**: Test with parallel running
- Keep semantic-release
- Run Nx Release in dry-run mode
- Compare outputs

4. **Week 4**: Switch over
- Disable semantic-release
- Enable Nx Release in CI

## Best Practices

### 1. Commit Message Format
```bash
# Good - scoped to package
feat(algorithms): add graph partitioning
fix(layout): resolve force calculation bug

# Good - affects multiple packages  
feat(algorithms,layout): add clustering support

# Bad - no scope
feat: add new feature
```

### 2. Breaking Changes
```bash
# In commit message
feat(algorithms)!: rename all functions for consistency

# Or in body
feat(algorithms): update API

BREAKING CHANGE: Renamed runPageRank() to pagerank()
```

### 3. Dependency Updates
When algorithms updates, dependent packages auto-bump:
- algorithms: 1.2.0 → 1.3.0 (minor from feat)
- layout: 1.2.9 → 1.2.10 (patch from dependency)

## Troubleshooting

### "No changes detected"
- Check commit format: `feat:`, `fix:`, etc.
- Ensure commits are since last tag
- Verify `conventionalCommits: true`

### "Cannot find project"
- Check `release.projects` in nx.json
- Ensure project names match package.json

### Dependencies not updating
- Set `updateDependents: "auto"`
- Check dependency is in `dependencies` not `devDependencies`

## Summary

Nx Release provides a modern, monorepo-native semantic release solution that:
- Automatically versions from conventional commits
- Handles complex dependency graphs
- Generates changelogs per package
- Integrates with GitHub/npm
- Requires minimal configuration

It's the recommended approach for Nx monorepos in 2024, replacing the need for complex semantic-release plugin setups.