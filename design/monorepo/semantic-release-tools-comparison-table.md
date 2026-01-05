# Monorepo Release Tools - Quick Comparison

## Tool Overview

| Tool                       | Type                 | Monorepo Support     | Weekly Downloads | Versioning Method | Maintained By |
| -------------------------- | -------------------- | -------------------- | ---------------- | ----------------- | ------------- |
| **Changesets**             | Change Files         | ✅ Native            | 1.4M             | Markdown files    | Atlassian     |
| **release-please**         | Conventional Commits | ✅ Native (manifest) | 180k             | Git history + PRs | Google        |
| **release-it**             | Hybrid               | ✅ Via plugin        | 280k             | Flexible          | Community     |
| **Auto**                   | PR Labels            | ✅ Native            | 50k              | PR labels         | Intuit        |
| **Beachball**              | Change Files         | ✅ Native            | 33k              | JSON files        | Microsoft     |
| **multi-semantic-release** | Conventional Commits | ⚠️ Wrapper           | 70k              | Git history       | Community     |
| **semantic-release**       | Conventional Commits | ❌ None              | 2M               | Git history       | Community     |
| **Nx Release**             | Conventional Commits | ✅ Native            | N/A (built-in)   | Git history       | Nx/Nrwl       |
| **Lerna**                  | Conventional Commits | ✅ Native            | 1.2M             | Git history       | Nx/Nrwl       |

## Feature Comparison

| Feature                | Changesets   | release-please | release-it  | Auto      | Beachball | multi-semantic |
| ---------------------- | ------------ | -------------- | ----------- | --------- | --------- | -------------- |
| **Setup Complexity**   | Medium       | High           | Low         | Low       | Medium    | High           |
| **Dependency Updates** | ✅ Auto      | ✅ Auto        | ⚠️ Manual   | ✅ Auto   | ✅ Auto   | ✅ Auto        |
| **GitHub Integration** | ✅ Action    | ✅ Native      | ✅ Good     | ✅ Good   | ⚠️ Basic  | ⚠️ Basic       |
| **PR Review Flow**     | ✅ Excellent | ✅ Good        | ⚠️ Optional | ✅ Labels | ✅ JSON   | ❌ None        |
| **Performance**        | Fast         | Fast           | Fast        | Fast      | Optimized | Slow (20+ pkg) |
| **Publish to npm**     | ✅ Yes       | ❌ No          | ✅ Yes      | ✅ Yes    | ✅ Yes    | ✅ Yes         |
| **Language Support**   | JS/TS        | Multi          | Multi       | Multi     | JS/TS     | JS/TS          |

## Workflow Comparison

### Changesets

```bash
npx changeset           # Create change description
npx changeset version   # Update versions (CI)
npx changeset publish   # Publish packages
```

### release-please

```bash
# Automatic - commits trigger PR creation
git commit -m "feat: new feature"
# Merge release PR to publish
```

### release-it

```bash
release-it              # Interactive
release-it --ci         # Automated
```

### Auto

```bash
# Label PR with: major, minor, patch
auto shipit             # Release
```

## Decision Matrix

| If you want...                  | Choose...                  |
| ------------------------------- | -------------------------- |
| Best monorepo support           | **Changesets**             |
| Conventional commits + monorepo | **release-please**         |
| Maximum flexibility             | **release-it**             |
| Simple PR workflow              | **Auto**                   |
| Enterprise scale                | **Beachball**              |
| Keep semantic-release           | **multi-semantic-release** |
| Using Nx framework              | **Nx Release**             |

## Graphty Recommendation

For Graphty's 5-package monorepo with interdependencies:

1. **Changesets** - Best overall choice
2. **release-please** - If committed to conventional commits
3. **release-it** - If you want flexibility to evolve

Avoid semantic-release-based solutions for monorepos - they're fundamentally incompatible.

---

## Final Decision

> **We chose Nx Release** because we want to continue using conventional commits.
>
> See `monorepo-design.md` for the full decision record.
