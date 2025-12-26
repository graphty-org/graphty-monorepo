# Semantic Release Strategy for Graphty Monorepo

## Executive Summary

After comprehensive research into semantic release strategies for monorepos, including Auto and Beachball which were initially overlooked, I recommend **Changesets** as the primary release management tool for Graphty. This recommendation stands even after evaluating these additional options, as Changesets offers the best balance of features, community support, and monorepo-specific design. Auto and Beachball are strong alternatives worth considering based on specific workflow preferences.

## The Core Challenge

Semantic-release was designed with a fundamental assumption: **one repository = one package**. This creates significant challenges for monorepos:

1. **Git Tag Conflicts**: Each package needs unique version tags, but semantic-release expects singular tags
2. **Dependency Cascades**: Changes in one package often require version bumps in dependent packages
3. **Independent Release Cycles**: Different packages may need different release schedules
4. **Commit Attribution**: Determining which commits affect which packages is complex

## Available Strategies

### 1. **Changesets** (Recommended)

**Overview**: A tool designed specifically for monorepo versioning and changelog management, created by Atlassian.

**How it Works**:
- Developers create "changeset" files describing their changes
- Version bumps are decoupled from commit messages
- Supports both fixed and independent versioning
- Handles internal dependency updates automatically

**Pros**:
- **Native monorepo support**: Built from the ground up for multi-package repos
- **Better developer experience**: Changes can be described separately from commits
- **Flexible versioning**: Not tied to commit message conventions
- **Review-friendly**: Version bumps can be reviewed in PRs before release
- **Active development**: Well-maintained with strong community adoption
- **Supports all package managers**: npm, yarn, pnpm

**Cons**:
- **Manual step required**: Developers must create changeset files
- **Different workflow**: Team needs to learn new process
- **Not fully automated**: Requires human decision for version bumps

**Implementation for Graphty**:
```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@graphty/graphty"]  // Private package
}
```

### 2. **multi-semantic-release** (Alternative)

**Overview**: A wrapper around semantic-release that coordinates releases across multiple packages.

**How it Works**:
- Analyzes all packages for changes
- Establishes version numbers for all packages first
- Updates cross-dependencies before publishing
- Uses synchronization points to coordinate releases

**Pros**:
- **Preserves semantic-release workflow**: Keeps commit-based versioning
- **Handles dependencies**: Automatically updates internal package versions
- **Proven solution**: Most mature semantic-release monorepo solution

**Cons**:
- **"Proof of concept" status**: Authors acknowledge fundamental instability
- **Complex configuration**: Requires careful setup for each package
- **Performance issues**: Can be slow with many packages
- **Git tag complexity**: Still struggles with tag management

**Implementation Example**:
```json
// package.json (root)
{
  "scripts": {
    "release": "multi-semantic-release"
  },
  "devDependencies": {
    "@qiwi/multi-semantic-release": "^7.0.0"
  }
}
```

### 3. **semantic-release-monorepo Plugin**

**Overview**: Plugin that extends semantic-release to work with monorepos by filtering commits per package.

**How it Works**:
- Assigns commits to packages based on changed files
- Uses namespaced tags: `<package-name>-<version>`
- Runs semantic-release for each package individually

**Pros**:
- Simple integration with existing semantic-release setup
- Maintains semantic-release conventions

**Cons**:
- Doesn't handle cross-dependencies
- Limited maintenance (last major update 2022)
- Can miss commits that affect multiple packages

### 4. **Lerna + semantic-release**

**Overview**: Uses Lerna for versioning with semantic-release plugins.

**Current State**: Since Nx acquired Lerna, the recommended approach is using Nx Release instead.

### 5. **Nx Release** (If migrating to Nx)

**Overview**: Built-in release management in Nx monorepos.

**Pros**:
- Integrated with Nx graph understanding
- Supports conventional commits
- Handles dependency updates automatically

**Cons**:
- Requires full Nx adoption
- Relatively new (2024)

### 6. **Auto** (by Intuit)

**Overview**: A tool that generates releases based on PR labels rather than commit messages.

**How it Works**:
- Contributors add labels to PRs (e.g., `major`, `minor`, `patch`)
- No need to enforce conventional commits
- Highly extensible plugin system
- Supports various package managers

**Pros**:
- **Simple PR-based workflow**: Uses labels instead of commit conventions
- **Plugin ecosystem**: Extensive plugins for npm, Docker, Chrome, Maven, etc.
- **Monorepo aware**: Built-in support for lerna monorepos
- **Flexible**: Can maintain multiple major versions simultaneously
- **No commit rewriting**: Changes happen at PR level

**Cons**:
- **Requires PR discipline**: Team must remember to label PRs correctly
- **Less automated**: Manual label application needed
- **Smaller community**: 3.2k GitHub stars vs Changesets' 12k+

**Implementation Example**:
```json
// .autorc
{
  "plugins": [
    "npm",
    ["conventional-commits", { "preset": "angular" }],
    "all-contributors"
  ],
  "shipit": {
    "noChangelog": false
  }
}
```

### 7. **Beachball** (by Microsoft)

**Overview**: Microsoft's semantic versioning tool designed for monorepos with change file system.

**How it Works**:
- Uses JSON change files to track changes
- Groups changes per branch for simplicity
- Optimized for large monorepos
- Change files reviewed in PRs

**Pros**:
- **Performance optimized**: Configurable concurrency for large repos
- **Change transparency**: JSON files visible in PR diffs
- **No commit history rewriting**: Changes tracked separately
- **Microsoft backing**: Used in Microsoft's own projects

**Cons**:
- **Smaller adoption**: 770 GitHub stars, 33k weekly downloads
- **Microsoft-centric**: Best for Microsoft ecosystem
- **Limited documentation**: Less community resources
- **JSON format**: More verbose than markdown changesets

**Implementation Example**:
```json
// beachball.config.js
{
  "groupChanges": true,
  "packages": ["packages/*"],
  "changelog": {
    "customRenderers": {
      "renderEntry": "./changelog-renderer.js"
    }
  }
}

## Versioning Strategies

### Independent Versioning (Recommended for Graphty)

Each package maintains its own version number independently.

**Why for Graphty**:
- `@graphty/algorithms` (v1.2.0) has different release cycle than `@graphty/graphty-element` (v1.0.4)
- Packages serve different purposes with different stability levels
- Allows focused, meaningful version numbers per package

**Configuration**:
```json
// With changesets
{
  "fixed": [],  // Empty = independent
  "linked": []  // Can link packages that should version together
}
```

### Fixed/Locked Versioning

All packages share the same version number.

**When to Use**:
- Tightly coupled packages
- Consistent API surface
- Examples: Babel, Angular

**Not recommended for Graphty** due to diverse package purposes.

## Dependency Update Strategies

### With Changesets
```json
{
  "updateInternalDependencies": "patch"  // or "minor"
}
```
- `patch`: Dependency updates trigger patch version bumps
- `minor`: Dependency updates trigger minor version bumps

### With multi-semantic-release
- Automatically handles dependency updates
- Uses `*` in development, writes exact versions at release time

## Real-World Examples

### Projects Using Changesets
- Turborepo
- Astro
- Remix
- Chakra UI
- Atlassian projects

### Projects Using Auto
- Intuit projects
- Apollo GraphQL
- Various open source libraries

### Projects Using Beachball
- Microsoft projects (Office UI Fabric, Fluent UI)
- Azure SDK
- React Native Windows

### Projects Using Custom semantic-release
- Very few major projects due to complexity
- Most have migrated to alternatives

### Projects Using Fixed Versioning
- Babel (custom tooling)
- Angular (Nx Release)
- React (custom tooling)

## Migration Path from Current Setup

### Option 1: Changesets (Recommended)

**Week 1: Setup**
```bash
npm install -D @changesets/cli
npx changeset init
```

**Week 2: Configuration**
- Configure independent versioning
- Set up GitHub Actions
- Train team on changeset workflow

**Week 3: Migration**
- Remove semantic-release configs
- Update CI/CD pipelines
- Test release process

### Option 2: multi-semantic-release

**Week 1: Installation**
```bash
npm install -D @qiwi/multi-semantic-release
```

**Week 2: Configuration**
- Keep existing semantic-release configs
- Add multi-semantic-release wrapper
- Configure dependency handling

## CI/CD Integration

### Changesets GitHub Action
```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
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

### multi-semantic-release Setup
```yaml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Decision Matrix

| Criteria | Changesets | Auto | Beachball | multi-semantic-release | semantic-release-monorepo |
|----------|------------|------|-----------|------------------------|---------------------------|
| Monorepo Design | ✅ Native | ✅ Native | ✅ Native | ⚠️ Wrapper | ⚠️ Plugin |
| Dependency Handling | ✅ Automatic | ✅ Automatic | ✅ Automatic | ✅ Automatic | ❌ Manual |
| Developer Experience | ✅ Excellent | ✅ Good | ⚠️ Good | ⚠️ Complex | ⚠️ Limited |
| Maintenance | ✅ Active | ✅ Active | ✅ Active | ⚠️ Moderate | ❌ Stale |
| Performance | ✅ Fast | ✅ Fast | ✅ Optimized | ⚠️ Slow (20+ packages) | ✅ Fast |
| Flexibility | ✅ High | ✅ High | ⚠️ Medium | ⚠️ Medium | ❌ Low |
| Learning Curve | ⚠️ New workflow | ✅ Simple | ⚠️ New workflow | ✅ Familiar | ✅ Familiar |
| Community | ✅ 1.4M weekly | ⚠️ Smaller | ❌ 33k weekly | ⚠️ Moderate | ❌ Limited |
| Workflow Type | Change files | PR labels | JSON files | Commits | Commits |

## Recommendation for Graphty

**Primary Choice: Changesets**

**Rationale**:
1. **Designed for monorepos**: Purpose-built for multi-package repositories
2. **Best community support**: 1.4M weekly downloads, used by Turborepo, Astro, Remix
3. **Developer experience**: Change descriptions separate from commits improve code review
4. **Handles complexity**: Robust dependency management for Graphty's 5 interconnected packages
5. **Future-proof**: Most active development and ecosystem adoption

**Strong Alternatives**:

**Auto** - Consider if you prefer:
- PR label-based workflow over change files
- No enforcement of commit conventions
- Extensive plugin ecosystem
- Simpler learning curve

**Beachball** - Consider if you have:
- Very large monorepo with performance concerns
- Preference for JSON configuration
- Microsoft ecosystem alignment
- Need for grouped change management

**If you must use semantic-release**: Choose multi-semantic-release, but be aware of its limitations and "proof of concept" status.

## Implementation Checklist

- [ ] Choose release strategy (Changesets recommended)
- [ ] Decide on versioning strategy (Independent recommended)
- [ ] Configure dependency update strategy
- [ ] Set up CI/CD pipeline
- [ ] Document workflow for team
- [ ] Create migration plan from current setup
- [ ] Test with dry runs
- [ ] Train team on new workflow
- [ ] Implement automated checks (e.g., require changesets in PRs)
- [ ] Monitor and adjust based on team feedback

## Conclusion

While semantic-release is excellent for single-package repositories, its fundamental design makes it poorly suited for monorepos. After evaluating seven different approaches, including Auto and Beachball which offer compelling alternatives, Changesets emerges as the most balanced solution for Graphty. It combines native monorepo design, strong community support, and excellent developer experience.

The choice ultimately depends on your team's workflow preferences:
- **Changesets**: Best overall for most monorepos
- **Auto**: Best for teams preferring PR-based workflows
- **Beachball**: Best for large-scale enterprise monorepos
- **multi-semantic-release**: Best if committed to semantic-release ecosystem

All three native monorepo tools (Changesets, Auto, Beachball) would serve Graphty well, with the final choice coming down to workflow preference and ecosystem alignment.

---

## Post-Analysis Update: Final Decision

> **Decision Made**: We chose **Nx Release** over Changesets.
>
> **Reason**: We want to continue using conventional commits. Our team has established discipline around conventional commit messages (`feat:`, `fix:`, `feat!:`, etc.) and we prefer to preserve this workflow rather than adopt a change file-based approach.
>
> While this document recommended Changesets as the primary choice, the final decision prioritized workflow continuity with our existing conventional commits practice. Nx Release provides the same developer experience as semantic-release but with proper monorepo support.
>
> See the full decision record in `monorepo-design.md` under "Decision Record: Nx Release vs Changesets".