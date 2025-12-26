# How Changesets Generates CHANGELOG.md

## Overview

Changesets automatically generates and maintains CHANGELOG.md files for each package when you run `npx changeset version`. It aggregates all changeset files and formats them into a proper changelog.

## The Generation Process

### 1. Changeset Files → Changelog Entries

When you create changesets during development:

```markdown
<!-- .changeset/brave-lions-jump.md -->
---
"@graphty/algorithms": minor
---

Added new PageRank algorithm with customizable damping factor
```

```markdown
<!-- .changeset/silly-pandas-dance.md -->
---
"@graphty/algorithms": patch
"@graphty/layout": patch
---

Fixed edge weight calculations in shortest path algorithms
```

### 2. Running `changeset version`

This command:
1. Reads all changeset files
2. Groups them by package
3. Determines the highest version bump needed
4. Generates/updates CHANGELOG.md for each package
5. Deletes the consumed changeset files

### 3. Generated CHANGELOG.md

```markdown
# @graphty/algorithms

## 1.3.0

### Minor Changes

- Added new PageRank algorithm with customizable damping factor

### Patch Changes

- Fixed edge weight calculations in shortest path algorithms

## 1.2.0

### Minor Changes

- Added Bellman-Ford algorithm for negative edge weights
- Implemented A* pathfinding with heuristic support

### Patch Changes

- Updated dependencies
```

## Changelog Formatting

### Default Format

The default changelog generator (`@changesets/cli/changelog`) produces:

```markdown
# Package Name

## Version Number

### Major Changes

- Breaking change description

### Minor Changes

- New feature description

### Patch Changes

- Bug fix description
- Updated dependencies
  - @graphty/types@1.0.2
```

### With Commit Links (GitHub)

Using `@changesets/changelog-github`:

```json
// .changeset/config.json
{
  "changelog": ["@changesets/changelog-github", { "repo": "graphty-org/graphty" }]
}
```

Produces:

```markdown
## 1.3.0

### Minor Changes

- [`a1b2c3d`](https://github.com/graphty-org/graphty/commit/a1b2c3d) Thanks [@username](https://github.com/username)! - Added new PageRank algorithm

### Patch Changes

- [`e4f5g6h`](https://github.com/graphty-org/graphty/commit/e4f5g6h) - Fixed edge weight calculations
```

## Customizing Changelog Generation

### 1. Install Alternative Changelog Generators

```bash
npm install -D @changesets/changelog-github
# or
npm install -D @changesets/changelog-git
```

### 2. Configure in `.changeset/config.json`

```json
{
  "changelog": [
    "@changesets/changelog-github",
    {
      "repo": "graphty-org/graphty"
    }
  ]
}
```

### 3. Custom Changelog Generator

Create your own:

```javascript
// .changeset/changelog-custom.js
const getReleaseLine = async (changeset, type, options) => {
  const [firstLine, ...futureLines] = changeset.summary
    .split("\n")
    .map(l => l.trimRight());

  let returnVal = `- ${changeset.commit ? `${changeset.commit}: ` : ""}${firstLine}`;

  if (futureLines.length > 0) {
    returnVal += `\n${futureLines.map(l => `  ${l}`).join("\n")}`;
  }

  return returnVal;
};

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine: async (changesets, dependenciesUpdated) => {
    if (dependenciesUpdated.length === 0) return "";
    
    const updatedDependenciesList = dependenciesUpdated
      .map(dep => `  - ${dep.name}@${dep.newVersion}`)
      .join("\n");

    return `- Updated dependencies\n${updatedDependenciesList}`;
  }
};
```

## Multiple Packages Example

When you have changes across multiple packages:

### Changeset File
```markdown
---
"@graphty/algorithms": minor
"@graphty/layout": minor
"@graphty/graphty-element": patch
---

Implemented new clustering algorithms suite

- **algorithms**: Added k-means and hierarchical clustering
- **layout**: New cluster-based layout using the clustering algorithms
- **graphty-element**: Fixed cluster visualization rendering bug
```

### Generated Changelogs

**packages/algorithms/CHANGELOG.md:**
```markdown
# @graphty/algorithms

## 1.3.0

### Minor Changes

- Implemented new clustering algorithms suite
  - **algorithms**: Added k-means and hierarchical clustering
  - **layout**: New cluster-based layout using the clustering algorithms
  - **graphty-element**: Fixed cluster visualization rendering bug
```

**packages/layout/CHANGELOG.md:**
```markdown
# @graphty/layout

## 1.3.0

### Minor Changes

- Implemented new clustering algorithms suite
  - **algorithms**: Added k-means and hierarchical clustering
  - **layout**: New cluster-based layout using the clustering algorithms
  - **graphty-element**: Fixed cluster visualization rendering bug

### Patch Changes

- Updated dependencies
  - @graphty/algorithms@1.3.0
```

**packages/graphty-element/CHANGELOG.md:**
```markdown
# @graphty/graphty-element

## 1.0.5

### Patch Changes

- Implemented new clustering algorithms suite
  - **algorithms**: Added k-means and hierarchical clustering
  - **layout**: New cluster-based layout using the clustering algorithms
  - **graphty-element**: Fixed cluster visualization rendering bug
- Updated dependencies
  - @graphty/algorithms@1.3.0
  - @graphty/layout@1.3.0
```

## Dependency Updates

When `updateInternalDependencies` is configured:

```json
{
  "updateInternalDependencies": "patch"
}
```

Dependent packages automatically get entries:

```markdown
## 1.2.10

### Patch Changes

- Updated dependencies
  - @graphty/algorithms@1.3.0
```

## Managing Existing Changelogs

### First Time Setup

If you already have CHANGELOG.md files:
1. Changesets will append to existing content
2. It preserves your existing format
3. Adds new entries at the top

### Migration Tips

1. **Clean up existing CHANGELOG.md** to follow consistent format
2. **Add missing version headers** if needed
3. **Consider adding old entries** in changeset format

## Best Practices

### 1. Write User-Focused Summaries

```markdown
❌ Bad:
---
"@graphty/algorithms": patch
---

Fixed bug in dijkstra.ts line 45

✅ Good:
---
"@graphty/algorithms": patch  
---

Fixed Dijkstra's algorithm incorrectly handling disconnected nodes
```

### 2. Use Markdown Formatting

```markdown
---
"@graphty/algorithms": major
---

**BREAKING**: Renamed all algorithm functions to follow consistent naming

- `runPageRank()` → `pagerank()`
- `runDijkstra()` → `dijkstra()`
- `detectCommunities()` → `communityDetection()`

Migration: Update all function calls to use new names. Parameters remain unchanged.
```

### 3. Group Related Changes

Instead of multiple changesets, use one comprehensive one:

```markdown
---
"@graphty/algorithms": minor
"@graphty/layout": minor
---

Added graph partitioning feature set

**New Features:**
- Kernighan-Lin algorithm for balanced graph partitioning
- Spectral partitioning using eigenvalue decomposition
- Layout algorithm that respects partition boundaries
- Visualization support for highlighting partitions
```

## CI/CD Integration

### Automated Changelog Review

The Changesets GitHub Action creates a PR with changelog preview:

```yaml
- name: Create Release Pull Request
  uses: changesets/action@v1
  with:
    title: "Version Packages"
    commit: "Version Packages"
    version: npm run version
```

This creates a PR showing:
- All version bumps
- Generated changelog entries
- Dependency updates

You can edit the PR before merging if needed!

## Advanced: Changelog Sections

For better organization, you can create sections:

```javascript
// Custom changelog generator
const getReleaseLine = async (changeset, type) => {
  const lines = changeset.summary.split('\n');
  const category = lines[0].match(/^\[(.*?)\]/) ? lines[0].match(/^\[(.*?)\]/)[1] : null;
  
  if (category) {
    return `- **${category}**: ${lines[0].replace(/^\[.*?\]\s*/, '')}`;
  }
  
  return `- ${lines[0]}`;
};
```

Then write changesets like:
```markdown
---
"@graphty/algorithms": minor
---

[Performance] Optimized shortest path algorithms for sparse graphs
```

Results in:
```markdown
### Minor Changes

- **Performance**: Optimized shortest path algorithms for sparse graphs
```

## Summary

Changesets handles changelog generation by:
1. **Collecting** all changeset files
2. **Grouping** by package and version type
3. **Formatting** according to your chosen generator
4. **Updating** CHANGELOG.md files automatically
5. **Tracking** dependency updates

The key insight: Your changeset descriptions become your changelog entries, so write them for your users, not yourself!