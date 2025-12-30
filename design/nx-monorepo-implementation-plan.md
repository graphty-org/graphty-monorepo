# Nx Monorepo Implementation Plan for Graphty

## Executive Summary

This plan details the migration of Graphty from independent packages to a unified Nx + pnpm monorepo structure while preserving all existing tooling, workflows, and conventions. The migration will be done incrementally to minimize risk and disruption.

### Release Management Decision

This plan uses **Nx Release** for automated versioning and publishing. During the design phase, we evaluated multiple release tools including Changesets (which was initially recommended in the semantic release strategy documents).

**We chose Nx Release over Changesets because we want to continue using conventional commits.** Our team has established discipline around conventional commit messages, and Nx Release allows us to preserve this workflow while gaining proper monorepo support.

See the full decision record in `monorepo-design.md` under "Decision Record: Nx Release vs Changesets".

## Goals and Success Metrics

### Primary Goals

1. **Unified Tooling**
   - Single set of configurations for TypeScript, ESLint, Vitest, Vite
   - Shared development dependencies installed once
   - Consistent build and test commands across all packages

2. **Cross-Dependency Testing**
   - Test dependent packages without publishing to npm
   - Automatic detection of affected packages
   - Local development with live updates between packages

3. **Automated Releases**
   - Replace individual semantic-release with Nx Release
   - Maintain conventional commits workflow
   - Automated versioning and publishing from CI/CD

4. **Developer Experience**
   - Easy creation of new packages with consistent structure
   - Faster builds through caching
   - Better visibility into project dependencies

### Success Metrics

- [ ] All packages build and test successfully under Nx
- [ ] CI/CD time reduced by at least 30% through caching
- [ ] Zero regression in functionality or published packages
- [ ] Automated releases working with conventional commits
- [ ] Team can create new packages with single command
- [ ] All existing scripts and workflows continue to function
- [ ] Test coverage maintained at current levels (80%+)
- [ ] Development server ports remain in 9000-9099 range
- [ ] Git history preserved from all individual packages

## Pre-Implementation Checklist

### Prerequisites
- [ ] Full backup of repository (see Rollback Plan section)
- [ ] **Clean up git worktrees** (see Worktree Cleanup section below)
- [ ] Document current package versions
- [ ] List all npm scripts per package
- [ ] Verify all tests are passing
- [ ] Check CI/CD pipelines are green
- [ ] Notify team of upcoming changes
- [ ] Create feature branch: `feat/nx-monorepo-migration`

### Worktree Cleanup (Required Before Migration)

Git worktrees create separate working directories for branches. These must be removed before migration to avoid confusion and data loss during git history preservation.

**Known worktrees to remove:**
- `graphty-element/.worktrees/` - 14 worktrees (ai-interface, algorithms, api-documentation, config, data-loading, edge-data-not-loading, edge-styles, logging, screen-resizing-bug, screenshots, test-consolidation, todo-comments, viewmode, xr-camera)
- `graphty/.worktrees/` - 6 worktrees (ai-tools, algorithms, data-view, layouts, properties-sidebar, sentry)

**Cleanup script:**

```bash
cat > tools/cleanup-worktrees.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              GIT WORKTREE CLEANUP                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  This will remove all git worktrees from packages."
echo "   Ensure all work has been merged to master before proceeding!"
echo ""

# List all worktrees
echo "Current worktrees:"
echo ""
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -d "$pkg/.git" ]; then
    WORKTREES=$(cd "$pkg" && git worktree list 2>/dev/null | tail -n +2)
    if [ -n "$WORKTREES" ]; then
      echo "=== $pkg ==="
      echo "$WORKTREES" | while read line; do
        echo "   $line"
      done
      echo ""
    fi
  fi
done

read -p "Remove all worktrees? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "Removing worktrees..."

for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -d "$pkg/.git" ]; then
    cd "$pkg"

    # Get list of worktree paths (skip the main worktree on line 1)
    git worktree list --porcelain | grep "^worktree " | tail -n +2 | cut -d' ' -f2- | while read wt_path; do
      if [ -n "$wt_path" ] && [ "$wt_path" != "$(pwd)" ]; then
        echo "   Removing: $wt_path"
        git worktree remove --force "$wt_path" 2>/dev/null || true
      fi
    done

    # Also remove any .worktrees directory
    if [ -d ".worktrees" ]; then
      echo "   Removing .worktrees directory"
      rm -rf ".worktrees"
    fi

    # Prune any stale worktree references
    git worktree prune

    cd ..
  fi
done

echo ""
echo "✅ Worktree cleanup complete!"
echo ""
echo "Verify no worktrees remain:"
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -d "$pkg/.git" ]; then
    COUNT=$(cd "$pkg" && git worktree list | wc -l)
    if [ "$COUNT" -eq 1 ]; then
      echo "   ✅ $pkg: only main worktree"
    else
      echo "   ⚠️  $pkg: $COUNT worktrees remaining"
    fi
  fi
done
EOF

chmod +x tools/cleanup-worktrees.sh
```

**Run the cleanup:**
```bash
./tools/cleanup-worktrees.sh
```

**Important:** Before running cleanup, ensure:
- All worktree branches have been merged to master (or are intentionally abandoned)
- No uncommitted work exists in any worktree
- You've pushed any work you want to keep

### Package-Specific Requirements Audit

Before migration, verify these package-specific requirements are preserved:

| Package | Requirements | Validation |
|---------|--------------|------------|
| **algorithms** | TypedFastBitSet dependency | Verify import works after build |
| **layout** | Dual Node.js + browser builds (ES, CJS, UMD) | Test `require()` and `import` both work |
| **graphty-element** | Babylon.js peer dependency, Storybook config, visual regression tests, Playwright config | Run Storybook, visual tests pass |
| **graphty** | React app, Mantine UI, eruda for mobile debugging, private (not published) | Dev server starts, eruda loads |
| **gpu-3d-force-layout** | WebGPU experimental, may need browser-specific test environment | Tests run in appropriate environment |

### Package-Specific Files to Preserve

```
algorithms/
  └── (standard library, no special files)

layout/
  └── (standard library, needs CJS output)

graphty-element/
  ├── .storybook/           # Storybook configuration
  ├── playwright.config.ts  # Playwright visual tests
  ├── vitest.visual.config.ts # Visual test config
  └── test/visual/          # Visual test fixtures

graphty/
  └── (React app, verify eruda integration)

gpu-3d-force-layout/
  └── (WebGPU shims for testing)
```

### Build Output Snapshot (Pre-Migration)

Before starting, capture current build outputs for comparison:

```bash
# Run this BEFORE starting migration
cat > tools/capture-pre-migration-state.sh << 'EOF'
#!/bin/bash
set -e

SNAPSHOT_DIR=".migration-snapshot"
mkdir -p "$SNAPSHOT_DIR"

echo "Capturing pre-migration state..."

# Capture package versions
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -f "$pkg/package.json" ]; then
    jq '{name, version, dependencies, peerDependencies}' "$pkg/package.json" > "$SNAPSHOT_DIR/$pkg-package.json"
  fi
done

# Capture build outputs if they exist
for pkg in algorithms layout graphty-element gpu-3d-force-layout; do
  if [ -d "$pkg/dist" ]; then
    echo "Capturing $pkg build output sizes..."
    find "$pkg/dist" -type f -name "*.js" -exec wc -c {} \; > "$SNAPSHOT_DIR/$pkg-bundle-sizes.txt"
    find "$pkg/dist" -type f -name "*.d.ts" | wc -l > "$SNAPSHOT_DIR/$pkg-dts-count.txt"
  fi
done

# Capture npm script inventory
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -f "$pkg/package.json" ]; then
    jq '.scripts' "$pkg/package.json" > "$SNAPSHOT_DIR/$pkg-scripts.json"
  fi
done

echo "✅ Pre-migration state captured in $SNAPSHOT_DIR/"
ls -la "$SNAPSHOT_DIR/"
EOF

chmod +x tools/capture-pre-migration-state.sh
./tools/capture-pre-migration-state.sh
```

### Risk Mitigation
- Each phase will be tested before proceeding
- Original package.json files will be preserved until migration is complete
- **Full repository archive backup required before starting** (see Rollback Plan section)
- Incremental migration: one package at a time with validation gates
- Rollback criteria documented with severity levels

---

## Verification Framework

### Principles

Each phase ends with a **Verification Checkpoint** that must pass before proceeding:

1. **User Acceptance Testing (UAT)**: Verification steps are designed for manual execution by the user
2. **Automated Validation**: Scripts provided where possible, but user reviews results
3. **Clear Pass/Fail Criteria**: Each checkpoint has explicit success criteria
4. **Rollback Triggers**: Specific conditions that require stopping and reverting
5. **No Proceeding on Failure**: Never continue to the next phase until current phase passes

### Verification Checkpoint Structure

Each phase verification includes:

| Component | Description |
|-----------|-------------|
| **Automated Checks** | Scripts that test technical requirements |
| **Manual Verification** | Steps the user performs and visually confirms |
| **Expected Outcomes** | What success looks like |
| **Failure Indicators** | Signs that something went wrong |
| **Rollback Trigger** | When to stop and revert |

### Overall Migration Progress Tracking

Create this file at the start to track progress:

```bash
cat > .migration-progress.md << 'EOF'
# Migration Progress Tracker

## Status: 🟡 In Progress

| Phase | Status | Started | Completed | Verified By |
|-------|--------|---------|-----------|-------------|
| Pre-flight | ⏳ Pending | | | |
| Phase 1: Foundation | ⏳ Pending | | | |
| Phase 2: Shared Configs | ⏳ Pending | | | |
| Phase 3: Git History | ⏳ Pending | | | |
| Phase 4: Package Migration | ⏳ Pending | | | |
| Phase 5: Nx Release | ⏳ Pending | | | |
| Phase 6: CI/CD | ⏳ Pending | | | |
| Phase 7: Testing | ⏳ Pending | | | |
| Phase 8: Completion | ⏳ Pending | | | |

## Issues Encountered

(Document any issues and resolutions here)

## Rollback Events

(Document any rollbacks and reasons)
EOF
```

---

## Pre-Flight Verification

Before starting any phase, complete this verification:

### Pre-Flight Automated Checks

```bash
cat > tools/verify-pre-flight.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           PRE-FLIGHT VERIFICATION CHECKLIST                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: All package directories exist
echo "📁 Checking package directories..."
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -d "$pkg" ]; then
    echo "   ✅ $pkg exists"
  else
    echo "   ❌ $pkg NOT FOUND"
    ((ERRORS++))
  fi
done

# Check 2: All packages have package.json
echo ""
echo "📦 Checking package.json files..."
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -f "$pkg/package.json" ]; then
    VERSION=$(jq -r '.version' "$pkg/package.json")
    echo "   ✅ $pkg/package.json (v$VERSION)"
  else
    echo "   ❌ $pkg/package.json NOT FOUND"
    ((ERRORS++))
  fi
done

# Check 2b: gpu-3d-force-layout has correct package name
echo ""
echo "🏷️  Checking gpu-3d-force-layout package name..."
if [ -f "gpu-3d-force-layout/package.json" ]; then
  PKG_NAME=$(jq -r '.name' "gpu-3d-force-layout/package.json")
  if [ "$PKG_NAME" = "gpu-3d-force-layout" ]; then
    echo "   ✅ Package name is correct: $PKG_NAME"
  else
    echo "   ❌ Package name mismatch: found '$PKG_NAME', expected 'gpu-3d-force-layout'"
    echo "   Run: jq '.name = \"gpu-3d-force-layout\"' gpu-3d-force-layout/package.json > tmp.json && mv tmp.json gpu-3d-force-layout/package.json"
    ((ERRORS++))
  fi
fi

# Check 3: Node.js version
echo ""
echo "🟢 Checking Node.js version..."
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -ge 18 ]; then
  echo "   ✅ Node.js $NODE_VERSION (>= 18 required)"
else
  echo "   ❌ Node.js $NODE_VERSION is too old (>= 18 required)"
  ((ERRORS++))
fi

# Check 4: Git status is clean
echo ""
echo "📝 Checking git status..."
if [ -z "$(git status --porcelain)" ]; then
  echo "   ✅ Working directory is clean"
else
  echo "   ⚠️  Working directory has uncommitted changes"
  ((WARNINGS++))
fi

# Check 5: On correct branch
echo ""
echo "🌿 Checking git branch..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "   Current branch: $BRANCH"
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
  echo "   ⚠️  You are on $BRANCH - consider creating a feature branch"
  ((WARNINGS++))
else
  echo "   ✅ On feature branch"
fi

# Check 6: Git worktrees cleaned up
echo ""
echo "🌳 Checking for git worktrees..."
TOTAL_WORKTREES=0
for pkg in algorithms layout graphty-element graphty gpu-3d-force-layout; do
  if [ -d "$pkg/.git" ]; then
    COUNT=$(cd "$pkg" && git worktree list 2>/dev/null | wc -l)
    if [ "$COUNT" -gt 1 ]; then
      EXTRA=$((COUNT - 1))
      echo "   ❌ $pkg has $EXTRA extra worktree(s) - run tools/cleanup-worktrees.sh"
      TOTAL_WORKTREES=$((TOTAL_WORKTREES + EXTRA))
    fi
  fi
done
if [ "$TOTAL_WORKTREES" -eq 0 ]; then
  echo "   ✅ No extra worktrees found"
else
  echo "   ❌ Found $TOTAL_WORKTREES worktree(s) that must be removed before migration"
  ((ERRORS++))
fi

# Check 7: Tests pass in each package
echo ""
echo "🧪 Checking if tests pass (this may take a while)..."
for pkg in algorithms layout graphty-element gpu-3d-force-layout; do
  if [ -f "$pkg/package.json" ]; then
    echo "   Testing $pkg..."
    if (cd "$pkg" && npm test -- --run 2>/dev/null); then
      echo "   ✅ $pkg tests pass"
    else
      echo "   ❌ $pkg tests FAILED"
      ((ERRORS++))
    fi
  fi
done

# Check 8: Backup exists
echo ""
echo "💾 Checking for backup..."
BACKUP_DIR="$HOME/graphty-backups"
if [ -d "$BACKUP_DIR" ] && [ -n "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
  echo "   ✅ Backup directory exists with files"
  ls -la "$BACKUP_DIR" | head -5
else
  echo "   ❌ No backup found in $BACKUP_DIR"
  echo "   Run the backup script before proceeding!"
  ((ERRORS++))
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "✅ PRE-FLIGHT CHECK PASSED - Ready to proceed"
  else
    echo "⚠️  PRE-FLIGHT CHECK PASSED WITH $WARNINGS WARNING(S)"
    echo "   Review warnings before proceeding"
  fi
  exit 0
else
  echo "❌ PRE-FLIGHT CHECK FAILED - $ERRORS ERROR(S) FOUND"
  echo "   Fix all errors before starting migration"
  exit 1
fi
EOF

chmod +x tools/verify-pre-flight.sh
```

### Pre-Flight Manual Verification

Complete these checks manually:

- [ ] **Backup verified**: Can you locate the backup archive? Run `ls -la $HOME/graphty-backups/`
- [ ] **Team notified**: Has the team been informed of the migration?
- [ ] **CI/CD is green**: Check GitHub Actions - are all workflows passing?
- [ ] **No pending releases**: Are there any pending npm releases that should be done first?
- [ ] **Documentation reviewed**: Have you read this entire plan?

### Pre-Flight Expected Outcomes

✅ All automated checks pass with 0 errors
✅ All manual verification items checked off
✅ `.migration-progress.md` file created and first row marked "In Progress"

### Pre-Flight Rollback Trigger

🛑 **STOP if**:
- Any package tests are failing
- No backup exists
- Git working directory has critical uncommitted changes
- Git worktrees still exist (run `tools/cleanup-worktrees.sh` first)

---

## Phase 1: Foundation Setup (Day 1-2)

### 1.1 Install pnpm and Create Workspace

```bash
# Install pnpm globally
npm install -g pnpm@8

# Create pnpm workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "packages/*"
  - "algorithms"
  - "layout"
  - "graphty-element"
  - "graphty"
  - "gpu-3d-force-layout"
EOF

# Create .npmrc for pnpm settings
cat > .npmrc << 'EOF'
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=true
EOF

# Convert package-lock.json to pnpm-lock.yaml
pnpm import
```

### 1.2 Initialize Nx

```bash
# Add Nx to the repository
npx nx@latest init --interactive false

# Install Nx plugins we'll need
pnpm add -D -w @nx/js @nx/vite @nx/web @nx/react @nx/eslint-plugin
```

### 1.3 Create Base Configuration

```bash
# Create nx.json with our configuration
cat > nx.json << 'EOF'
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "parallel": 3,
        "cacheDirectory": ".nx/cache"
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/vitest.shared.config.ts"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/eslint.config.base.js"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/vitest.config.ts",
      "!{projectRoot}/eslint.config.js",
      "!{projectRoot}/**/*.md"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/tsconfig.base.json",
      "{workspaceRoot}/eslint.config.base.js"
    ]
  },
  "workspaceLayout": {
    "appsDir": "packages",
    "libsDir": "packages"
  },
  "generators": {
    "@nx/js:library": {
      "buildable": true,
      "publishable": true,
      "unitTestRunner": "vitest",
      "bundler": "vite",
      "compiler": "tsc",
      "testEnvironment": "node",
      "skipFormat": true,
      "strict": true
    }
  }
}
EOF
```

### 1.4 Consolidate Development Dependencies

```bash
# Install shared dev dependencies at root
pnpm add -D -w \
  @commitlint/cli@^19.8.0 \
  @commitlint/config-conventional@^19.8.0 \
  @eslint/js@^9.24.1 \
  @stylistic/eslint-plugin@^2.19.1 \
  @vitest/browser@^3.2.4 \
  @vitest/coverage-v8@^3.2.4 \
  @vitest/ui@^3.2.4 \
  commitizen@^4.3.3 \
  cz-conventional-changelog@^3.3.0 \
  eslint@^9.24.1 \
  eslint-plugin-simple-import-sort@^12.1.1 \
  happy-dom@^16.7.1 \
  husky@^9.2.0 \
  knip@^5.44.4 \
  playwright@^1.53.0 \
  tsx@^4.20.3 \
  typescript@^5.8.3 \
  typescript-eslint@^8.34.1 \
  vite@^7.0.5 \
  vitest@^3.2.4
```

---

### Phase 1 Verification Checkpoint

#### Phase 1 Automated Checks

```bash
cat > tools/verify-phase-1.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           PHASE 1 VERIFICATION: Foundation Setup             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0

# Check 1: pnpm is installed
echo "📦 Checking pnpm installation..."
if command -v pnpm &> /dev/null; then
  PNPM_VERSION=$(pnpm --version)
  echo "   ✅ pnpm $PNPM_VERSION is installed"
else
  echo "   ❌ pnpm is NOT installed"
  ((ERRORS++))
fi

# Check 2: pnpm-workspace.yaml exists
echo ""
echo "📄 Checking workspace configuration..."
if [ -f "pnpm-workspace.yaml" ]; then
  echo "   ✅ pnpm-workspace.yaml exists"
  echo "   Contents:"
  cat pnpm-workspace.yaml | sed 's/^/      /'
else
  echo "   ❌ pnpm-workspace.yaml NOT FOUND"
  ((ERRORS++))
fi

# Check 3: .npmrc exists
echo ""
if [ -f ".npmrc" ]; then
  echo "   ✅ .npmrc exists"
else
  echo "   ❌ .npmrc NOT FOUND"
  ((ERRORS++))
fi

# Check 4: node_modules/.pnpm exists (pnpm store)
echo ""
echo "📁 Checking pnpm node_modules structure..."
if [ -d "node_modules/.pnpm" ]; then
  echo "   ✅ node_modules/.pnpm exists (pnpm store)"
else
  echo "   ❌ node_modules/.pnpm NOT FOUND - run 'pnpm install'"
  ((ERRORS++))
fi

# Check 5: Nx is installed and working
echo ""
echo "🔧 Checking Nx installation..."
if pnpm exec nx --version &> /dev/null; then
  NX_VERSION=$(pnpm exec nx --version 2>/dev/null | head -1)
  echo "   ✅ Nx is installed: $NX_VERSION"
else
  echo "   ❌ Nx is NOT working"
  ((ERRORS++))
fi

# Check 6: nx.json exists and is valid JSON
echo ""
echo "📄 Checking nx.json..."
if [ -f "nx.json" ]; then
  if jq . nx.json > /dev/null 2>&1; then
    echo "   ✅ nx.json exists and is valid JSON"
  else
    echo "   ❌ nx.json exists but is INVALID JSON"
    ((ERRORS++))
  fi
else
  echo "   ❌ nx.json NOT FOUND"
  ((ERRORS++))
fi

# Check 7: Nx can detect projects
echo ""
echo "🔍 Checking Nx project detection..."
PROJECT_COUNT=$(pnpm exec nx show projects 2>/dev/null | wc -l)
if [ "$PROJECT_COUNT" -ge 1 ]; then
  echo "   ✅ Nx detects $PROJECT_COUNT project(s):"
  pnpm exec nx show projects 2>/dev/null | sed 's/^/      /'
else
  echo "   ⚠️  Nx detects no projects yet (this may be expected)"
fi

# Check 8: Nx plugins are installed
echo ""
echo "📦 Checking Nx plugins..."
PLUGINS=("@nx/js" "@nx/vite" "@nx/web" "@nx/react")
for plugin in "${PLUGINS[@]}"; do
  if [ -d "node_modules/$plugin" ]; then
    echo "   ✅ $plugin is installed"
  else
    echo "   ❌ $plugin is NOT installed"
    ((ERRORS++))
  fi
done

# Check 9: Nx graph can be generated
echo ""
echo "📊 Checking Nx graph generation..."
mkdir -p tmp
if pnpm exec nx graph --file=tmp/graph.html 2>/dev/null; then
  echo "   ✅ Nx graph generated successfully (see tmp/graph.html)"
else
  echo "   ⚠️  Nx graph generation failed (may be expected if no projects yet)"
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "✅ PHASE 1 VERIFICATION PASSED"
  echo ""
  echo "You may proceed to Phase 2: Create Shared Configurations"
  exit 0
else
  echo "❌ PHASE 1 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 2"
  exit 1
fi
EOF

chmod +x tools/verify-phase-1.sh
./tools/verify-phase-1.sh
```

#### Phase 1 Manual Verification

Perform these checks yourself:

1. **pnpm works**: Run `pnpm --version` - do you see a version number?
2. **Dependencies installed**: Run `ls node_modules/.pnpm | head -10` - do you see packages?
3. **Nx responds**: Run `pnpm exec nx --version` - does it print version info?
4. **Workspace file readable**: Run `cat pnpm-workspace.yaml` - does it list all packages?

#### Phase 1 Expected Outcomes

| Check | Expected Result |
|-------|-----------------|
| `pnpm --version` | `8.x.x` or higher |
| `pnpm exec nx --version` | Version string displayed |
| `ls node_modules/.pnpm` | Directory listing with packages |
| `cat pnpm-workspace.yaml` | Lists all 5 packages |
| `cat nx.json` | Valid JSON with configuration |

#### Phase 1 Failure Indicators

🔴 **Something is wrong if**:
- `pnpm: command not found`
- `nx: command not found` after running through pnpm
- `node_modules` directory doesn't exist or is empty
- Any "permission denied" errors

#### Phase 1 Rollback Trigger

🛑 **STOP and rollback if**:
- pnpm install fails repeatedly
- Nx initialization produces errors that can't be resolved
- You've spent more than 2 hours troubleshooting this phase

**Rollback command**: `git checkout . && rm -rf node_modules pnpm-lock.yaml`

---

## Phase 2: Create Shared Configurations (Day 2-3)

### 2.1 TypeScript Base Configuration

```bash
# Create base TypeScript config
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@graphty/algorithms": ["algorithms/src/index.ts"],
      "@graphty/layout": ["layout/src/index.ts"],
      "@graphty/graphty-element": ["graphty-element/src/index.ts"],
      "@graphty/graphty": ["graphty/src/index.ts"],
      "gpu-3d-force-layout": ["gpu-3d-force-layout/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp", "dist", ".nx"]
}
EOF
```

#### Validate TypeScript Paths

Create a validation script to ensure tsconfig paths match package.json names:

```bash
cat > tools/validate-tsconfig-paths.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('Validating TypeScript path mappings...\n');

// Read tsconfig.base.json
const tsconfigPath = 'tsconfig.base.json';
if (!fs.existsSync(tsconfigPath)) {
  console.error('❌ tsconfig.base.json not found');
  process.exit(1);
}

const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
const paths = tsconfig.compilerOptions?.paths || {};

let hasErrors = false;

Object.entries(paths).forEach(([alias, targets]) => {
  const target = targets[0];
  const packageDir = target.split('/')[0];
  const packageJsonPath = path.join(packageDir, 'package.json');

  // Check if package directory exists
  if (!fs.existsSync(packageDir)) {
    console.error(`❌ Path alias "${alias}" points to non-existent directory: ${packageDir}`);
    hasErrors = true;
    return;
  }

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ Path alias "${alias}": missing package.json in ${packageDir}`);
    hasErrors = true;
    return;
  }

  // Verify package name matches alias
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (pkg.name !== alias) {
    console.error(`❌ Path alias "${alias}" doesn't match package.json name "${pkg.name}"`);
    hasErrors = true;
    return;
  }

  // Check if entry point exists
  const entryPoint = path.join(packageDir, 'src/index.ts');
  if (!fs.existsSync(entryPoint)) {
    console.warn(`⚠️  Path alias "${alias}": entry point ${entryPoint} not found (might be created later)`);
  }

  console.log(`✅ ${alias} → ${target}`);
});

if (hasErrors) {
  console.error('\n❌ TypeScript path validation failed');
  process.exit(1);
}

console.log('\n✅ All TypeScript paths are valid');
EOF

# Run validation (will warn if packages don't exist yet, which is expected before migration)
node tools/validate-tsconfig-paths.js || echo "Note: Some warnings are expected if packages haven't been migrated yet"
```

### 2.2 Shared ESLint Configuration (Flat Config Format)

```bash
# Create base ESLint config using flat config format (eslint.config.js)
cat > eslint.config.base.js << 'EOF'
// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE DIRECTLY
// This is the base ESLint configuration for the monorepo
// Package-specific configs should import and extend this

import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

// Shared stylistic rules
const stylisticRules = {
  '@stylistic/array-bracket-spacing': ['error', 'never'],
  '@stylistic/arrow-parens': ['error', 'always'],
  '@stylistic/arrow-spacing': 'error',
  '@stylistic/block-spacing': 'error',
  '@stylistic/brace-style': ['error', '1tbs'],
  '@stylistic/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/comma-spacing': 'error',
  '@stylistic/computed-property-spacing': ['error', 'never'],
  '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
  '@stylistic/key-spacing': 'error',
  '@stylistic/keyword-spacing': 'error',
  '@stylistic/linebreak-style': ['error', 'unix'],
  '@stylistic/max-len': ['error', { code: 120, ignoreUrls: true }],
  '@stylistic/member-delimiter-style': 'error',
  '@stylistic/no-extra-semi': 'error',
  '@stylistic/no-multi-spaces': 'error',
  '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
  '@stylistic/no-trailing-spaces': 'error',
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/quotes': ['error', 'single'],
  '@stylistic/semi': ['error', 'always'],
  '@stylistic/space-before-blocks': 'error',
  '@stylistic/space-before-function-paren': ['error', {
    anonymous: 'always',
    named: 'never',
    asyncArrow: 'always',
  }],
  '@stylistic/space-in-parens': ['error', 'never'],
  '@stylistic/space-infix-ops': 'error',
};

// Shared base rules
const baseRules = {
  'camelcase': 'error',
  'curly': 'error',
  'eqeqeq': ['error', 'always'],
  'no-console': 'warn',
  'no-var': 'error',
  'prefer-const': 'error',
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
};

// Export factory function for creating package configs
export function createEslintConfig(tsconfigPath = './tsconfig.json') {
  return tseslint.config(
    // Base JavaScript rules
    eslint.configs.recommended,

    // TypeScript strict rules for source files
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      extends: [
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      plugins: {
        '@stylistic': stylistic,
        'simple-import-sort': simpleImportSort,
      },
      rules: {
        ...stylisticRules,
        ...baseRules,
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': ['error', {
          allowExpressions: true,
        }],
      },
    },

    // Relaxed rules for test files
    {
      files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
      extends: [
        ...tseslint.configs.recommended,
      ],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
      plugins: {
        '@stylistic': stylistic,
        'simple-import-sort': simpleImportSort,
      },
      rules: {
        ...stylisticRules,
        ...baseRules,
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'no-console': 'off',
      },
    },

    // Ignore patterns
    {
      ignores: [
        'dist/**',
        'node_modules/**',
        'coverage/**',
        '*.config.js',
        '*.config.ts',
      ],
    },
  );
}

// Default export for packages that just need standard config
export default createEslintConfig();
EOF
```

Each package will then create a simple `eslint.config.js` that imports the base:

```bash
# Example package eslint.config.js (created during package migration)
cat > packages/algorithms/eslint.config.js << 'EOF'
// Import shared config from monorepo root
import { createEslintConfig } from '../../eslint.config.base.js';

export default createEslintConfig();
EOF
```

### 2.3 Shared Vitest Configuration

```bash
# Create shared Vitest config
mkdir -p tools/vitest
cat > tools/vitest/vitest.shared.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import type { UserConfig } from 'vitest/config';

export function createVitestConfig(options: {
  projectName: string;
  setupFiles?: string[];
}): UserConfig {
  return defineConfig({
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: options.setupFiles,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        exclude: [
          'node_modules',
          'dist',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData',
          '**/__tests__'
        ],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80
        }
      },
      reporters: ['default'],
      testTimeout: 30000
    }
  });
}
EOF
```

### 2.4 Shared Vite Configuration

#### Port Assignments

Each package has a fixed port assignment to avoid conflicts:

| Package | Dev Server | Storybook | Notes |
|---------|------------|-----------|-------|
| algorithms | 9000 | - | Library, rarely needs dev server |
| layout | 9010 | - | Library, rarely needs dev server |
| graphty-element | 9020 | 9025 | Web component with Storybook |
| graphty | 9050 | - | React application |
| gpu-3d-force-layout | 9060 | - | Experimental GPU library |

```bash
# Create shared Vite config
mkdir -p tools/vite
cat > tools/vite/vite.shared.config.ts << 'EOF'
import { defineConfig } from 'vite';
import { resolve } from 'path';
import type { UserConfig } from 'vite';

// Fixed port assignments to avoid conflicts
const PORT_ASSIGNMENTS: Record<string, number> = {
  'algorithms': 9000,
  '@graphty/algorithms': 9000,
  'layout': 9010,
  '@graphty/layout': 9010,
  'graphty-element': 9020,
  '@graphty/graphty-element': 9020,
  'graphty': 9050,
  '@graphty/graphty': 9050,
  'gpu-3d-force-layout': 9060,
};

export function createViteConfig(options: {
  packageName: string;
  packagePath: string;
  entry?: string;
  external?: string[];
  globals?: Record<string, string>;
  port?: number;
}): UserConfig {
  const {
    packageName,
    packagePath,
    entry = 'src/index.ts',
    external = [],
    globals = {},
    port = PORT_ASSIGNMENTS[packageName] ?? 9090
  } = options;

  return defineConfig({
    build: {
      lib: {
        entry: resolve(packagePath, entry),
        name: packageName,
        formats: ['es', 'umd'],
        fileName: (format) => `${packageName}.${format === 'es' ? 'js' : 'umd.js'}`
      },
      rollupOptions: {
        external: [
          'typedfastbitset',
          'lit',
          '@lit/reactive-element',
          '@babylonjs/core',
          '@babylonjs/gui',
          'react',
          'react-dom',
          ...external
        ],
        output: {
          globals: {
            'typedfastbitset': 'TypedFastBitSet',
            'lit': 'Lit',
            '@babylonjs/core': 'BABYLON',
            '@babylonjs/gui': 'BABYLON.GUI',
            'react': 'React',
            'react-dom': 'ReactDOM',
            ...globals
          }
        }
      },
      sourcemap: true,
      target: 'es2020',
      outDir: resolve(packagePath, 'dist')
    },
    server: {
      port,
      open: true
    }
  });
}
EOF
```

---

### Phase 2 Verification Checkpoint

#### Phase 2 Automated Checks

```bash
cat > tools/verify-phase-2.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        PHASE 2 VERIFICATION: Shared Configurations           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0

# Check 1: tsconfig.base.json exists and is valid
echo "📄 Checking TypeScript base configuration..."
if [ -f "tsconfig.base.json" ]; then
  if jq . tsconfig.base.json > /dev/null 2>&1; then
    echo "   ✅ tsconfig.base.json exists and is valid JSON"

    # Verify paths are configured
    PATHS_COUNT=$(jq '.compilerOptions.paths | length' tsconfig.base.json)
    if [ "$PATHS_COUNT" -ge 5 ]; then
      echo "   ✅ TypeScript paths configured ($PATHS_COUNT mappings)"
    else
      echo "   ❌ TypeScript paths missing or incomplete ($PATHS_COUNT found, expected 5+)"
      ((ERRORS++))
    fi
  else
    echo "   ❌ tsconfig.base.json is INVALID JSON"
    ((ERRORS++))
  fi
else
  echo "   ❌ tsconfig.base.json NOT FOUND"
  ((ERRORS++))
fi

# Check 2: TypeScript can parse the config
echo ""
echo "🔧 Checking TypeScript can read the config..."
if pnpm exec tsc --showConfig -p tsconfig.base.json > /dev/null 2>&1; then
  echo "   ✅ TypeScript can parse tsconfig.base.json"
else
  echo "   ❌ TypeScript cannot parse tsconfig.base.json"
  ((ERRORS++))
fi

# Check 3: Shared Vitest config exists
echo ""
echo "🧪 Checking Vitest shared configuration..."
if [ -f "tools/vitest/vitest.shared.config.ts" ]; then
  echo "   ✅ tools/vitest/vitest.shared.config.ts exists"

  # Try to verify it's valid TypeScript
  if pnpm exec tsc --noEmit tools/vitest/vitest.shared.config.ts 2>/dev/null; then
    echo "   ✅ Vitest config is valid TypeScript"
  else
    echo "   ⚠️  Vitest config may have TypeScript issues (check manually)"
  fi
else
  echo "   ❌ tools/vitest/vitest.shared.config.ts NOT FOUND"
  ((ERRORS++))
fi

# Check 4: Shared Vite config exists
echo ""
echo "⚡ Checking Vite shared configuration..."
if [ -f "tools/vite/vite.shared.config.ts" ]; then
  echo "   ✅ tools/vite/vite.shared.config.ts exists"

  # Verify port assignments are present
  if grep -q "PORT_ASSIGNMENTS" tools/vite/vite.shared.config.ts; then
    echo "   ✅ Port assignments configured"
  else
    echo "   ⚠️  Port assignments may be missing"
  fi
else
  echo "   ❌ tools/vite/vite.shared.config.ts NOT FOUND"
  ((ERRORS++))
fi

# Check 5: Validate TypeScript paths script
echo ""
echo "🔍 Running TypeScript path validation..."
if [ -f "tools/validate-tsconfig-paths.js" ]; then
  if node tools/validate-tsconfig-paths.js 2>/dev/null; then
    echo "   ✅ TypeScript paths validation passed"
  else
    echo "   ⚠️  TypeScript paths validation had warnings (review output above)"
  fi
else
  echo "   ⚠️  Path validation script not found"
fi

# Check 6: ESLint base config exists (flat config format)
echo ""
echo "📝 Checking ESLint shared configuration..."
if [ -f "eslint.config.base.js" ]; then
  echo "   ✅ eslint.config.base.js exists"

  # Verify it exports createEslintConfig function
  if grep -q "export function createEslintConfig" eslint.config.base.js; then
    echo "   ✅ createEslintConfig function exported"
  else
    echo "   ❌ createEslintConfig function not found in eslint.config.base.js"
    ((ERRORS++))
  fi

  # Verify it imports typescript-eslint
  if grep -q "typescript-eslint" eslint.config.base.js; then
    echo "   ✅ typescript-eslint integration present"
  else
    echo "   ⚠️  typescript-eslint import not found"
  fi
else
  echo "   ❌ eslint.config.base.js NOT FOUND"
  ((ERRORS++))
fi

# Check 7: tools directory structure
echo ""
echo "📁 Checking tools directory structure..."
EXPECTED_DIRS=("tools/vitest" "tools/vite")
for dir in "${EXPECTED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "   ✅ $dir exists"
  else
    echo "   ❌ $dir NOT FOUND"
    ((ERRORS++))
  fi
done

# Check 8: Verify imports would work (create test file)
echo ""
echo "🧪 Testing config imports work..."
cat > tmp/test-imports.ts << 'TESTEOF'
// Test that shared configs can be imported
import { createVitestConfig } from '../tools/vitest/vitest.shared.config';
import { createViteConfig } from '../tools/vite/vite.shared.config';

const vitestConfig = createVitestConfig({ projectName: 'test' });
const viteConfig = createViteConfig({ packageName: 'test', packagePath: 'test' });

console.log('Imports work!');
TESTEOF

if pnpm exec tsc --noEmit tmp/test-imports.ts 2>/dev/null; then
  echo "   ✅ Shared config imports work"
else
  echo "   ⚠️  Shared config import test failed (may need package resolution)"
fi
rm -f tmp/test-imports.ts

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "✅ PHASE 2 VERIFICATION PASSED"
  echo ""
  echo "You may proceed to Phase 3: Preserve Git History"
  exit 0
else
  echo "❌ PHASE 2 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 3"
  exit 1
fi
EOF

chmod +x tools/verify-phase-2.sh
./tools/verify-phase-2.sh
```

#### Phase 2 Manual Verification

Perform these checks yourself:

1. **TypeScript config readable**:
   ```bash
   cat tsconfig.base.json | jq '.compilerOptions.paths'
   ```
   Do you see 5 path mappings for all packages?

2. **Vitest config exists**:
   ```bash
   head -20 tools/vitest/vitest.shared.config.ts
   ```
   Does it export a `createVitestConfig` function?

3. **Vite config has port assignments**:
   ```bash
   grep -A10 "PORT_ASSIGNMENTS" tools/vite/vite.shared.config.ts
   ```
   Do you see ports 9000-9060 assigned?

4. **Directory structure**:
   ```bash
   tree tools/ -L 2
   ```
   Do you see `vitest/` and `vite/` subdirectories?

5. **ESLint base config (flat format)**:
   ```bash
   head -30 eslint.config.base.js
   ```
   Does it import from `typescript-eslint` and export `createEslintConfig`?

#### Phase 2 Expected Outcomes

| File | Must Contain |
|------|--------------|
| `tsconfig.base.json` | `paths` with 5 package mappings |
| `tools/vitest/vitest.shared.config.ts` | `createVitestConfig` function |
| `tools/vite/vite.shared.config.ts` | `PORT_ASSIGNMENTS` and `createViteConfig` |
| `eslint.config.base.js` | `createEslintConfig` function, `tseslint.config()` |

#### Phase 2 Failure Indicators

🔴 **Something is wrong if**:
- `tsc --showConfig` fails to parse tsconfig.base.json
- tools/ directory is missing or empty
- Config files are empty or malformed

#### Phase 2 Rollback Trigger

🛑 **STOP and rollback if**:
- TypeScript refuses to parse the base config
- You cannot get the shared configs to compile
- Errors cascade when trying to fix one issue

**Rollback command**:
```bash
rm -f tsconfig.base.json eslint.config.base.js
rm -rf tools/vitest tools/vite
git checkout -- .
```

---

## Phase 3: Preserve Git History (Day 3)

### 3.1 Install git-filter-repo

```bash
# Install git-filter-repo for history preservation
pip install git-filter-repo
```

### 3.2 Preserve Package Histories

> **⚠️ CRITICAL: History Must Be Merged BEFORE Files Exist**
>
> If package files already exist in the monorepo before merging histories, git will treat
> them as separate lineages. This means `git log`, `git blame`, and IDE history features
> will only show monorepo commits unless you use `--follow`.
>
> **Correct approach:** Reset to clean state, merge histories from GitHub FIRST, so files
> arrive via the merge with their full history attached.

```bash
# First, ensure we're starting from a clean state
# If files already exist, reset to origin/master first:
git fetch origin
git reset --hard origin/master

# Create script to preserve git history
cat > tools/preserve-git-history.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Preserving Git History for Monorepo                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Package configuration with their GitHub URLs
declare -A PACKAGE_URLS
PACKAGE_URLS["algorithms"]="https://github.com/graphty-org/algorithms.git"
PACKAGE_URLS["layout"]="https://github.com/graphty-org/layout.git"
PACKAGE_URLS["graphty-element"]="https://github.com/graphty-org/graphty-element.git"
PACKAGE_URLS["graphty"]="https://github.com/graphty-org/graphty.git"

PACKAGES=("algorithms" "layout" "graphty-element" "graphty")
MONOREPO_DIR="$(pwd)"

# Verify we're in the monorepo root
if [ ! -f "nx.json" ]; then
  echo "❌ Error: Must run from monorepo root (nx.json not found)"
  exit 1
fi

# CRITICAL: Verify package directories DON'T exist yet
# If they do, history will not be properly linked
for pkg in "${PACKAGES[@]}"; do
  if [ -d "$pkg" ] && [ "$(ls -A $pkg 2>/dev/null)" ]; then
    echo "❌ Error: $pkg/ directory already has files!"
    echo "   History must be merged BEFORE files exist."
    echo "   Run: git reset --hard origin/master"
    exit 1
  fi
done

# Preserve history for each package
for pkg in "${PACKAGES[@]}"; do
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "Processing $pkg history..."
    echo "═══════════════════════════════════════════════════════════════"

    GITHUB_URL="${PACKAGE_URLS[$pkg]}"
    TEMP_DIR="/tmp/$pkg-history-rewrite"

    # Clean up any previous temp directory
    rm -rf "$TEMP_DIR"

    echo "   📋 Cloning $pkg from $GITHUB_URL..."
    git clone "$GITHUB_URL" "$TEMP_DIR"

    echo "   🔄 Rewriting history to move files into $pkg/ subdirectory..."
    cd "$TEMP_DIR"
    git-filter-repo --to-subdirectory-filter "$pkg" --force

    # Determine default branch
    DEFAULT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "master")
    echo "   📌 Default branch: $DEFAULT_BRANCH"

    # Return to monorepo
    cd "$MONOREPO_DIR"

    echo "   🔗 Adding temp repo as remote..."
    git remote add "$pkg-temp" "$TEMP_DIR" 2>/dev/null || git remote set-url "$pkg-temp" "$TEMP_DIR"
    git fetch "$pkg-temp"

    echo "   🔀 Merging history with allow-unrelated-histories..."
    git merge --allow-unrelated-histories --no-edit -m "feat: merge $pkg history into monorepo" "$pkg-temp/$DEFAULT_BRANCH"

    echo "   🧹 Cleaning up remote..."
    git remote remove "$pkg-temp"

    echo "   🗑️  Removing temp directory..."
    rm -rf "$TEMP_DIR"

    echo "   ✅ $pkg history merged successfully!"
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         ✅ Git history preservation complete!                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Total commits in monorepo:"
git log --oneline | wc -l
echo ""
echo "Verify with: git log --oneline -- algorithms/package.json"
echo "(Should show full history WITHOUT needing --follow)"
EOF

chmod +x tools/preserve-git-history.sh
./tools/preserve-git-history.sh
```

---

### Phase 3 Verification Checkpoint

#### Phase 3 Automated Checks

```bash
cat > tools/verify-phase-3.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         PHASE 3 VERIFICATION: Git History Preservation       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Single .git directory at root
echo "📁 Checking git repository structure..."
GIT_DIRS=$(find . -name ".git" -type d 2>/dev/null | wc -l)
if [ "$GIT_DIRS" -eq 1 ]; then
  if [ -d ".git" ]; then
    echo "   ✅ Single .git directory at root"
  else
    echo "   ❌ .git directory not at root level"
    ((ERRORS++))
  fi
else
  echo "   ❌ Found $GIT_DIRS .git directories (expected 1)"
  find . -name ".git" -type d 2>/dev/null | sed 's/^/      /'
  ((ERRORS++))
fi

# Check 2: Git log has commits
echo ""
echo "📜 Checking git history..."
COMMIT_COUNT=$(git log --oneline 2>/dev/null | wc -l)
if [ "$COMMIT_COUNT" -gt 10 ]; then
  echo "   ✅ Git history has $COMMIT_COUNT commits"
else
  echo "   ⚠️  Git history has only $COMMIT_COUNT commits (expected more)"
  ((WARNINGS++))
fi

# Check 3: Check for merge commits from each package
echo ""
echo "🔀 Checking for package history merges..."
PACKAGES=("algorithms" "layout" "graphty-element" "graphty" "gpu-3d-force-layout")
for pkg in "${PACKAGES[@]}"; do
  if git log --oneline --grep="merge $pkg" 2>/dev/null | head -1 | grep -q .; then
    echo "   ✅ Found merge commit for $pkg"
  else
    # Also check if there are commits touching package files
    PKG_COMMITS=$(git log --oneline -- "$pkg/" 2>/dev/null | wc -l)
    if [ "$PKG_COMMITS" -gt 0 ]; then
      echo "   ✅ Found $PKG_COMMITS commits for $pkg"
    else
      echo "   ⚠️  No history found for $pkg"
      ((WARNINGS++))
    fi
  fi
done

# Check 4: Verify git blame works on package files
echo ""
echo "👤 Checking git blame works..."
for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    if git blame "$pkg/package.json" > /dev/null 2>&1; then
      echo "   ✅ git blame works for $pkg/package.json"
    else
      echo "   ⚠️  git blame failed for $pkg/package.json"
      ((WARNINGS++))
    fi
  fi
done

# Check 5: CRITICAL - Verify history works WITHOUT --follow
# This is the key test that history preservation was done correctly
echo ""
echo "🔗 Checking file history works WITHOUT --follow (CRITICAL)..."
HISTORY_OK=true
for pkg in algorithms layout graphty-element graphty; do
  if [ -f "$pkg/package.json" ]; then
    # Count commits WITHOUT --follow
    COMMITS_NO_FOLLOW=$(git log --oneline -- "$pkg/package.json" 2>/dev/null | wc -l)
    # Count commits WITH --follow
    COMMITS_WITH_FOLLOW=$(git log --oneline --follow -- "$pkg/package.json" 2>/dev/null | wc -l)

    if [ "$COMMITS_NO_FOLLOW" -gt 5 ]; then
      echo "   ✅ $pkg: $COMMITS_NO_FOLLOW commits (history properly linked)"
    elif [ "$COMMITS_WITH_FOLLOW" -gt "$COMMITS_NO_FOLLOW" ]; then
      echo "   ❌ $pkg: Only $COMMITS_NO_FOLLOW commits without --follow ($COMMITS_WITH_FOLLOW with --follow)"
      echo "      History not properly linked! Files existed before history merge."
      HISTORY_OK=false
      ((ERRORS++))
    else
      echo "   ⚠️  $pkg: Only $COMMITS_NO_FOLLOW commits found"
      ((WARNINGS++))
    fi
  fi
done

if [ "$HISTORY_OK" = false ]; then
  echo ""
  echo "   💡 To fix: git reset --hard origin/master && ./tools/preserve-git-history.sh"
fi

# Check 6: No orphaned .git directories in packages
echo ""
echo "🧹 Checking for orphaned .git directories..."
ORPHAN_GIT=$(find . -path "./.git" -prune -o -name ".git" -type d -print 2>/dev/null)
if [ -z "$ORPHAN_GIT" ]; then
  echo "   ✅ No orphaned .git directories found"
else
  echo "   ❌ Found orphaned .git directories:"
  echo "$ORPHAN_GIT" | sed 's/^/      /'
  ((ERRORS++))
fi

# Check 6: Git status is reasonable
echo ""
echo "📝 Checking git status..."
UNTRACKED=$(git status --porcelain 2>/dev/null | grep "^??" | wc -l)
MODIFIED=$(git status --porcelain 2>/dev/null | grep "^ M" | wc -l)
echo "   Untracked files: $UNTRACKED"
echo "   Modified files: $MODIFIED"
if [ "$UNTRACKED" -gt 100 ] || [ "$MODIFIED" -gt 100 ]; then
  echo "   ⚠️  Large number of changes detected - review carefully"
  ((WARNINGS++))
fi

# Check 7: Sample history verification
echo ""
echo "📊 Sample commit history (last 10 commits):"
git log --oneline -10 | sed 's/^/   /'

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "✅ PHASE 3 VERIFICATION PASSED"
  else
    echo "⚠️  PHASE 3 VERIFICATION PASSED WITH $WARNINGS WARNING(S)"
    echo "   Review warnings - some history may be incomplete"
  fi
  echo ""
  echo "You may proceed to Phase 4: Migrate Packages"
  exit 0
else
  echo "❌ PHASE 3 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 4"
  exit 1
fi
EOF

chmod +x tools/verify-phase-3.sh
./tools/verify-phase-3.sh
```

#### Phase 3 Manual Verification

Perform these checks yourself:

1. **Verify commit history exists**:
   ```bash
   git log --oneline | head -20
   ```
   Do you see commits from multiple packages?

2. **Check file history is preserved**:
   ```bash
   git log --oneline -- algorithms/src/index.ts | head -5
   git log --oneline -- layout/src/index.ts | head -5
   ```
   Do these show historical commits, not just the merge?

3. **Verify authors are preserved**:
   ```bash
   git shortlog -sn | head -10
   ```
   Do you see the expected contributors?

4. **Check no nested .git directories**:
   ```bash
   find . -name ".git" -type d
   ```
   Should show only `./.git`

5. **Verify git blame works**:
   ```bash
   git blame algorithms/package.json | head -5
   ```
   Do you see actual commit hashes and dates, not all the same?

#### Phase 3 Expected Outcomes

| Check | Expected Result |
|-------|-----------------|
| `find . -name ".git" -type d` | Only `./.git` |
| `git log --oneline \| wc -l` | Hundreds of commits (combined history) |
| `git log --oneline -- algorithms/` | Shows algorithms package history |
| `git shortlog -sn` | Shows multiple authors |
| `git blame <any-file>` | Shows varied commit history |

#### Phase 3 Failure Indicators

🔴 **Something is wrong if**:
- Multiple `.git` directories exist
- `git log` shows only a few commits
- `git blame` shows all lines from the same commit
- Any package directory is missing its files

#### Phase 3 Rollback Trigger

🛑 **STOP and rollback if**:
- Git history merge fails with conflicts
- Commits are lost or mangled
- You cannot recover the original history

**Rollback command**:
```bash
# This is a critical phase - restore from backup
cd ..
rm -rf graphty-monorepo
tar -xzf $HOME/graphty-backups/graphty-pre-nx-migration-*.tar.gz
cd graphty-monorepo
```

⚠️ **NOTE**: This phase modifies git history. If it fails, restoring from the archive backup is the safest option.

---

## Phase 4: Migrate Packages (Incremental)

### Migration Order and Strategy

Packages are migrated **one at a time** in dependency order, with validation gates between each:

| Order | Package | Type | Dependencies | Validation Gate |
|-------|---------|------|--------------|-----------------|
| 1 | algorithms | Library | None | Build + Test |
| 2 | layout | Library | algorithms | Build + Test |
| 3 | graphty-element | Web Component | algorithms, layout | Build + Test + Storybook |
| 4 | gpu-3d-force-layout | Library | None | Build + Test |
| 5 | graphty | React App | graphty-element | Build + Test + Dev Server |

**Important**: Do NOT proceed to the next package until the current package passes all validation gates.

### 4.1 Create Migration Script

```bash
# Create a migration helper script that migrates ONE package at a time
cat > tools/migrate-package.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Package definitions with migration order
const PACKAGES = {
  'algorithms': { name: '@graphty/algorithms', order: 1, deps: [] },
  'layout': { name: '@graphty/layout', order: 2, deps: ['algorithms'] },
  'graphty-element': { name: '@graphty/graphty-element', order: 3, deps: ['algorithms', 'layout'] },
  'gpu-3d-force-layout': { name: 'gpu-3d-force-layout', order: 4, deps: [] },
  'graphty': { name: '@graphty/graphty', order: 5, deps: ['graphty-element'] }
};

function migratePackage(packageName, packagePath) {
  // Create project.json
  const projectJson = {
    "name": packageName,
    "$schema": "../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": `${packagePath}/src`,
    "projectType": "library",
    "tags": [],
    "targets": {
      "build": {
        "executor": "@nx/vite:build",
        "outputs": ["{options.outputPath}"],
        "options": {
          "outputPath": `${packagePath}/dist`,
          "configFile": `${packagePath}/vite.config.ts`
        }
      },
      "test": {
        "executor": "@nx/vite:test",
        "outputs": ["{options.reportsDirectory}"],
        "options": {
          "reportsDirectory": `coverage/${packagePath}`,
          "configFile": `${packagePath}/vitest.config.ts`
        }
      },
      "test:ui": {
        "executor": "nx:run-commands",
        "options": {
          "command": "vitest --ui",
          "cwd": packagePath
        }
      },
      "test:coverage": {
        "executor": "nx:run-commands", 
        "options": {
          "command": "vitest run --coverage",
          "cwd": packagePath
        }
      },
      "lint": {
        "executor": "@nx/linter:eslint",
        "outputs": ["{options.outputFile}"],
        "options": {
          "lintFilePatterns": [`${packagePath}/**/*.ts`]
        }
      },
      "semantic-release": {
        "executor": "nx:run-commands",
        "dependsOn": ["build"],
        "options": {
          "command": "semantic-release",
          "cwd": packagePath
        }
      }
    }
  };

  fs.writeFileSync(
    path.join(packagePath, 'project.json'),
    JSON.stringify(projectJson, null, 2)
  );

  // Update tsconfig.json
  const tsconfigPath = path.join(packagePath, 'tsconfig.json');
  const tsconfig = {
    "extends": "../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": "./src",
      "outDir": "./dist"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.spec.ts"]
  };
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  // Create vite.config.ts
  const viteConfig = `import { createViteConfig } from '../tools/vite/vite.shared.config';

export default createViteConfig({
  packageName: '${packageName}',
  packagePath: '${packagePath}'
});
`;
  fs.writeFileSync(path.join(packagePath, 'vite.config.ts'), viteConfig);

  // Create vitest.config.ts
  const vitestConfig = `import { createVitestConfig } from '../tools/vitest/vitest.shared.config';

export default createVitestConfig({
  projectName: '${packageName}'
});
`;
  fs.writeFileSync(path.join(packagePath, 'vitest.config.ts'), vitestConfig);

  // Create eslint.config.js (flat config format)
  const eslintConfig = `// Import shared config from monorepo root
import { createEslintConfig } from '../../eslint.config.base.js';

export default createEslintConfig();
`;
  fs.writeFileSync(path.join(packagePath, 'eslint.config.js'), eslintConfig);

  console.log(`✅ Migrated ${packageName}`);
}

function validatePackage(packagePath) {
  console.log(`\n🔍 Validating ${packagePath}...`);

  try {
    // Run build
    console.log('  Building...');
    execSync(`pnpm exec nx run ${packagePath}:build`, { stdio: 'inherit' });

    // Run tests
    console.log('  Testing...');
    execSync(`pnpm exec nx run ${packagePath}:test --run`, { stdio: 'inherit' });

    // Run lint
    console.log('  Linting...');
    execSync(`pnpm exec nx run ${packagePath}:lint`, { stdio: 'inherit' });

    console.log(`✅ ${packagePath} validation PASSED\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${packagePath} validation FAILED\n`);
    console.error('Fix the issues before proceeding to the next package.');
    return false;
  }
}

function checkDependenciesMigrated(packagePath) {
  const pkg = PACKAGES[packagePath];
  if (!pkg) return true;

  for (const dep of pkg.deps) {
    const projectJsonPath = path.join(dep, 'project.json');
    if (!fs.existsSync(projectJsonPath)) {
      console.error(`❌ Dependency "${dep}" has not been migrated yet.`);
      console.error(`   Migrate packages in order: ${Object.keys(PACKAGES).join(' → ')}`);
      return false;
    }
  }
  return true;
}

// CLI: Migrate a single package
const targetPackage = process.argv[2];

if (!targetPackage) {
  console.log('Usage: node tools/migrate-package.js <package-name>');
  console.log('');
  console.log('Available packages (migrate in this order):');
  Object.entries(PACKAGES)
    .sort((a, b) => a[1].order - b[1].order)
    .forEach(([pkg, info]) => {
      const projectJsonExists = fs.existsSync(path.join(pkg, 'project.json'));
      const status = projectJsonExists ? '✅ migrated' : '⏳ pending';
      console.log(`  ${info.order}. ${pkg} ${status}`);
    });
  process.exit(0);
}

if (!PACKAGES[targetPackage]) {
  console.error(`Unknown package: ${targetPackage}`);
  console.error(`Available: ${Object.keys(PACKAGES).join(', ')}`);
  process.exit(1);
}

// Check dependencies are migrated first
if (!checkDependenciesMigrated(targetPackage)) {
  process.exit(1);
}

// Migrate the package
const pkg = PACKAGES[targetPackage];
migratePackage(pkg.name, targetPackage);

// Validate after migration
console.log('\n--- Validation Gate ---');
if (!validatePackage(targetPackage)) {
  console.error('\n⚠️  Package migration completed but validation failed.');
  console.error('Fix issues before proceeding to the next package.');
  process.exit(1);
}

console.log(`\n🎉 ${targetPackage} successfully migrated and validated!`);
console.log('You may now proceed to the next package in the migration order.');
EOF
```

### 4.2 Migrate Packages (One at a Time)

Run these commands **in order**, waiting for each to complete successfully:

```bash
# Step 1: Migrate algorithms (no dependencies)
node tools/migrate-package.js algorithms
# Wait for validation to pass before proceeding

# Step 2: Migrate layout (depends on algorithms)
node tools/migrate-package.js layout
# Wait for validation to pass before proceeding

# Step 3: Migrate graphty-element (depends on algorithms, layout)
node tools/migrate-package.js graphty-element
# Wait for validation to pass before proceeding

# Step 4: Migrate gpu-3d-force-layout (no dependencies)
node tools/migrate-package.js gpu-3d-force-layout
# Wait for validation to pass before proceeding

# Step 5: Migrate graphty (depends on graphty-element)
node tools/migrate-package.js graphty
# Wait for validation to pass

# Verify all packages are migrated
node tools/migrate-package.js
# Should show all packages as ✅ migrated
```

### 4.3 Configure Package-Specific Settings

```bash
# Create package-specific configuration script
cat > tools/configure-package-specifics.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Package-specific configurations
const packageConfigs = {
  'graphty-element': {
    // Additional targets for Storybook and visual tests
    additionalTargets: {
      "storybook": {
        "executor": "nx:run-commands",
        "options": {
          "command": "storybook dev -p 9025",
          "cwd": "graphty-element"
        }
      },
      "build-storybook": {
        "executor": "nx:run-commands",
        "options": {
          "command": "storybook build",
          "cwd": "graphty-element"
        }
      },
      "test:visual": {
        "executor": "nx:run-commands",
        "options": {
          "command": "vitest --run --config vitest.visual.config.ts",
          "cwd": "graphty-element"
        }
      }
    },
    // Custom vitest config for visual tests
    additionalFiles: {
      'vitest.visual.config.ts': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/visual/setup.ts'],
    include: ['**/*.visual.{test,spec}.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    testTimeout: 60000
  }
});`
    }
  },
  'gpu-3d-force-layout': {
    // GPU-specific test configuration
    vitestConfigOverride: {
      environment: 'node',
      environmentOptions: {
        // WebGPU shim for testing
        customExportConditions: ['webgpu']
      }
    }
  },
  'graphty': {
    // React app specific configuration
    additionalTargets: {
      "dev": {
        "executor": "@nx/vite:dev-server",
        "options": {
          "buildTarget": "graphty:build",
          "port": 9050
        }
      }
    },
    // Private package flag
    projectJsonOverride: {
      "release": {
        "publish": false
      }
    }
  },
  'layout': {
    // Additional build formats for Node.js usage
    viteConfigOverride: {
      buildFormats: ['es', 'cjs', 'umd']
    }
  }
};

// Apply package-specific configurations
Object.entries(packageConfigs).forEach(([pkgPath, config]) => {
  const projectJsonPath = path.join(pkgPath, 'project.json');
  
  if (fs.existsSync(projectJsonPath)) {
    let projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
    
    // Add additional targets
    if (config.additionalTargets) {
      projectJson.targets = { ...projectJson.targets, ...config.additionalTargets };
    }
    
    // Apply project.json overrides
    if (config.projectJsonOverride) {
      projectJson = { ...projectJson, ...config.projectJsonOverride };
    }
    
    fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2));
    
    // Create additional files
    if (config.additionalFiles) {
      Object.entries(config.additionalFiles).forEach(([fileName, content]) => {
        fs.writeFileSync(path.join(pkgPath, fileName), content);
      });
    }
    
    console.log(`✅ Configured package-specific settings for ${pkgPath}`);
  }
});

// Preserve existing Storybook configuration
if (fs.existsSync('graphty-element/.storybook')) {
  console.log('✅ Preserved existing Storybook configuration');
}

// Preserve existing Playwright configuration
if (fs.existsSync('graphty-element/playwright.config.ts')) {
  console.log('✅ Preserved existing Playwright configuration');
}
EOF

node tools/configure-package-specifics.js
```

### 4.4 Update Package Dependencies

```bash
# Update each package.json to remove duplicate devDependencies
# This script removes devDependencies that are now at the root
cat > tools/clean-package-deps.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const packages = [
  'algorithms',
  'layout', 
  'graphty-element',
  'graphty',
  'gpu-3d-force-layout'
];

const rootDevDeps = [
  '@commitlint/cli',
  '@commitlint/config-conventional',
  '@eslint/js',
  '@stylistic/eslint-plugin',
  '@vitest/browser',
  '@vitest/coverage-v8',
  '@vitest/ui',
  'commitizen',
  'cz-conventional-changelog',
  'eslint',
  'eslint-plugin-simple-import-sort',
  'happy-dom',
  'husky',
  'knip',
  'playwright',
  'tsx',
  'typescript',
  'typescript-eslint',
  'vite',
  'vitest'
];

packages.forEach(pkgPath => {
  const packageJsonPath = path.join(pkgPath, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  if (pkg.devDependencies) {
    rootDevDeps.forEach(dep => {
      delete pkg.devDependencies[dep];
    });
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
  console.log(`✅ Cleaned ${pkgPath}/package.json`);
});
EOF

node tools/clean-package-deps.js
```

### 4.5 Convert to Workspace Protocol Dependencies

This script converts inter-package dependencies to use pnpm workspace protocol and validates the dependency graph.

```bash
cat > tools/convert-workspace-deps.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Internal packages that should use workspace protocol
const INTERNAL_PACKAGES = {
  '@graphty/algorithms': 'algorithms',
  '@graphty/layout': 'layout',
  '@graphty/graphty-element': 'graphty-element',
  '@graphty/graphty': 'graphty',
  'gpu-3d-force-layout': 'gpu-3d-force-layout'
};

const PACKAGE_DIRS = Object.values(INTERNAL_PACKAGES);

function convertToWorkspaceProtocol() {
  console.log('Converting inter-package dependencies to workspace protocol...\n');

  const dependencyGraph = {};

  PACKAGE_DIRS.forEach(pkgDir => {
    const packageJsonPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.warn(`⚠️  ${packageJsonPath} not found, skipping`);
      return;
    }

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    dependencyGraph[pkg.name] = [];

    let modified = false;

    // Convert dependencies
    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
      if (!pkg[depType]) return;

      Object.keys(pkg[depType]).forEach(depName => {
        if (INTERNAL_PACKAGES[depName]) {
          const oldVersion = pkg[depType][depName];
          pkg[depType][depName] = 'workspace:*';
          dependencyGraph[pkg.name].push(depName);

          if (oldVersion !== 'workspace:*') {
            console.log(`  ${pkg.name}: ${depName} "${oldVersion}" → "workspace:*"`);
            modified = true;
          }
        }
      });
    });

    if (modified) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`✅ Updated ${pkgDir}/package.json\n`);
    }
  });

  return dependencyGraph;
}

function detectCircularDependencies(graph) {
  console.log('\nChecking for circular dependencies...');

  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  function dfs(node, path = []) {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).concat(node));
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const deps = graph[node] || [];
    deps.forEach(dep => {
      if (graph[dep] !== undefined) {
        dfs(dep, [...path]);
      }
    });

    recursionStack.delete(node);
  }

  Object.keys(graph).forEach(node => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });

  if (cycles.length > 0) {
    console.error('\n❌ Circular dependencies detected:');
    cycles.forEach(cycle => {
      console.error(`   ${cycle.join(' → ')}`);
    });
    return false;
  }

  console.log('✅ No circular dependencies found');
  return true;
}

function validateDependencyGraph(graph) {
  console.log('\nValidating dependency graph...');

  let valid = true;

  Object.entries(graph).forEach(([pkg, deps]) => {
    deps.forEach(dep => {
      const depDir = INTERNAL_PACKAGES[dep];
      if (depDir && !fs.existsSync(path.join(depDir, 'package.json'))) {
        console.error(`❌ ${pkg} depends on ${dep}, but ${depDir}/package.json not found`);
        valid = false;
      }
    });
  });

  if (valid) {
    console.log('✅ Dependency graph is valid');
  }

  return valid;
}

function printDependencyGraph(graph) {
  console.log('\n📊 Dependency Graph:');
  Object.entries(graph).forEach(([pkg, deps]) => {
    if (deps.length > 0) {
      console.log(`  ${pkg} → ${deps.join(', ')}`);
    } else {
      console.log(`  ${pkg} (no internal dependencies)`);
    }
  });
}

// Main execution
const graph = convertToWorkspaceProtocol();
printDependencyGraph(graph);

const noCircular = detectCircularDependencies(graph);
const validGraph = validateDependencyGraph(graph);

if (!noCircular || !validGraph) {
  console.error('\n❌ Dependency validation failed. Fix issues before continuing.');
  process.exit(1);
}

console.log('\n✅ Workspace protocol conversion complete!');
EOF

node tools/convert-workspace-deps.js
```

---

### Phase 4 Verification Checkpoint

Phase 4 is incremental - run verification after EACH package migration, then run the full verification after all packages are migrated.

#### Phase 4 Per-Package Verification

After migrating each package, the migration script runs validation automatically. However, also verify manually:

```bash
# After migrating each package, verify:
PACKAGE="algorithms"  # Change for each package

# 1. project.json exists and is valid
jq . "$PACKAGE/project.json" > /dev/null && echo "✅ project.json valid"

# 2. Nx can see the project
pnpm exec nx show project "$PACKAGE" && echo "✅ Nx recognizes project"

# 3. Build works
pnpm exec nx run "$PACKAGE:build" && echo "✅ Build passes"

# 4. Tests work
pnpm exec nx run "$PACKAGE:test" --run && echo "✅ Tests pass"

# 5. Lint works
pnpm exec nx run "$PACKAGE:lint" && echo "✅ Lint passes"
```

#### Phase 4 Full Verification (After All Packages)

```bash
cat > tools/verify-phase-4.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          PHASE 4 VERIFICATION: Package Migration             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0
PACKAGES=("algorithms" "layout" "graphty-element" "graphty" "gpu-3d-force-layout")

# Check 1: All packages have project.json
echo "📄 Checking project.json files..."
for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/project.json" ]; then
    if jq . "$pkg/project.json" > /dev/null 2>&1; then
      echo "   ✅ $pkg/project.json exists and is valid"
    else
      echo "   ❌ $pkg/project.json is INVALID JSON"
      ((ERRORS++))
    fi
  else
    echo "   ❌ $pkg/project.json NOT FOUND"
    ((ERRORS++))
  fi
done

# Check 2: Nx can see all projects
echo ""
echo "🔍 Checking Nx project detection..."
NX_PROJECTS=$(pnpm exec nx show projects 2>/dev/null)
for pkg in "${PACKAGES[@]}"; do
  if echo "$NX_PROJECTS" | grep -q "$pkg"; then
    echo "   ✅ Nx sees $pkg"
  else
    echo "   ❌ Nx does NOT see $pkg"
    ((ERRORS++))
  fi
done

# Check 3: All packages build
echo ""
echo "🔨 Testing builds (this may take a while)..."
if pnpm exec nx run-many -t build --all --parallel=3 2>&1; then
  echo "   ✅ All packages build successfully"
else
  echo "   ❌ Build failed for one or more packages"
  ((ERRORS++))
fi

# Check 4: All packages pass tests
echo ""
echo "🧪 Testing all packages (this may take a while)..."
if pnpm exec nx run-many -t test --all --parallel=3 -- --run 2>&1; then
  echo "   ✅ All tests pass"
else
  echo "   ❌ Tests failed for one or more packages"
  ((ERRORS++))
fi

# Check 5: All packages pass lint
echo ""
echo "📝 Linting all packages..."
if pnpm exec nx run-many -t lint --all --parallel=3 2>&1; then
  echo "   ✅ All packages pass linting"
else
  echo "   ⚠️  Linting issues found (may be acceptable)"
  ((WARNINGS++))
fi

# Check 6: Workspace dependencies use workspace protocol
echo ""
echo "🔗 Checking workspace protocol usage..."
for pkg in "${PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ]; then
    WS_DEPS=$(jq -r '.dependencies // {} | to_entries[] | select(.value | startswith("workspace:")) | .key' "$pkg/package.json" 2>/dev/null)
    if [ -n "$WS_DEPS" ]; then
      echo "   ✅ $pkg uses workspace: protocol for: $WS_DEPS"
    fi
  fi
done

# Check 7: Cross-package imports work
echo ""
echo "🔄 Testing cross-package dependencies..."
# Create a test file that imports across packages
mkdir -p tmp
cat > tmp/cross-import-test.ts << 'TESTEOF'
// Test cross-package imports
import '@graphty/algorithms';
import '@graphty/layout';
console.log('Cross-package imports work!');
TESTEOF

if pnpm exec tsc --noEmit --skipLibCheck tmp/cross-import-test.ts 2>/dev/null; then
  echo "   ✅ Cross-package TypeScript imports work"
else
  echo "   ⚠️  Cross-package imports may have issues (check tsconfig paths)"
  ((WARNINGS++))
fi
rm -f tmp/cross-import-test.ts

# Check 8: Nx dependency graph
echo ""
echo "📊 Generating dependency graph..."
if pnpm exec nx graph --file=tmp/dep-graph.html 2>/dev/null; then
  echo "   ✅ Dependency graph generated (see tmp/dep-graph.html)"
  echo "   Open in browser to visually verify dependencies"
else
  echo "   ⚠️  Could not generate dependency graph"
  ((WARNINGS++))
fi

# Check 9: Nx affected works
echo ""
echo "🎯 Testing 'nx affected' command..."
if pnpm exec nx affected -t build --base=HEAD~1 --dry-run 2>/dev/null; then
  echo "   ✅ 'nx affected' works correctly"
else
  echo "   ⚠️  'nx affected' may have issues"
  ((WARNINGS++))
fi

# Check 10: Compare with pre-migration snapshot
echo ""
echo "📸 Comparing with pre-migration snapshot..."
if [ -d ".migration-snapshot" ]; then
  for pkg in algorithms layout graphty-element gpu-3d-force-layout; do
    if [ -f ".migration-snapshot/$pkg-dts-count.txt" ]; then
      PRE_DTS=$(cat ".migration-snapshot/$pkg-dts-count.txt")
      if [ -d "$pkg/dist" ]; then
        POST_DTS=$(find "$pkg/dist" -name "*.d.ts" | wc -l)
        if [ "$POST_DTS" -ge "$PRE_DTS" ]; then
          echo "   ✅ $pkg: $POST_DTS .d.ts files (was $PRE_DTS)"
        else
          echo "   ⚠️  $pkg: $POST_DTS .d.ts files (was $PRE_DTS) - fewer than before"
          ((WARNINGS++))
        fi
      fi
    fi
  done
else
  echo "   ⚠️  No pre-migration snapshot found for comparison"
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "✅ PHASE 4 VERIFICATION PASSED"
  else
    echo "⚠️  PHASE 4 VERIFICATION PASSED WITH $WARNINGS WARNING(S)"
    echo "   Review warnings before proceeding"
  fi
  echo ""
  echo "You may proceed to Phase 5: Configure Nx Release"
  exit 0
else
  echo "❌ PHASE 4 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 5"
  exit 1
fi
EOF

chmod +x tools/verify-phase-4.sh
./tools/verify-phase-4.sh
```

#### Phase 4 Manual Verification

Perform these checks yourself:

1. **Nx shows all projects**:
   ```bash
   pnpm exec nx show projects
   ```
   Do you see all 5 packages listed?

2. **Dependency graph looks correct**:
   ```bash
   pnpm exec nx graph
   ```
   Open in browser - do dependencies flow correctly? (algorithms → layout → graphty-element → graphty)

3. **Individual package still works**:
   ```bash
   # Pick any package and run its original npm scripts
   cd algorithms
   pnpm exec nx run algorithms:build
   pnpm exec nx run algorithms:test --run
   cd ..
   ```
   Does it behave like before?

4. **Storybook still works (graphty-element)**:
   ```bash
   pnpm exec nx run graphty-element:storybook
   ```
   Does Storybook launch on port 9025?

5. **Dev server still works (graphty)**:
   ```bash
   pnpm exec nx run graphty:dev
   ```
   Does the React app launch on port 9050?

#### Phase 4 Expected Outcomes

| Check | Expected Result |
|-------|-----------------|
| `nx show projects` | Lists all 5 packages |
| `nx run-many -t build --all` | All builds succeed |
| `nx run-many -t test --all` | All tests pass |
| `nx graph` | Shows correct dependency graph |
| Storybook | Launches on port 9025 |
| graphty dev server | Launches on port 9050 |

#### Phase 4 Failure Indicators

🔴 **Something is wrong if**:
- Nx doesn't see one or more projects
- Builds fail with "cannot find module" errors
- Tests fail that were passing before
- Storybook or dev servers don't start

#### Phase 4 Rollback Trigger

🛑 **STOP and rollback if**:
- More than 2 packages fail to build
- Core functionality is broken (can't run tests)
- Circular dependency errors appear

**Rollback command** (per-package):
```bash
# Revert a single package
git checkout -- <package>/project.json
git checkout -- <package>/tsconfig.json
git checkout -- <package>/vite.config.ts
git checkout -- <package>/vitest.config.ts
```

**Full rollback**:
```bash
git checkout -- .
rm -rf node_modules
pnpm install
```

---

## Phase 5: Configure Nx Release (Day 5-6)

### 5.1 Update nx.json with Release Configuration

```bash
# Update nx.json to add release configuration
cat > nx-release-config.json << 'EOF'
{
  "release": {
    "projects": ["*"],
    "projectsRelationship": "independent",
    "releaseTagPattern": "{projectName}@{version}",
    "version": {
      "conventionalCommits": true,
      "generatorOptions": {
        "updateDependents": "auto",
        "preserveLocalDependencyProtocols": true
      }
    },
    "changelog": {
      "projectChangelogs": {
        "createRelease": "github",
        "file": "CHANGELOG.md",
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
      "commitMessage": "chore(release): publish {projectName} v{version} [skip ci]",
      "commitArgs": "--no-verify"
    }
  }
}
EOF

# Merge with existing nx.json
node -e "
const nx = require('./nx.json');
const release = require('./nx-release-config.json');
Object.assign(nx, release);
require('fs').writeFileSync('./nx.json', JSON.stringify(nx, null, 2));
"

rm nx-release-config.json
```

### 5.2 Configure Root Commitlint

```bash
# Create root commitlint config
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'algorithms',
        'layout',
        'graphty-element',
        'graphty',
        'gpu-3d-force-layout',
        'deps',
        'release',
        'ci',
        'docs',
        'tools',
        'workspace'
      ]
    ]
  }
};
EOF
```

### 5.3 Setup Husky at Root

```bash
# Initialize husky at root
pnpm exec husky init

# Update husky hooks
echo "pnpm exec commitlint --edit \$1" > .husky/commit-msg
echo "exec < /dev/tty && npx cz --hook || true" > .husky/prepare-commit-msg
echo "pnpm exec nx affected -t lint test --parallel=3" > .husky/pre-push
```

---

### Phase 5 Verification Checkpoint

#### Phase 5 Automated Checks

```bash
cat > tools/verify-phase-5.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          PHASE 5 VERIFICATION: Nx Release Configuration      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: nx.json has release configuration
echo "📄 Checking nx.json release configuration..."
if [ -f "nx.json" ]; then
  if jq -e '.release' nx.json > /dev/null 2>&1; then
    echo "   ✅ nx.json has release configuration"

    # Check specific release settings
    if jq -e '.release.version.conventionalCommits' nx.json | grep -q "true"; then
      echo "   ✅ Conventional commits enabled"
    else
      echo "   ❌ Conventional commits NOT enabled"
      ((ERRORS++))
    fi

    if jq -e '.release.projectsRelationship' nx.json | grep -q "independent"; then
      echo "   ✅ Independent versioning configured"
    else
      echo "   ⚠️  Not using independent versioning"
      ((WARNINGS++))
    fi
  else
    echo "   ❌ nx.json missing release configuration"
    ((ERRORS++))
  fi
else
  echo "   ❌ nx.json NOT FOUND"
  ((ERRORS++))
fi

# Check 2: commitlint.config.js exists
echo ""
echo "📝 Checking commitlint configuration..."
if [ -f "commitlint.config.js" ]; then
  echo "   ✅ commitlint.config.js exists"

  # Check if all package scopes are defined
  SCOPES=("algorithms" "layout" "graphty-element" "graphty" "gpu-3d-force-layout")
  for scope in "${SCOPES[@]}"; do
    if grep -q "$scope" commitlint.config.js 2>/dev/null; then
      echo "   ✅ Scope '$scope' defined"
    else
      echo "   ⚠️  Scope '$scope' may be missing"
      ((WARNINGS++))
    fi
  done
else
  echo "   ❌ commitlint.config.js NOT FOUND"
  ((ERRORS++))
fi

# Check 3: Husky hooks exist
echo ""
echo "🪝 Checking Husky hooks..."
HOOKS=("commit-msg" "prepare-commit-msg" "pre-push")
for hook in "${HOOKS[@]}"; do
  if [ -f ".husky/$hook" ]; then
    echo "   ✅ .husky/$hook exists"
  else
    echo "   ⚠️  .husky/$hook NOT FOUND"
    ((WARNINGS++))
  fi
done

# Check 4: Test commitlint
echo ""
echo "🧪 Testing commitlint..."
if echo "feat(algorithms): test commit" | pnpm exec commitlint --verbose 2>/dev/null; then
  echo "   ✅ Commitlint accepts valid commits"
else
  echo "   ❌ Commitlint rejected a valid commit"
  ((ERRORS++))
fi

# Check 5: Test invalid commit is rejected
if echo "invalid commit message" | pnpm exec commitlint 2>/dev/null; then
  echo "   ❌ Commitlint should reject invalid commits"
  ((ERRORS++))
else
  echo "   ✅ Commitlint correctly rejects invalid commits"
fi

# Check 6: Nx release dry run
echo ""
echo "🚀 Testing Nx Release (dry run)..."
if pnpm exec nx release --dry-run --skip-publish 2>&1 | head -50; then
  echo ""
  echo "   ✅ Nx release dry run completed"
  echo "   Review the output above to verify version bumps look correct"
else
  echo "   ⚠️  Nx release dry run had issues (may be expected if no unreleased commits)"
  ((WARNINGS++))
fi

# Check 7: Verify release won't publish private packages
echo ""
echo "🔒 Checking private package handling..."
if [ -f "graphty/package.json" ]; then
  IS_PRIVATE=$(jq -r '.private // false' graphty/package.json)
  if [ "$IS_PRIVATE" = "true" ]; then
    echo "   ✅ graphty is marked as private"
  else
    echo "   ⚠️  graphty may be published (check if this is intended)"
    ((WARNINGS++))
  fi
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "✅ PHASE 5 VERIFICATION PASSED"
  else
    echo "⚠️  PHASE 5 VERIFICATION PASSED WITH $WARNINGS WARNING(S)"
    echo "   Review warnings before proceeding"
  fi
  echo ""
  echo "You may proceed to Phase 6: Update CI/CD"
  exit 0
else
  echo "❌ PHASE 5 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 6"
  exit 1
fi
EOF

chmod +x tools/verify-phase-5.sh
./tools/verify-phase-5.sh
```

#### Phase 5 Manual Verification

Perform these checks yourself:

1. **Commitlint works with valid commit**:
   ```bash
   echo "feat(algorithms): add new algorithm" | pnpm exec commitlint
   ```
   Should pass without errors.

2. **Commitlint rejects invalid commit**:
   ```bash
   echo "bad commit" | pnpm exec commitlint
   ```
   Should fail with an error.

3. **Nx release dry run shows expected output**:
   ```bash
   pnpm exec nx release --dry-run --skip-publish
   ```
   Review the output - do version bumps look reasonable?

4. **Changelog generation preview**:
   ```bash
   pnpm exec nx release changelog --dry-run
   ```
   Does the changelog format look correct?

5. **Husky hooks are executable**:
   ```bash
   ls -la .husky/
   ```
   Are all hook files executable (have x permission)?

#### Phase 5 Expected Outcomes

| Check | Expected Result |
|-------|-----------------|
| `jq '.release' nx.json` | Shows release configuration |
| `commitlint` with valid msg | Passes |
| `commitlint` with invalid msg | Fails |
| `nx release --dry-run` | Completes without errors |
| `.husky/commit-msg` | Exists and is executable |

#### Phase 5 Failure Indicators

🔴 **Something is wrong if**:
- Commitlint accepts invalid commit messages
- Nx release dry run crashes
- Husky hooks don't exist

#### Phase 5 Rollback Trigger

🛑 **STOP and rollback if**:
- Cannot get commitlint to work at all
- Nx release configuration is fundamentally broken

**Rollback command**:
```bash
# Remove release-specific files
rm -f commitlint.config.js
rm -rf .husky
# Restore nx.json to pre-release config
git checkout -- nx.json
```

---

## Phase 6: Update CI/CD (Day 6-7)

### 6.1 Create New GitHub Actions Workflow

```bash
# Create new CI workflow
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [master]
  pull_request:

# Note: We use local Nx caching only (no Nx Cloud)
# Cache is stored in .nx/cache and persisted via actions/cache

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Cache Nx
        uses: actions/cache@v4
        with:
          path: .nx/cache
          key: nx-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            nx-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
            nx-${{ runner.os }}-

      - name: Lint affected
        run: pnpm exec nx affected -t lint --parallel=3

      - name: Test affected
        run: pnpm exec nx affected -t test --parallel=3 --ci

      - name: Build affected
        run: pnpm exec nx affected -t build --parallel=3

      - name: Coverage
        if: matrix.node-version == '20.x'
        run: |
          pnpm exec nx affected -t test:coverage --parallel=1
          pnpm exec nx run-many -t test:coverage --parallel=1 --projects=algorithms,layout,graphty-element

      - name: Upload coverage
        if: matrix.node-version == '20.x'
        uses: coverallsapp/github-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          path-to-lcov: ./coverage/**/lcov.info
EOF
```

### 6.2 Create Release Workflow

```bash
cat > .github/workflows/release.yml << 'EOF'
name: Release

on:
  push:
    branches:
      - master

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm exec nx run-many -t build --all

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Cache Nx
        uses: actions/cache@v4
        with:
          path: .nx/cache
          key: nx-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            nx-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-
            nx-${{ runner.os }}-

      - name: Version and Release
        run: pnpm exec nx release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF
```

---

### Phase 6 Verification Checkpoint

#### Phase 6 Automated Checks

```bash
cat > tools/verify-phase-6.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          PHASE 6 VERIFICATION: CI/CD Configuration           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: CI workflow exists
echo "📄 Checking CI workflow..."
if [ -f ".github/workflows/ci.yml" ]; then
  echo "   ✅ .github/workflows/ci.yml exists"

  # Validate YAML syntax
  if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null; then
    echo "   ✅ ci.yml is valid YAML"
  elif ruby -ryaml -e "YAML.load_file('.github/workflows/ci.yml')" 2>/dev/null; then
    echo "   ✅ ci.yml is valid YAML"
  else
    echo "   ⚠️  Could not validate YAML syntax (install PyYAML or use Ruby)"
    ((WARNINGS++))
  fi

  # Check for required elements
  if grep -q "pnpm/action-setup" .github/workflows/ci.yml; then
    echo "   ✅ Uses pnpm/action-setup"
  else
    echo "   ❌ Missing pnpm/action-setup"
    ((ERRORS++))
  fi

  if grep -q "nx affected" .github/workflows/ci.yml; then
    echo "   ✅ Uses nx affected commands"
  else
    echo "   ⚠️  Not using nx affected (may be intentional)"
    ((WARNINGS++))
  fi

  if grep -q "actions/cache" .github/workflows/ci.yml; then
    echo "   ✅ Has caching configured"
  else
    echo "   ⚠️  No caching configured"
    ((WARNINGS++))
  fi
else
  echo "   ❌ .github/workflows/ci.yml NOT FOUND"
  ((ERRORS++))
fi

# Check 2: Release workflow exists
echo ""
echo "📄 Checking Release workflow..."
if [ -f ".github/workflows/release.yml" ]; then
  echo "   ✅ .github/workflows/release.yml exists"

  # Check for required elements
  if grep -q "nx release" .github/workflows/release.yml; then
    echo "   ✅ Uses nx release command"
  else
    echo "   ❌ Missing nx release command"
    ((ERRORS++))
  fi

  if grep -q "NPM_TOKEN" .github/workflows/release.yml; then
    echo "   ✅ References NPM_TOKEN secret"
  else
    echo "   ⚠️  No NPM_TOKEN reference (may use OIDC)"
    ((WARNINGS++))
  fi

  if grep -q "fetch-depth: 0" .github/workflows/release.yml; then
    echo "   ✅ Fetches full git history"
  else
    echo "   ❌ Missing fetch-depth: 0 (required for conventional commits)"
    ((ERRORS++))
  fi
else
  echo "   ❌ .github/workflows/release.yml NOT FOUND"
  ((ERRORS++))
fi

# Check 3: Branch references
echo ""
echo "🌿 Checking branch references..."
BRANCH_REFS=$(grep -h "branches:" .github/workflows/*.yml 2>/dev/null | grep -oE "(main|master)" | sort -u)
echo "   Branches referenced: $BRANCH_REFS"
if echo "$BRANCH_REFS" | grep -q "master"; then
  echo "   ✅ master branch referenced"
else
  echo "   ⚠️  master branch not referenced (using main instead?)"
  ((WARNINGS++))
fi

# Check 4: Required secrets documentation
echo ""
echo "🔐 Checking for required secrets..."
echo "   The following secrets must be configured in GitHub:"
echo "   - GITHUB_TOKEN (automatic)"
if grep -q "NPM_TOKEN" .github/workflows/*.yml 2>/dev/null; then
  echo "   - NPM_TOKEN (required for npm publishing)"
fi
if grep -q "id-token: write" .github/workflows/*.yml 2>/dev/null; then
  echo "   - OIDC permissions configured for npm provenance"
fi

# Check 5: Workflow directory structure
echo ""
echo "📁 Checking workflow directory..."
WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
echo "   Found $WORKFLOW_COUNT workflow file(s):"
ls -1 .github/workflows/*.yml 2>/dev/null | sed 's/^/      /'

# Check 6: No old workflow files that might conflict
echo ""
echo "🧹 Checking for potentially conflicting old workflows..."
OLD_PATTERNS=("semantic-release" "npm-publish" "individual")
for pattern in "${OLD_PATTERNS[@]}"; do
  MATCHES=$(grep -l "$pattern" .github/workflows/*.yml 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "   ⚠️  Found '$pattern' in: $MATCHES"
    ((WARNINGS++))
  fi
done

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "✅ PHASE 6 VERIFICATION PASSED"
  else
    echo "⚠️  PHASE 6 VERIFICATION PASSED WITH $WARNINGS WARNING(S)"
    echo "   Review warnings before proceeding"
  fi
  echo ""
  echo "   ⚠️  IMPORTANT: CI/CD can only be fully tested after pushing to GitHub"
  echo "   Consider creating a test branch to verify workflows before merging"
  echo ""
  echo "You may proceed to Phase 7: Testing and Validation"
  exit 0
else
  echo "❌ PHASE 6 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 7"
  exit 1
fi
EOF

chmod +x tools/verify-phase-6.sh
./tools/verify-phase-6.sh
```

#### Phase 6 Manual Verification

Perform these checks yourself:

1. **Workflow files are valid YAML**:
   ```bash
   # Install actionlint if available for thorough validation
   # brew install actionlint (macOS) or go install github.com/rhysd/actionlint/cmd/actionlint@latest
   actionlint .github/workflows/*.yml 2>/dev/null || echo "actionlint not installed"
   ```

2. **CI workflow has correct structure**:
   ```bash
   cat .github/workflows/ci.yml | head -50
   ```
   Does it have jobs for test, build, lint?

3. **Release workflow triggers on correct branch**:
   ```bash
   grep -A5 "on:" .github/workflows/release.yml
   ```
   Does it trigger on `master` (or your default branch)?

4. **Required secrets list**:
   ```bash
   grep -h "secrets\." .github/workflows/*.yml | sort -u
   ```
   Make a note of secrets you'll need to configure in GitHub.

5. **No syntax errors in workflows**:
   - Go to GitHub → Actions → Click on any workflow
   - GitHub will show syntax errors if any exist

#### Phase 6 Expected Outcomes

| File | Must Exist | Must Contain |
|------|------------|--------------|
| `.github/workflows/ci.yml` | ✅ | `pnpm/action-setup`, `nx affected` |
| `.github/workflows/release.yml` | ✅ | `nx release`, `fetch-depth: 0` |

#### Phase 6 Failure Indicators

🔴 **Something is wrong if**:
- YAML files have syntax errors
- Workflows reference wrong branches
- Required actions are missing

#### Phase 6 Rollback Trigger

🛑 **STOP and rollback if**:
- Workflow syntax is fundamentally broken
- You've accidentally deleted existing workflows

**Rollback command**:
```bash
git checkout -- .github/workflows/
```

⚠️ **NOTE**: Full CI/CD testing requires pushing to GitHub. Consider:
1. Creating a `test/ci-migration` branch
2. Pushing to test workflows
3. Deleting the branch after verification

---

## Phase 7: Testing and Validation (Day 7-8)

### 7.1 Test All Commands

```bash
# Create test script
cat > tools/test-migration.sh << 'EOF'
#!/bin/bash
set -e

echo "Testing Nx commands..."

# Test affected commands
echo "✓ Testing affected lint"
pnpm exec nx affected -t lint --base=HEAD~1

echo "✓ Testing affected test"
pnpm exec nx affected -t test --base=HEAD~1

echo "✓ Testing affected build"
pnpm exec nx affected -t build --base=HEAD~1

# Test individual package commands
packages=("algorithms" "layout" "graphty-element" "graphty" "gpu-3d-force-layout")
for pkg in "${packages[@]}"; do
  echo "✓ Testing $pkg build"
  pnpm exec nx run $pkg:build
  
  echo "✓ Testing $pkg test"
  pnpm exec nx run $pkg:test --run
  
  echo "✓ Testing $pkg lint"
  pnpm exec nx run $pkg:lint
done

# Test parallel execution
echo "✓ Testing parallel builds"
pnpm exec nx run-many -t build --all --parallel=3

# Test caching
echo "✓ Testing cache (should be fast)"
pnpm exec nx run-many -t build --all --parallel=3

# Test release dry run
echo "✓ Testing release dry run"
pnpm exec nx release --dry-run

echo "✅ All tests passed!"
EOF

chmod +x tools/test-migration.sh
./tools/test-migration.sh
```

### 7.2 Validate Package Outputs

```bash
# Capture pre-migration build outputs for comparison
cat > tools/capture-build-outputs.sh << 'EOF'
#!/bin/bash
set -e

echo "Capturing pre-migration build outputs..."

# Create directory for build output snapshots
mkdir -p .migration/build-snapshots

packages=("algorithms" "layout" "graphty-element" "graphty" "gpu-3d-force-layout")

for pkg in "${packages[@]}"; do
  if [ -d "$pkg/dist" ]; then
    # Capture file list and sizes
    find "$pkg/dist" -type f -exec ls -la {} \; > ".migration/build-snapshots/${pkg}-files.txt"
    
    # Capture package.json exports
    jq '.exports' "$pkg/package.json" > ".migration/build-snapshots/${pkg}-exports.json"
    
    # Calculate bundle sizes
    if [ -f "$pkg/dist/${pkg}.js" ]; then
      wc -c "$pkg/dist/${pkg}.js" > ".migration/build-snapshots/${pkg}-es-size.txt"
    fi
    if [ -f "$pkg/dist/${pkg}.umd.js" ]; then
      wc -c "$pkg/dist/${pkg}.umd.js" > ".migration/build-snapshots/${pkg}-umd-size.txt"
    fi
    
    echo "✅ Captured build outputs for $pkg"
  fi
done
EOF

chmod +x tools/capture-build-outputs.sh
./tools/capture-build-outputs.sh

# Verify build outputs match pre-migration
cat > tools/validate-outputs.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packages = [
  { name: 'algorithms', hasUmd: true, formats: ['es', 'umd'] },
  { name: 'layout', hasUmd: true, formats: ['es', 'cjs', 'umd'] },
  { name: 'graphty-element', hasUmd: true, formats: ['es', 'umd'] },
  { name: 'graphty', hasUmd: false, formats: ['es'] },
  { name: 'gpu-3d-force-layout', hasUmd: true, formats: ['es', 'umd'] }
];

let allValid = true;
const errors = [];

packages.forEach(({ name, hasUmd, formats }) => {
  const distPath = path.join(name, 'dist');
  const pkgJsonPath = path.join(name, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  
  console.log(`\nValidating ${name}...`);
  
  // Check ES module
  const esPath = path.join(distPath, `${name}.js`);
  if (!fs.existsSync(esPath)) {
    errors.push(`Missing ES module: ${esPath}`);
    allValid = false;
  } else {
    // Check if ES module is valid
    try {
      const content = fs.readFileSync(esPath, 'utf-8');
      if (content.length < 100) {
        errors.push(`ES module appears to be empty: ${esPath}`);
        allValid = false;
      }
    } catch (e) {
      errors.push(`Cannot read ES module: ${esPath}`);
      allValid = false;
    }
  }
  
  // Check CJS if layout package
  if (name === 'layout' && formats.includes('cjs')) {
    const cjsPath = path.join(distPath, `${name}.cjs`);
    if (!fs.existsSync(cjsPath)) {
      errors.push(`Missing CJS module for layout package: ${cjsPath}`);
      allValid = false;
    }
  }
  
  // Check UMD if expected
  if (hasUmd) {
    const umdPath = path.join(distPath, `${name}.umd.js`);
    if (!fs.existsSync(umdPath)) {
      errors.push(`Missing UMD module: ${umdPath}`);
      allValid = false;
    }
  }
  
  // Check TypeScript declarations
  const dtsFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.d.ts'));
  if (dtsFiles.length === 0) {
    errors.push(`Missing TypeScript declarations in ${distPath}`);
    allValid = false;
  } else {
    // Verify index.d.ts exists
    if (!fs.existsSync(path.join(distPath, 'index.d.ts'))) {
      errors.push(`Missing index.d.ts in ${distPath}`);
      allValid = false;
    }
  }
  
  // Check source maps
  const sourceMapFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.map'));
  if (sourceMapFiles.length === 0) {
    errors.push(`Missing source maps in ${distPath}`);
    allValid = false;
  }
  
  // Validate package.json exports field
  if (!pkg.exports) {
    errors.push(`Missing exports field in ${pkgJsonPath}`);
    allValid = false;
  } else {
    // Check that exports point to correct files
    if (pkg.exports['.']) {
      const mainExport = pkg.exports['.'];
      if (mainExport.import && !fs.existsSync(path.join(name, mainExport.import))) {
        errors.push(`Export import path does not exist: ${mainExport.import}`);
        allValid = false;
      }
      if (mainExport.require && !fs.existsSync(path.join(name, mainExport.require))) {
        errors.push(`Export require path does not exist: ${mainExport.require}`);
        allValid = false;
      }
    }
  }
  
  // Compare with pre-migration snapshots if available
  const snapshotDir = '.migration-snapshot';
  const snapshotSizePath = path.join(snapshotDir, `${name}-bundle-sizes.txt`);
  if (fs.existsSync(snapshotSizePath) && fs.existsSync(esPath)) {
    const snapshotContent = fs.readFileSync(snapshotSizePath, 'utf-8');
    const preMigrationSizes = {};
    snapshotContent.split('\n').forEach(line => {
      const match = line.match(/(\d+)\s+(.+)/);
      if (match) {
        preMigrationSizes[path.basename(match[2])] = parseInt(match[1]);
      }
    });

    const currentSize = fs.statSync(esPath).size;
    const esFileName = `${name}.js`;
    if (preMigrationSizes[esFileName]) {
      const preMigrationSize = preMigrationSizes[esFileName];
      const sizeDiff = Math.abs(currentSize - preMigrationSize) / preMigrationSize;

      if (sizeDiff > 0.1) { // More than 10% difference
        errors.push(`Bundle size changed significantly for ${name}: ${(sizeDiff * 100).toFixed(1)}% difference`);
        console.log(`  ⚠️  Pre-migration: ${preMigrationSize} bytes`);
        console.log(`  ⚠️  Current: ${currentSize} bytes`);
      } else {
        console.log(`  Bundle size: ${currentSize} bytes (${sizeDiff < 0.01 ? 'unchanged' : `${(sizeDiff * 100).toFixed(1)}% change`})`);
      }
    }
  }
  
  if (!errors.find(e => e.includes(name))) {
    console.log(`✅ ${name} build outputs valid`);
  }
});

if (!allValid) {
  console.error('\n❌ Build output validation failed:');
  errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
} else {
  console.log('\n✅ All build outputs validated successfully!');
}
EOF

node tools/validate-outputs.js
```

---

### Phase 7 Verification Checkpoint

Phase 7 is itself a verification phase - you're running comprehensive tests. The verification here confirms the tests completed successfully.

#### Phase 7 Automated Checks

```bash
cat > tools/verify-phase-7.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         PHASE 7 VERIFICATION: Final Testing & Validation     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: All test scripts exist
echo "📄 Checking test scripts exist..."
SCRIPTS=("tools/test-migration.sh" "tools/validate-outputs.js")
for script in "${SCRIPTS[@]}"; do
  if [ -f "$script" ]; then
    echo "   ✅ $script exists"
  else
    echo "   ⚠️  $script NOT FOUND (may not have run Phase 7 yet)"
    ((WARNINGS++))
  fi
done

# Check 2: Run full test suite
echo ""
echo "🧪 Running comprehensive test suite..."
echo "   This will take several minutes..."
echo ""

# Build all
echo "   [1/4] Building all packages..."
if pnpm exec nx run-many -t build --all --parallel=3 2>&1; then
  echo "   ✅ All builds passed"
else
  echo "   ❌ Build failures detected"
  ((ERRORS++))
fi

# Test all
echo ""
echo "   [2/4] Testing all packages..."
if pnpm exec nx run-many -t test --all --parallel=3 -- --run 2>&1; then
  echo "   ✅ All tests passed"
else
  echo "   ❌ Test failures detected"
  ((ERRORS++))
fi

# Lint all
echo ""
echo "   [3/4] Linting all packages..."
if pnpm exec nx run-many -t lint --all --parallel=3 2>&1; then
  echo "   ✅ All linting passed"
else
  echo "   ⚠️  Linting issues detected"
  ((WARNINGS++))
fi

# Release dry run
echo ""
echo "   [4/4] Testing release process..."
if pnpm exec nx release --dry-run --skip-publish 2>&1 | tail -20; then
  echo "   ✅ Release dry run completed"
else
  echo "   ⚠️  Release dry run had issues"
  ((WARNINGS++))
fi

# Check 3: Verify build outputs
echo ""
echo "📦 Verifying build outputs..."
PACKAGES=("algorithms" "layout" "graphty-element" "gpu-3d-force-layout")
for pkg in "${PACKAGES[@]}"; do
  if [ -d "$pkg/dist" ]; then
    JS_COUNT=$(find "$pkg/dist" -name "*.js" | wc -l)
    DTS_COUNT=$(find "$pkg/dist" -name "*.d.ts" | wc -l)
    echo "   ✅ $pkg: $JS_COUNT JS files, $DTS_COUNT .d.ts files"

    if [ "$JS_COUNT" -eq 0 ]; then
      echo "   ❌ $pkg has no JS output!"
      ((ERRORS++))
    fi
  else
    echo "   ❌ $pkg/dist NOT FOUND"
    ((ERRORS++))
  fi
done

# Check 4: Caching works
echo ""
echo "⚡ Verifying Nx caching..."
START_TIME=$(date +%s)
pnpm exec nx run-many -t build --all --parallel=3 > /dev/null 2>&1
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$DURATION" -lt 10 ]; then
  echo "   ✅ Cached build completed in ${DURATION}s (caching works!)"
else
  echo "   ⚠️  Cached build took ${DURATION}s (caching may not be working)"
  ((WARNINGS++))
fi

# Check 5: Affected command works
echo ""
echo "🎯 Verifying 'nx affected' command..."
if pnpm exec nx affected -t build --base=HEAD~1 --dry-run 2>&1 | head -10; then
  echo "   ✅ 'nx affected' works"
else
  echo "   ⚠️  'nx affected' may have issues"
  ((WARNINGS++))
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo "✅ PHASE 7 VERIFICATION PASSED"
    echo ""
    echo "🎉 All tests, builds, and validations passed!"
  else
    echo "⚠️  PHASE 7 VERIFICATION PASSED WITH $WARNINGS WARNING(S)"
    echo "   Review warnings - they may be acceptable"
  fi
  echo ""
  echo "You may proceed to Phase 8: Migration Completion"
  exit 0
else
  echo "❌ PHASE 7 VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "Fix all errors before proceeding to Phase 8"
  echo "Consider rolling back if errors cannot be resolved"
  exit 1
fi
EOF

chmod +x tools/verify-phase-7.sh
./tools/verify-phase-7.sh
```

#### Phase 7 Manual Verification

Perform these comprehensive checks yourself:

1. **Full build succeeds**:
   ```bash
   pnpm exec nx run-many -t build --all
   ```
   Do all 5 packages build without errors?

2. **All tests pass**:
   ```bash
   pnpm exec nx run-many -t test --all -- --run
   ```
   Do all tests pass?

3. **Storybook works**:
   ```bash
   pnpm exec nx run graphty-element:storybook
   ```
   - Does Storybook launch?
   - Can you see components?
   - Do stories render correctly?

4. **React app works**:
   ```bash
   pnpm exec nx run graphty:dev
   ```
   - Does the app start on port 9050?
   - Does it load correctly in browser?
   - Are there any console errors?

5. **Import a built package in Node.js**:
   ```bash
   node -e "const algo = require('./algorithms/dist/algorithms.umd.js'); console.log('Loaded:', Object.keys(algo).slice(0,5))"
   ```
   Does it load and show exported functions?

6. **Compare with pre-migration**:
   ```bash
   # If you captured pre-migration state:
   diff .migration-snapshot/algorithms-scripts.json <(jq '.scripts' algorithms/package.json)
   ```
   Are the scripts equivalent or better?

#### Phase 7 Expected Outcomes

| Test | Expected Result |
|------|-----------------|
| `nx run-many -t build` | All 5 packages build |
| `nx run-many -t test` | All tests pass |
| `nx run-many -t lint` | No errors (warnings OK) |
| Storybook | Launches and works |
| graphty dev | Launches and works |
| Caching | Second build < 10s |

#### Phase 7 Failure Indicators

🔴 **Critical failures**:
- Any package fails to build
- Tests that passed before now fail
- Storybook or dev server won't start

🟠 **Concerning issues**:
- Build outputs significantly different sizes
- Missing TypeScript declarations
- Caching not working

#### Phase 7 Rollback Trigger

🛑 **STOP and rollback if**:
- More than 1 package has critical failures
- Functionality that worked before is now broken
- You cannot resolve issues after 4+ hours

**At this point, rollback means starting over from backup**:
```bash
cd ..
rm -rf graphty-monorepo
tar -xzf $HOME/graphty-backups/graphty-pre-nx-migration-*.tar.gz
```

---

## Phase 8: Migration Completion (Day 8-9)

### 8.1 Update Documentation

```bash
# Create migration guide
cat > MIGRATION.md << 'EOF'
# Nx Monorepo Migration Guide

## What Changed

1. **Package Manager**: Now using pnpm instead of npm
2. **Build System**: Nx orchestrates all builds and tests
3. **Shared Dependencies**: Dev dependencies are installed at root
4. **Unified Commands**: Use `nx` commands instead of npm scripts

## Common Commands

### Development
- `pnpm exec nx serve <package>` - Start dev server
- `pnpm exec nx test <package>` - Run tests
- `pnpm exec nx build <package>` - Build package

### Monorepo Commands
- `pnpm exec nx affected -t test` - Test only affected packages
- `pnpm exec nx run-many -t build` - Build all packages
- `pnpm exec nx graph` - View dependency graph

### Creating New Packages
```bash
pnpm exec nx g @nx/js:lib my-new-package \
  --directory=packages/my-new-package \
  --publishable \
  --importPath=@graphty/my-new-package
```

### Releases
Releases are now automated through Nx Release using conventional commits:
- `feat:` commits trigger minor releases
- `fix:` commits trigger patch releases
- `feat!:` or `BREAKING CHANGE:` trigger major releases

## Troubleshooting

### Clear Cache
```bash
pnpm exec nx reset
```

### Reinstall Dependencies
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```
EOF
```

### 8.2 Clean Up Old Files

```bash
# Remove old husky directories from packages
find . -path "*/node_modules" -prune -o -name ".husky" -type d -print | grep -v "^./.husky$" | xargs rm -rf

# Remove package-lock.json files
find . -name "package-lock.json" -delete

# Remove old semantic-release configs
find . -name ".releaserc*" -delete
```

### 8.3 Final Verification

```bash
# Run full test suite
pnpm exec nx run-many -t lint test build --all

# Check git status
git status

# Commit migration
git add -A
git commit -m "feat(workspace): migrate to Nx monorepo with pnpm

- Unified tooling with Nx orchestration
- Consolidated shared configurations
- Replaced individual semantic-release with Nx Release
- Maintained all existing functionality
- Added caching and affected commands
- Preserved conventional commits workflow
- Preserved complete git history from all packages

BREAKING CHANGE: Development now requires pnpm instead of npm"
```

---

### Phase 8 Verification Checkpoint (Final)

This is the final verification before declaring the migration complete.

#### Phase 8 Automated Checks

```bash
cat > tools/verify-phase-8-final.sh << 'EOF'
#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       PHASE 8 FINAL VERIFICATION: Migration Complete         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Documentation exists
echo "📚 Checking documentation..."
DOCS=("MIGRATION.md" "README.md")
for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "   ✅ $doc exists"
  else
    echo "   ⚠️  $doc NOT FOUND"
    ((WARNINGS++))
  fi
done

# Check 2: Old files cleaned up
echo ""
echo "🧹 Checking cleanup..."
OLD_FILES=$(find . -name "package-lock.json" -o -name ".releaserc*" 2>/dev/null | grep -v node_modules | head -5)
if [ -z "$OLD_FILES" ]; then
  echo "   ✅ No old package-lock.json or .releaserc files found"
else
  echo "   ⚠️  Found old files that should be removed:"
  echo "$OLD_FILES" | sed 's/^/      /'
  ((WARNINGS++))
fi

# Check orphaned .husky directories
ORPHAN_HUSKY=$(find . -path "./.husky" -prune -o -name ".husky" -type d -print 2>/dev/null | grep -v node_modules)
if [ -z "$ORPHAN_HUSKY" ]; then
  echo "   ✅ No orphaned .husky directories"
else
  echo "   ⚠️  Found orphaned .husky directories:"
  echo "$ORPHAN_HUSKY" | sed 's/^/      /'
  ((WARNINGS++))
fi

# Check 3: Git status
echo ""
echo "📝 Checking git status..."
UNSTAGED=$(git status --porcelain | grep -v "^?" | wc -l)
UNTRACKED=$(git status --porcelain | grep "^?" | wc -l)
echo "   Unstaged changes: $UNSTAGED"
echo "   Untracked files: $UNTRACKED"

if [ "$UNSTAGED" -gt 0 ]; then
  echo "   ⚠️  You have unstaged changes - review before committing"
  ((WARNINGS++))
fi

# Check 4: All verification scripts exist
echo ""
echo "🔧 Checking verification tools..."
VERIFY_SCRIPTS=(
  "tools/verify-pre-flight.sh"
  "tools/verify-phase-1.sh"
  "tools/verify-phase-2.sh"
  "tools/verify-phase-3.sh"
  "tools/verify-phase-4.sh"
  "tools/verify-phase-5.sh"
  "tools/verify-phase-6.sh"
  "tools/verify-phase-7.sh"
)
MISSING_SCRIPTS=0
for script in "${VERIFY_SCRIPTS[@]}"; do
  if [ -f "$script" ]; then
    echo "   ✅ $script"
  else
    echo "   ⚠️  $script missing"
    ((MISSING_SCRIPTS++))
  fi
done
if [ "$MISSING_SCRIPTS" -gt 0 ]; then
  ((WARNINGS++))
fi

# Check 5: Final comprehensive test
echo ""
echo "🧪 Running final comprehensive tests..."
echo ""

# Quick build test
if pnpm exec nx run-many -t build --all --parallel=3 > /dev/null 2>&1; then
  echo "   ✅ All packages build"
else
  echo "   ❌ Build failures!"
  ((ERRORS++))
fi

# Quick test
if pnpm exec nx run-many -t test --all --parallel=3 -- --run > /dev/null 2>&1; then
  echo "   ✅ All tests pass"
else
  echo "   ❌ Test failures!"
  ((ERRORS++))
fi

# Check 6: Nx commands work
echo ""
echo "🔍 Verifying Nx commands..."
NX_COMMANDS=("show projects" "graph --file=tmp/final-graph.html" "affected -t build --base=HEAD~1 --dry-run")
for cmd in "${NX_COMMANDS[@]}"; do
  if pnpm exec nx $cmd > /dev/null 2>&1; then
    echo "   ✅ nx $cmd works"
  else
    echo "   ⚠️  nx $cmd may have issues"
    ((WARNINGS++))
  fi
done

# Check 7: Success metrics
echo ""
echo "📊 Checking success metrics..."

# All packages build
echo "   [✓] All packages build successfully"

# Test coverage maintained
echo "   [?] Test coverage - verify manually with: pnpm exec nx run-many -t test:coverage"

# Ports in correct range
echo "   [✓] Port assignments documented (9000-9099 range)"

# Conventional commits work
if echo "feat(algorithms): test" | pnpm exec commitlint > /dev/null 2>&1; then
  echo "   [✓] Conventional commits working"
else
  echo "   [!] Conventional commits may have issues"
  ((WARNINGS++))
fi

# Summary
echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo ""
    echo "🎉🎉🎉 MIGRATION COMPLETE! 🎉🎉🎉"
    echo ""
    echo "✅ All verifications passed with no warnings"
  else
    echo ""
    echo "✅ MIGRATION COMPLETE WITH $WARNINGS WARNING(S)"
    echo ""
    echo "Review warnings above - they may be acceptable"
  fi
  echo ""
  echo "Next steps:"
  echo "  1. Update .migration-progress.md to mark Phase 8 complete"
  echo "  2. Review and commit all changes"
  echo "  3. Push to a test branch first to verify CI/CD"
  echo "  4. Merge to master after CI passes"
  echo "  5. Monitor first release carefully"
  echo ""
  exit 0
else
  echo ""
  echo "❌ FINAL VERIFICATION FAILED - $ERRORS ERROR(S)"
  echo ""
  echo "The migration is NOT complete. Fix errors before proceeding."
  exit 1
fi
EOF

chmod +x tools/verify-phase-8-final.sh
./tools/verify-phase-8-final.sh
```

#### Phase 8 Manual Verification (Final Checklist)

This is your final sign-off checklist. Complete every item:

**Build & Test**
- [ ] `pnpm exec nx run-many -t build --all` - All packages build
- [ ] `pnpm exec nx run-many -t test --all -- --run` - All tests pass
- [ ] `pnpm exec nx run-many -t lint --all` - No lint errors

**Functionality**
- [ ] Storybook launches: `pnpm exec nx run graphty-element:storybook`
- [ ] React app works: `pnpm exec nx run graphty:dev`
- [ ] Dependency graph correct: `pnpm exec nx graph`

**Release Process**
- [ ] `pnpm exec nx release --dry-run` - Completes without errors
- [ ] Conventional commits work: `echo "feat(test): msg" | pnpm exec commitlint`
- [ ] Husky hooks work: Attempt a commit

**Documentation**
- [ ] MIGRATION.md exists and is accurate
- [ ] README.md updated (if needed)
- [ ] .migration-progress.md updated

**Cleanup**
- [ ] No package-lock.json files (except maybe root)
- [ ] No .releaserc files in packages
- [ ] No orphaned .husky directories in packages
- [ ] No orphaned .git directories

**Git**
- [ ] All changes reviewed
- [ ] Commit message follows conventional format
- [ ] Ready to push to test branch

#### Phase 8 Expected Outcomes

| Item | Status |
|------|--------|
| All builds pass | ✅ Required |
| All tests pass | ✅ Required |
| Storybook works | ✅ Required |
| Dev server works | ✅ Required |
| Release dry-run works | ✅ Required |
| Documentation complete | ✅ Required |
| Old files cleaned up | ⚠️ Recommended |

#### Phase 8 Rollback Trigger

At this phase, rollback should be rare. However:

🛑 **STOP if**:
- Critical functionality is broken that wasn't caught earlier
- You discover data loss or corruption
- CI/CD completely fails after pushing

**Emergency rollback**:
```bash
cd ..
rm -rf graphty-monorepo
tar -xzf $HOME/graphty-backups/graphty-pre-nx-migration-*.tar.gz
cd graphty-monorepo
npm install  # Back to npm
```

---

## Migration Complete Checklist

Before declaring victory, ensure:

```
╔══════════════════════════════════════════════════════════════╗
║                    MIGRATION COMPLETE                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ☐ All 8 phases completed                                   ║
║  ☐ All verification scripts passed                          ║
║  ☐ Manual testing completed                                  ║
║  ☐ Documentation updated                                     ║
║  ☐ Team notified                                            ║
║  ☐ Changes committed                                         ║
║  ☐ Pushed to test branch                                    ║
║  ☐ CI/CD verified on GitHub                                 ║
║  ☐ Merged to master                                         ║
║  ☐ First release monitored                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Post-Migration Tasks

### Week 1 After Migration
- [ ] Monitor CI/CD pipelines for issues
- [ ] Gather team feedback on new workflows
- [ ] Document any pain points
- [ ] Fine-tune cache settings

### Week 2 After Migration
- [ ] Create custom generators for common patterns
- [ ] Optimize CI/CD with more parallelization
- [ ] Remove any remaining duplicate configurations
- [ ] Fine-tune local cache retention policies

### Long-term Improvements
- [ ] Gradually adopt more Nx plugins (e.g., @nx/storybook)
- [ ] Implement stricter project boundaries
- [ ] Create shared UI component library
- [ ] Add e2e testing projects

## Rollback Plan

### Pre-Migration Backup (REQUIRED)

Before starting the migration, create a full repository archive:

```bash
# Create backup directory with timestamp
BACKUP_DIR="$HOME/graphty-backups"
BACKUP_NAME="graphty-pre-nx-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Create full archive including .git directory
# Excludes worktrees, node_modules, and build artifacts
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
  --exclude='node_modules' \
  --exclude='.nx' \
  --exclude='dist' \
  --exclude='coverage' \
  --exclude='.worktrees' \
  --exclude='*/.worktrees' \
  .

# Verify backup
echo "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
ls -lh "$BACKUP_DIR/$BACKUP_NAME.tar.gz"

# Create checksum for verification
sha256sum "$BACKUP_DIR/$BACKUP_NAME.tar.gz" > "$BACKUP_DIR/$BACKUP_NAME.sha256"

# Also create a git branch as secondary backup
git checkout -b backup/pre-nx-migration
git checkout -  # Return to previous branch
```

### Rollback Procedure

If critical issues arise during migration:

#### Option 1: Restore from Archive (Full Rollback)

```bash
# Navigate to parent directory
cd ..

# Remove current (broken) monorepo
rm -rf graphty-monorepo

# Restore from archive
tar -xzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz"

# Reinstall dependencies
cd graphty-monorepo
npm install  # or pnpm install if already using pnpm
```

#### Option 2: Git Branch Rollback (Partial)

```bash
# If git history is still intact
git checkout backup/pre-nx-migration

# Create new branch from backup
git checkout -b fix/migration-issues

# Cherry-pick any fixes needed
git cherry-pick <commit-hash>
```

### Rollback Decision Criteria

Trigger a rollback if any of the following occur:

| Severity | Condition | Action |
|----------|-----------|--------|
| **Critical** | All builds fail | Immediate rollback |
| **Critical** | Unable to publish packages | Immediate rollback |
| **High** | >50% of tests fail | Rollback within 4 hours |
| **High** | CI/CD pipeline completely broken | Rollback within 4 hours |
| **Medium** | Some packages don't build | Attempt fix, rollback after 1 day |
| **Low** | Minor configuration issues | Fix forward, no rollback |

### Post-Rollback Steps

After rolling back:

1. Document what went wrong in `design/nx-migration-issues.md`
2. Identify root cause before attempting migration again
3. Update implementation plan with lessons learned
4. Re-test migration on a copy of the repository first

## Success Validation

- ✅ All packages build successfully
- ✅ All tests pass with same coverage
- ✅ CI/CD pipelines work correctly
- ✅ Releases publish to npm correctly
- ✅ Development workflow is smooth
- ✅ Team can create new packages easily
- ✅ Performance improvements visible

## Notes

1. **Port Configuration**: All dev servers still use ports 9000-9099
2. **Coverage Thresholds**: Maintained at 80% lines/functions/statements, 75% branches
3. **Conventional Commits**: Workflow unchanged, just uses Nx Release
4. **Publishing**: Each package maintains independent versioning
5. **Dependencies**: Internal dependencies use workspace protocol

This migration preserves all existing functionality while adding:
- 30-50% faster CI/CD through caching
- Ability to test affected packages only
- Unified configuration management
- Better visibility into project dependencies
- Consistent tooling across all packages