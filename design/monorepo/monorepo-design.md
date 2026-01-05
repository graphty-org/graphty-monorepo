# Monorepo Design Document for Graphty

## Executive Summary

This document provides a comprehensive analysis of modern monorepo frameworks and their suitability for migrating the Graphty project to a monorepo structure. Based on extensive research of current best practices, popular open-source projects, and tool comparisons, this document recommends the most suitable approach for achieving:

1. Unified tooling (GitHub Actions, semantic-release, TypeScript, ESLint, builds, Storybook, Vite, Vitest)
2. Cross-dependency testing without publishing
3. Easy creation of new packages and refactoring capabilities

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Monorepo Tool Options](#monorepo-tool-options)
3. [Detailed Tool Comparisons](#detailed-tool-comparisons)
4. [Semantic Release Strategies](#semantic-release-strategies)
5. [Best Practices Research](#best-practices-research)
6. [Recommendations](#recommendations)
7. [Implementation Strategy](#implementation-strategy)

## Current State Analysis

Graphty currently consists of 5 packages in a single folder:

- **@graphty/algorithms** - Graph algorithms library (v1.2.0)
- **@graphty/layout** - Graph layout algorithms (v1.2.9)
- **@graphty/graphty-element** - Web Component for visualization (v1.0.4)
- **@graphty/graphty** - React wrapper application (private)
- **gpu-3d-force-layout** - GPU-accelerated layout engine (v1.0.0)

Each package currently maintains its own:

- TypeScript configuration
- Build tools
- Testing setup
- Linting configuration
- Dependencies

## Monorepo Tool Options

### 1. **Turborepo** (by Vercel)

**Overview**: A high-performance build system optimized for JavaScript and TypeScript, written in Rust.

**Key Features**:

- Incremental builds with intelligent caching
- Remote caching capabilities
- Pipeline-based task orchestration
- Zero-config setup for existing monorepos

**Pros**:

- Extremely fast build times
- Easy to adopt (5-minute setup)
- Excellent Vercel deployment integration
- Strong community adoption
- Active development by Vercel

**Cons**:

- Limited to build orchestration (not a full monorepo solution)
- No distributed task execution across multiple machines
- Requires manual configuration for each task in turbo.json

**Best For**: Teams prioritizing build performance and simplicity

**References**:

- [Official Turborepo Repository](https://github.com/vercel/turborepo)
- [Turborepo Examples](https://github.com/vercel/turborepo/tree/main/examples)
- [State of JS 2024 - Monorepo Tools](https://2024.stateofjs.com/en-US/libraries/monorepo_tools/)

### 2. **Nx** (by Nrwl)

**Overview**: A comprehensive monorepo toolkit with advanced features and extensive tooling.

**Key Features**:

- Project graph visualization
- Affected commands (build/test only changed code)
- Distributed task execution
- Code generation and scaffolding
- Plugin ecosystem
- Integrated development experience
- **Nx Release**: Built-in semantic versioning with conventional commits support

**Pros**:

- Most feature-rich solution
- Excellent for large organizations
- Advanced caching with tree diffing
- Can distribute tasks across 50+ machines
- Now maintains Lerna (acquired in 2022)
- Strong TypeScript support
- **Native monorepo semantic release** without external tools
- **Powerful code generation** for consistent project structure

**Cons**:

- Steeper learning curve
- More complex configuration
- Can be overkill for smaller projects

**Best For**: Large teams needing advanced features and scalability

**References**:

- [Nx Official Documentation](https://nx.dev)
- [Nx vs Turborepo Comparison](https://www.wisp.blog/blog/nx-vs-turborepo-a-comprehensive-guide-to-monorepo-tools)
- [Monorepo Benchmarks](https://github.com/demiters/monorepo-benchmarks)

### 3. **Lerna** (maintained by Nx)

**Overview**: One of the first JavaScript monorepo tools, now powered by Nx under the hood.

**Key Features**:

- Package versioning and publishing
- Conventional commits support
- Bootstrap and link packages
- Run commands across packages

**Pros**:

- Mature and stable
- Excellent for package publishing workflows
- Now includes Nx caching capabilities (v6+)
- Large ecosystem adoption

**Cons**:

- Was unmaintained for a period
- More limited than modern alternatives
- Now essentially a wrapper around Nx

**Best For**: Projects focused on package publishing

**References**:

- [Lerna Repository](https://github.com/lerna/lerna)
- [Lerna vs Turborepo vs Rush](https://byteofdev.com/posts/lerna-vs-turbopack-rush/)

### 4. **Rush** (by Microsoft)

**Overview**: Enterprise-grade monorepo manager designed for large TypeScript projects.

**Key Features**:

- Deterministic installs
- Phantom dependency prevention
- Enterprise policies
- Built-in support for pnpm
- Change log generation

**Pros**:

- Battle-tested at Microsoft scale
- Strong enterprise features
- Excellent for TypeScript projects
- Deterministic builds

**Cons**:

- More complex setup
- Doesn't integrate with npm workspaces
- Steeper learning curve
- Less community adoption

**Best For**: Enterprise teams with strict requirements

**References**:

- [Rush Official Site](https://rushjs.io/)
- [Microsoft Rush Example](https://github.com/microsoft/rush-example)
- [Rush Stack Repository](https://github.com/microsoft/rushstack)

### 5. **pnpm Workspaces**

**Overview**: Built-in monorepo support in pnpm package manager.

**Key Features**:

- Efficient disk space usage
- Fast installations
- Workspace protocol
- Content-addressed storage

**Pros**:

- No additional tooling needed
- Excellent performance
- Strict dependency isolation
- Growing adoption

**Cons**:

- Limited to package management
- No build orchestration
- Requires additional tools for full monorepo features

**Best For**: Simple monorepos or as a foundation with other tools

**References**:

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Setup Monorepo with pnpm](https://dev.to/vinomanick/create-a-monorepo-using-pnpm-workspace-1ebn)
- [pnpm + Nx Guide](https://nx.dev/blog/setup-a-monorepo-with-pnpm-workspaces-and-speed-it-up-with-nx)

### 6. **Moon** (by Moonrepo)

**Overview**: Next-generation build system written in Rust with integrated toolchain management.

**Key Features**:

- Integrated toolchain (automatic tool installation)
- Task inheritance
- Smart hashing
- Multi-language support

**Pros**:

- Modern approach with Rust performance
- Eliminates tool version inconsistencies
- Task inheritance reduces configuration
- Repository management features

**Cons**:

- Newer tool with smaller community
- Less ecosystem integration
- Limited documentation compared to alternatives

**Best For**: Teams wanting cutting-edge tooling with integrated version management

**References**:

- [Moon GitHub Repository](https://github.com/moonrepo/moon)
- [Moon Feature Comparison](https://moonrepo.dev/docs/comparison)
- [Moon Examples](https://github.com/moonrepo/examples)

## Detailed Tool Comparisons

### Performance Comparison

| Tool      | Local Caching | Remote Caching | Distributed Execution | Incremental Builds |
| --------- | ------------- | -------------- | --------------------- | ------------------ |
| Turborepo | ✅            | ✅             | ❌                    | ✅                 |
| Nx        | ✅            | ✅             | ✅                    | ✅                 |
| Lerna     | ✅ (v6+)      | ✅ (with Nx)   | ❌                    | ✅                 |
| Rush      | ✅            | ✅             | ✅                    | ✅                 |
| pnpm      | ❌            | ❌             | ❌                    | ❌                 |
| Moon      | ✅            | ✅             | ❌                    | ✅                 |

### Feature Comparison

| Feature                 | Turborepo | Nx   | Lerna   | Rush   | pnpm   | Moon |
| ----------------------- | --------- | ---- | ------- | ------ | ------ | ---- |
| Task Orchestration      | ✅        | ✅   | Limited | ✅     | ❌     | ✅   |
| Affected Commands       | ✅        | ✅   | ✅      | ✅     | ❌     | ✅   |
| Code Generation         | ❌        | ✅   | ❌      | ❌     | ❌     | ✅   |
| Plugin System           | ❌        | ✅   | ❌      | ✅     | ❌     | ✅   |
| Integrated Toolchain    | ❌        | ❌   | ❌      | ❌     | ❌     | ✅   |
| TypeScript Project Refs | Manual    | Auto | Manual  | Manual | Manual | Auto |

### Ecosystem & Community

Based on npm downloads and GitHub stars (as of 2024):

1. **Lerna**: Highest adoption due to legacy, but declining
2. **Nx**: Rapidly growing, highest feature velocity
3. **Turborepo**: Fast growth since Vercel acquisition
4. **pnpm**: Growing as preferred package manager
5. **Rush**: Stable but limited to enterprise
6. **Moon**: Newest, smallest community

## Semantic Release Strategies

### Overview

Semantic release in monorepos presents unique challenges due to multiple packages with interdependencies. After comprehensive research of 9 release management tools, three main approaches emerge:

### 1. **Conventional Commits-Based Tools**

These automatically determine versions from git commit messages:

#### **semantic-release**

- ❌ **Monorepo Support**: None (designed for single packages)
- **Workarounds**: multi-semantic-release, semantic-release-monorepo plugins
- **Status**: Not recommended for monorepos

#### **Nx Release**

- ✅ **Monorepo Support**: Native
- **Features**: Conventional commits, independent/fixed versioning, dependency updates
- **Best For**: Teams already using Nx

#### **release-please** (by Google)

- ✅ **Monorepo Support**: Native via manifest files
- **Features**: PR-based releases, GitHub integration, multi-language support
- **Best For**: Teams wanting Google's engineering practices

### 2. **Change File-Based Tools**

These use explicit change files instead of parsing commits:

#### **Changesets** (Recommended)

- ✅ **Monorepo Support**: Purpose-built for monorepos
- **Adoption**: 1.4M weekly downloads
- **Features**: Markdown change files, dependency management, PR review workflow
- **Best For**: Most monorepo projects

#### **Beachball** (by Microsoft)

- ✅ **Monorepo Support**: Native, optimized for scale
- **Features**: JSON change files, performance optimized, grouped changes
- **Best For**: Large enterprise monorepos

### 3. **Hybrid/Flexible Tools**

These support multiple versioning strategies:

#### **Auto** (by Intuit)

- ✅ **Monorepo Support**: Native
- **Features**: PR label-based versioning, extensive plugins
- **Best For**: Teams preferring PR workflows

#### **release-it**

- ✅ **Monorepo Support**: Via plugins
- **Features**: Interactive and automated modes, flexible configuration
- **Best For**: Teams wanting gradual migration

### Recommendation for Graphty

**Primary**: Changesets

- Native monorepo design
- Best developer experience
- Proven at scale

**If using Nx**: Nx Release

- Zero additional configuration
- Integrated with Nx toolchain
- Conventional commits support

**If committed to conventional commits**: release-please

- Strong GitHub integration
- Manifest-based configuration
- Google's best practices

## Best Practices Research

### From Medium and Tech Blogs

1. **TypeScript Configuration**:
    - Use TypeScript Project References for better build performance
    - Maintain a base tsconfig.json that all packages extend
    - Enable composite and incremental compilation

2. **Package Management**:
    - Prefer pnpm for efficiency and strict dependency management
    - Use workspace protocol for local package dependencies
    - Implement strict version policies

3. **Code Organization**:
    - Separate apps from libraries
    - Create shared packages for common utilities
    - Use consistent naming conventions

4. **Build Strategy**:
    - Implement caching at multiple levels
    - Use affected commands in CI/CD
    - Parallelize independent tasks

### From Popular GitHub Projects

**Analyzed Projects**:

- Babel (uses custom solution with Yarn workspaces)
- Microsoft React Native Windows (uses Yarn workspaces)
- Vercel Examples (uses Turborepo)
- Various Nx Examples (React, Next.js integrations)

**Key Patterns**:

1. Most projects use either Nx or Turborepo for modern setups
2. pnpm is increasingly preferred over npm/yarn
3. TypeScript project references are standard for TS monorepos
4. Automated tooling for dependency management is critical

## Recommendations

### Updated Recommendation: **Nx + pnpm**

Based on comprehensive analysis and your team's existing use of conventional commits, the optimal stack for Graphty is:

**Build & Orchestration**: Nx

- Powerful code generation for new packages
- Built-in affected commands
- Project graph understanding
- **Nx Release**: Native monorepo semantic versioning

**Package Manager**: pnpm

- Efficient disk usage
- Strict dependency isolation
- Fast installations
- Industry standard for monorepos

**Release Management**: Nx Release (built into Nx)

- Uses conventional commits (same as your current workflow)
- Native monorepo support
- Zero additional configuration
- Fully automated releases

**Rationale**:

1. **Smooth migration**: Keep using conventional commits like with semantic-release
2. **Single tool solution**: Nx handles builds AND releases
3. **Proven approach**: Used by Angular, React Native Windows, and enterprise projects
4. **Simpler toolchain**: No need for additional release tools
5. **Full automation**: Commit → version → release without manual steps

### Configuration

```json
// nx.json
{
    "release": {
        "projects": ["packages/*"],
        "projectsRelationship": "independent",
        "version": {
            "conventionalCommits": true,
            "generatorOptions": {
                "updateDependents": "auto"
            }
        },
        "changelog": {
            "projectChangelogs": {
                "createRelease": "github"
            }
        }
    }
}
```

### Alternative Stack

**If you want change files**: Nx + pnpm + Changesets

- More flexible commit messages
- Explicit version control
- Better for teams without conventional commit discipline

### Why This is Better for Graphty

Your team already:

- Uses semantic-release with conventional commits
- Has established commit discipline
- Wants automated releases

Nx Release provides the same workflow but with proper monorepo support, making it the natural evolution from your current setup.

---

## Decision Record: Nx Release vs Changesets

### Decision

**We chose Nx Release over Changesets because we want to continue using conventional commits.**

### Context

During the design phase, we evaluated 9 different release management tools for monorepos. The semantic release strategy documents (`semantic-release-monorepo-strategy.md` and `semantic-release-monorepo-strategy-v2.md`) initially recommended **Changesets** as the primary choice due to its:

- Purpose-built monorepo design
- Massive adoption (1.4M weekly downloads)
- Flexible commit messages
- Explicit version control through change files

However, Changesets uses a **change file-based workflow** where developers create explicit `.changeset/*.md` files to describe version bumps, rather than deriving versions from commit messages.

### Rationale for Choosing Nx Release

We chose Nx Release because:

1. **We want to use conventional commits** - Our team has established discipline around conventional commit messages (`feat:`, `fix:`, `feat!:`, etc.) and we want to preserve this workflow rather than adopt a new change file-based approach.

2. **Automated version derivation** - With conventional commits, version bumps are automatically determined from git history. This aligns with our preference for automation over manual steps.

3. **Workflow continuity** - We currently use semantic-release with conventional commits. Nx Release provides the same developer experience but with proper monorepo support.

4. **Single tool solution** - Since we're already adopting Nx for build orchestration, using Nx Release means one less tool to configure and maintain.

### Trade-offs Acknowledged

By choosing Nx Release over Changesets, we accept these trade-offs:

| What we gain                           | What we give up                                                           |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Automated versioning from commits      | Explicit control over each version bump                                   |
| No additional workflow steps           | Ability to review version changes before release                          |
| Familiar conventional commits workflow | Flexibility to write user-focused changelog entries separate from commits |
| Tighter Nx integration                 | Independence from Nx ecosystem                                            |

### When to Reconsider

Consider switching to Changesets if:

- Commit message discipline becomes difficult to maintain
- We need more control over changelog content
- We want to decouple version decisions from commit time
- We need to support complex release scenarios (e.g., batching changes, pre-releases with editorial control)

### Date

This decision was made during the initial monorepo migration design phase (2024).

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

1. **Migrate to pnpm workspaces**
    ```bash
    npm install -g pnpm
    pnpm init
    ```
2. **Create workspace configuration**
    ```yaml
    # pnpm-workspace.yaml
    packages:
        - "packages/*"
    ```
3. **Add Nx to existing monorepo**
    ```bash
    npx nx@latest init
    ```
4. **Consolidate configurations**
    - TypeScript base config
    - Shared ESLint rules
    - Common Vitest setup

### Phase 2: Build & Release System (Week 2)

1. **Configure Nx with Release**
    ```json
    // nx.json
    {
        "tasksRunnerOptions": {
            "default": {
                "runner": "nx/tasks-runners/default",
                "options": {
                    "cacheableOperations": ["build", "test", "lint"]
                }
            }
        },
        "release": {
            "projects": ["packages/*"],
            "projectsRelationship": "independent",
            "version": {
                "conventionalCommits": true
            }
        }
    }
    ```
2. **Test release workflow**
    ```bash
    # Dry run to see what would happen
    nx release --dry-run
    ```
3. **Configure GitHub Actions**
    - Automated releases on main branch
    - Conventional commit validation
    - NPM publishing setup

### Phase 3: Migration & Tooling (Week 3)

1. **Migrate existing packages**
    - Update import paths
    - Configure project.json for each
    - Set up build pipelines
2. **Create first generated package**
    ```bash
    npx nx g @nx/js:lib new-package --publishable
    ```
3. **Unify CI/CD**
    - GitHub Actions for releases
    - Automated testing
    - Changeset validation

### Phase 4: Optimization & Documentation (Week 4)

1. **Enable advanced features**
    - Nx Cloud for distributed caching
    - Affected commands optimization
    - Parallel execution
2. **Document workflows**
    - Release process
    - Package creation
    - Development guidelines
3. **Team training**
    - Changeset workflow
    - Nx commands
    - Best practices

### Migration Checklist

- [ ] Back up current repository
- [ ] Install pnpm globally
- [ ] Create pnpm-workspace.yaml
- [ ] Run `npx nx@latest init`
- [ ] Configure Nx Release with conventional commits
- [ ] Migrate each package to use Nx
- [ ] Set up shared configurations
- [ ] Configure GitHub Actions for automated releases
- [ ] Test release workflow with `--dry-run`
- [ ] Create developer documentation
- [ ] Verify conventional commit compliance
- [ ] Run parallel testing period
- [ ] Deprecate semantic-release

## Conclusion

After comprehensive analysis including semantic release strategies and tool capabilities, the recommended stack of **Nx + pnpm** provides the optimal solution for Graphty's monorepo needs.

Key insights from our research:

1. **Semantic-release is incompatible with monorepos** - But Nx Release solves this with native support
2. **Conventional commits are already part of your workflow** - No need to change team habits
3. **Nx provides a complete solution** - Build orchestration, code generation, AND semantic releases
4. **pnpm is the clear package manager choice** - Performance and strict dependency isolation

This stack provides:

- **Minimal migration friction**: Keep using conventional commits as you do today
- **Single tool solution**: Nx handles everything from builds to releases
- **Full automation**: Every merge to main can trigger automatic versioning and publishing
- **Future flexibility**: Can adopt more Nx features as needed

The beauty of this approach is its simplicity - you're essentially getting a "monorepo-aware semantic-release" through Nx Release, making it the natural evolution from your current setup. The JavaScript ecosystem has matured to the point where monorepo tooling "just works" with the right stack.
