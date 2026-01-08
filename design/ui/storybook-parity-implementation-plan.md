# Implementation Plan for Storybook Parity

## ⚠️ CRITICAL REQUIREMENT

**STORIES MUST USE IMPLEMENTATIONS FROM THE ALGORITHMS PACKAGE**

- All algorithm stories MUST import and use the actual algorithm functions from `@graphty/algorithms`
- All layout stories MUST import and use the actual layout functions from `@graphty/layout`
- Stories are demonstrations of the package functionality, NOT re-implementations
- For animations, use the algorithm result to drive visualization (e.g., use `order` array from traversal result)
- If an algorithm doesn't provide enough data for animation, consider adding optional callbacks to the algorithm API

**Why this matters:**
- Stories serve as living documentation of actual package behavior
- Re-implementing algorithms defeats the purpose of demonstrating the package
- Bugs in re-implementations won't reflect actual package behavior
- Users should see exactly what they get when they use the package

**Package Usage Verification Checklist** (run after every phase):
1. **Import Check**: `grep -rn "from \"@graphty/algorithms\"" stories/` - every story must import from package
2. **Usage Check**: Verify each imported function is actually called (not just imported)
3. **Result Check**: Verify algorithm results are used for visualization (not called then discarded)
4. **No Re-implementation**: Animation steps should NOT re-implement the algorithm - use callbacks, result data, or before/after patterns instead

**Acceptable Animation Patterns:**
- **Centrality/Community/Clustering**: Before/after using algorithm result (no re-implementation needed)
- **Traversal**: Use `visitCallback` option to capture steps during real algorithm execution
- **Shortest Path**: Call algorithm for final result; if step animation needed, document that algorithm lacks callback support

**Unacceptable Patterns:**
- Importing algorithm but not calling it
- Calling algorithm but discarding result
- Re-implementing algorithm logic to generate animation steps (unless algorithm lacks callback support)

---

## Overview

Convert 47 HTML demos (30+ algorithm demos and 17 layout demos) from the `@graphty/algorithms` and `@graphty/layout` packages to Storybook stories with:

- **Deterministic visual testing** via Chromatic
- **Interactive controls** replacing HTML inputs
- **Reproducible graph generation** with seeded randomness
- **Standalone package configurations** following graphty's pattern

## Phase Breakdown

### Phase 1: Storybook Setup ✅ COMPLETE

**Objective**: Set up working Storybook instances for both algorithms and layout packages, following the same configuration pattern as graphty.

**Implementation**:
1. `algorithms/.storybook/main.ts`: Minimal config (no viteFinal needed for server config—see note below)
2. `algorithms/.storybook/preview.ts`: Preview configuration
3. `algorithms/.storybook/DocumentationTemplate.mdx`: Doc template
4. `layout/.storybook/main.ts`: Minimal config (no viteFinal needed for server config)
5. `layout/.storybook/preview.ts`: Preview configuration
6. `layout/.storybook/DocumentationTemplate.mdx`: Doc template
7. ~~`algorithms/stories/HelloWorld.stories.ts`: Minimal test story~~ (removed after Phase 2)
8. ~~`layout/stories/HelloWorld.stories.ts`: Minimal test story~~ (to be removed after layout stories added)

> **Implementation Note: Server Configuration**
>
> The `.storybook/main.ts` files do NOT configure server settings (host, port, HTTPS) in `viteFinal` because Storybook runs Vite in **middleware mode** (`middlewareMode: true`), which means Vite doesn't create its own HTTP server. Instead, server configuration is passed via CLI args in the npm script, which sources the monorepo root `.env` file:
>
> ```bash
> . ../.env 2>/dev/null; storybook dev -p ${PORT:-6006} --host ${HOST:-localhost} ${HTTPS_CERT_PATH:+--https --ssl-cert $HTTPS_CERT_PATH --ssl-key $HTTPS_KEY_PATH} --no-open
> ```
>
> For regular Vite dev servers (`npm run serve`, `npm run examples`), the `vite.config.js` loads env from the monorepo root using Vite's `loadEnv()` directly.

**Dependencies**:
- External: `@storybook/html-vite`, `@storybook/addon-docs`, `@chromatic-com/storybook`, `storybook`, `chromatic`
- Internal: None (foundation phase)

**Verification** ✅:
1. Run: `cd algorithms && npm run storybook` (port 9001) - ✅ Works
2. Run: `cd layout && npm run storybook` (port 9011) - ✅ Works
3. Accessible via HTTPS at dev.ato.ms - ✅ Works
4. ~~HelloWorld stories render without errors~~ - Removed, replaced by actual stories

---

### Phase 2: Traversal Algorithm Stories (2 stories) ✅ COMPLETE

**Status**: Complete. Stories use actual `breadthFirstSearch` and `depthFirstSearch` implementations from `@graphty/algorithms` with `visitCallback` to capture traversal steps for animation. Stories use Storybook play functions for Chromatic visual testing.

**Objective**: Convert BFS and DFS demos to Storybook stories with step-by-step animation, establishing the pattern for algorithm stories.

**Story Structure**:
- Title: `Traversal`
- Stories: `BFS`, `DFS`
- Sidebar: Traversal > BFS, Traversal > DFS

**Implementation**:
1. `algorithms/stories/traversal/BFS.stories.ts`:
   - **MUST use `breadthFirstSearch()` from `@graphty/algorithms`**
   - Uses `visitCallback` option to capture traversal steps during algorithm execution
   - Uses `tree` map from result to get parent-child relationships
   - Animation controls (play/pause/step/reset)
   - **Play function** clicks Play button and waits for completion (for Chromatic)
   - Storybook controls: nodeCount, graphType, startNode, animationSpeed, seed

2. `algorithms/stories/traversal/DFS.stories.ts`:
   - **MUST use `depthFirstSearch()` from `@graphty/algorithms`**
   - Same pattern as BFS but with stack visualization instead of queue
   - **Play function** for Chromatic testing

3. `algorithms/stories/utils/`: Package-local utilities
   - `graph-generators.ts`: Seeded graph generation (Mulberry32 PRNG)
   - `visualization.ts`: SVG rendering helpers for graphs and animations

**Dependencies**:
- External: `@storybook/test` (for play function utilities)
- Internal: Phase 1 infrastructure, `@graphty/algorithms` exports

**Verification** ✅:
1. Run: `cd algorithms && npm run storybook` ✅
2. Navigate to `Traversal > BFS` ✅
3. Click "Play" button to verify animation plays ✅
4. Change controls (nodeCount, graphType, seed) - visualization should update ✅
5. Play function runs animation to completion for Chromatic snapshots ✅
6. **Verified algorithm result matches actual `breadthFirstSearch`/`depthFirstSearch` output** ✅

---

### Phase 3: Shortest Path & Centrality Stories (10 stories) ✅ COMPLETE

**Status**: Complete. All stories import and use algorithms from `@graphty/algorithms`. Centrality stories use before/after pattern with real algorithm results. Shortest path stories call real algorithms and use results for final display; step animations simulate algorithm for visualization (algorithms lack callback support for step-by-step observation).

**Objective**: Convert 3 shortest path demos and 7 centrality demos to Storybook stories.

**Story Structure**:
- Title: `ShortestPath` - Stories: `Dijkstra`, `BellmanFord`, `FloydWarshall`
- Title: `Centrality` - Stories: `Degree`, `PageRank`, `Betweenness`, `Closeness`, `Eigenvector`, `Katz`, `HITS`

**Implementation** (All stories use play functions):
1. `algorithms/stories/shortest-path/Dijkstra.stories.ts` - **Play function** (step-by-step path discovery)
2. `algorithms/stories/shortest-path/BellmanFord.stories.ts` - **Play function** (step-by-step relaxation)
3. `algorithms/stories/shortest-path/FloydWarshall.stories.ts` - **Play function** (step-by-step matrix updates)
4. `algorithms/stories/centrality/Degree.stories.ts` - **Play function** (before/after heat map)
5. `algorithms/stories/centrality/PageRank.stories.ts` - **Play function** (before/after heat map)
6. `algorithms/stories/centrality/Betweenness.stories.ts` - **Play function** (before/after heat map)
7. `algorithms/stories/centrality/Closeness.stories.ts` - **Play function** (before/after heat map)
8. `algorithms/stories/centrality/Eigenvector.stories.ts` - **Play function** (before/after heat map)
9. `algorithms/stories/centrality/Katz.stories.ts` - **Play function** (before/after heat map)
10. `algorithms/stories/centrality/HITS.stories.ts` - **Play function** (before/after dual heat map)

**Play Function Patterns**:

*Shortest Path (step-by-step animation)*:
- Animate the algorithm discovering the path step by step
- Shows HOW the algorithm finds the shortest path

*Centrality (before/after animation)*:
1. Before: All nodes same size/color (plain graph)
2. Compute centrality scores
3. After: Nodes sized/colored by centrality score (heat map)
- Shows WHAT centrality reveals about node importance

**Common Patterns**:
- Centrality stories use heat map visualization (node size/color based on score)
- Shortest path stories highlight the path with distinct edge coloring
- All stories have controls for graph generation and algorithm parameters
- Reuse utilities from `algorithms/stories/utils/` established in Phase 2

**Dependencies**:
- External: `@storybook/test` (for play functions)
- Internal: Phase 1-2 infrastructure, `@graphty/algorithms` exports

**Verification** ✅:
1. Navigate to each story in Storybook ✅
2. Verify centrality animations show before → after transformation ✅
3. Verify shortest path stories animate step-by-step path discovery ✅
4. Test controls - changing parameters should update results ✅
5. Reload multiple times - verify deterministic output (same seed = same visualization) ✅
6. **Package Usage Verification** ✅:
   - Import check: All 10 stories import from `@graphty/algorithms` ✅
   - Usage check: All imported functions are called ✅
   - Result check: Algorithm results used for visualization ✅
   - Centrality stories: 100% use real algorithm results (before/after pattern) ✅
   - Shortest path stories: Use real algorithm results for final display (paths, distances, negative cycle detection) ✅
   - Note: Shortest path step animations simulate algorithm (dijkstra/bellmanFord/floydWarshall lack callback support)

---

### Phase 4: Remaining Algorithm Stories (18 stories)

**Objective**: Convert remaining algorithm demos: MST, pathfinding, community, clustering, flow, link prediction, matching.

**Story Structure**:
- Title: `MST` - Stories: `Kruskal`, `Prim`
- Title: `Pathfinding` - Stories: `AStar`
- Title: `Components` - Stories: `Connected`
- Title: `Community` - Stories: `Louvain`, `LabelPropagation`, `GirvanNewman`, `Leiden`
- Title: `Clustering` - Stories: `KCore`, `Hierarchical`, `Spectral`, `MCL`
- Title: `Flow` - Stories: `FordFulkerson`, `MinCut`
- Title: `LinkPrediction` - Stories: `CommonNeighbors`, `AdamicAdar`
- Title: `Matching` - Stories: `Bipartite`, `Isomorphism`

**Implementation** (All stories use play functions):
1. **MST (2)**: `Kruskal.stories.ts`, `Prim.stories.ts` - **Play function** (step-by-step edge addition)
2. **Pathfinding (1)**: `AStar.stories.ts` - **Play function** (step-by-step path discovery)
3. **Components (1)**: `ConnectedComponents.stories.ts` - **Play function** (before/after component coloring)
4. **Community (4)**: `Louvain.stories.ts`, `LabelPropagation.stories.ts`, `GirvanNewman.stories.ts`, `Leiden.stories.ts` - **Play function** (before/after community coloring)
5. **Clustering (4)**: `KCore.stories.ts`, `Hierarchical.stories.ts`, `Spectral.stories.ts`, `MCL.stories.ts` - **Play function** (before/after cluster coloring)
6. **Flow (2)**: `FordFulkerson.stories.ts`, `MinCut.stories.ts` - **Play function** (step-by-step flow augmentation)
7. **Link Prediction (2)**: `CommonNeighbors.stories.ts`, `AdamicAdar.stories.ts` - **Play function** (before/after predicted edges)
8. **Matching (2)**: `Bipartite.stories.ts`, `Isomorphism.stories.ts` - **Play function** (before/after matching highlight)

**Play Function Patterns**:

*Step-by-step animation* (shows HOW the algorithm works):
- **MST**: Edges added one by one showing greedy selection
- **Pathfinding**: Path discovered step by step with heuristic
- **Flow**: Flow augmented path by path

*Before/after animation* (shows WHAT the algorithm reveals):
- **Components**: Plain graph → nodes colored by component
- **Community**: Plain graph → nodes colored by community
- **Clustering**: Plain graph → nodes colored by cluster
- **Link Prediction**: Original graph → predicted edges shown (dashed/highlighted)
- **Matching**: Original graph → matched edges highlighted

**Dependencies**:
- External: `@storybook/test` (for play functions)
- Internal: Phase 1-3 infrastructure

**Verification**:
1. Navigate to each new story category
2. Verify visualization matches expected output for algorithm type
3. Test interactive controls
4. Verify determinism with fixed seed
5. **Package Usage Verification**:
   - Import check: `grep -rn "from \"@graphty/algorithms\"" stories/` - all stories must import
   - Usage check: Verify each imported function is called
   - Result check: Verify algorithm results drive the visualization
   - Document any algorithms that lack callback support for step animation

---

### Phase 5: 2D Layout Stories (13 stories)

**Objective**: Convert all 2D layout demos to Storybook stories.

**Story Structure**:
- Title: `Layout2D` - Stories: `Random`, `Circular`, `Shell`, `Spring`, `Spectral`, `Spiral`, `Bipartite`, `Multipartite`, `BFS`, `Planar`, `KamadaKawai`, `ForceAtlas2`, `ARF`

**Implementation** (All stories use play functions for random→final animation):
1. `layout/stories/2d/Random.stories.ts` - No animation (already random)
2. `layout/stories/2d/Circular.stories.ts` - **Play function**
3. `layout/stories/2d/Shell.stories.ts` - **Play function**
4. `layout/stories/2d/Spring.stories.ts` (Fruchterman-Reingold) - **Play function**
5. `layout/stories/2d/Spectral.stories.ts` - **Play function**
6. `layout/stories/2d/Spiral.stories.ts` - **Play function**
7. `layout/stories/2d/Bipartite.stories.ts` - **Play function**
8. `layout/stories/2d/Multipartite.stories.ts` - **Play function**
9. `layout/stories/2d/BFS.stories.ts` - **Play function**
10. `layout/stories/2d/Planar.stories.ts` - **Play function**
11. `layout/stories/2d/KamadaKawai.stories.ts` - **Play function**
12. `layout/stories/2d/ForceAtlas2.stories.ts` - **Play function**
13. `layout/stories/2d/ARF.stories.ts` - **Play function**

14. `layout/stories/utils/`: Package-local utilities
    - `graph-generators.ts`: Seeded graph generation
    - `visualization.ts`: SVG rendering helpers with animation support

**Play Function Pattern** (random → final animation):
1. Render graph with random initial node positions
2. Compute final layout positions using the layout algorithm
3. Click "Apply Layout" button (or auto-start)
4. Animate nodes transitioning from random → final positions
5. Wait for animation to complete (for Chromatic snapshot)

This pattern demonstrates the value of each layout algorithm by showing the transformation.

**Common Pattern**:
- Each story generates a graph, shows random positions, animates to final layout
- Storybook controls for nodeCount, graphType, seed, layout parameters, animationSpeed

**Dependencies**:
- External: `@storybook/test` (for play functions)
- Internal: Phase 1 infrastructure, `@graphty/layout` exports

**Verification**:
1. Navigate to each 2D layout story
2. Verify animation shows random → final transition
3. Verify final layout matches expected pattern (circular should be circular, etc.)
4. Test layout parameter controls (iterations, k, scale)
5. Compare final state visually with legacy HTML demos
6. **Package Usage Verification**:
   - Import check: `grep -rn "from \"@graphty/layout\"" stories/` - all stories must import
   - Usage check: Verify each imported layout function is called
   - Result check: Verify layout positions are used for final node positions (not re-calculated)

---

### Phase 6: 3D Layout Stories (4 stories)

**Objective**: Convert 3D layout demos using Three.js rendering.

**Story Structure**:
- Title: `Layout3D` - Stories: `Spring3D`, `ForceAtlas2_3D`, `KamadaKawai3D`, `Spherical`

**Implementation** (All stories use play functions for random→final animation):
1. `layout/stories/3d/Spring3D.stories.ts` - **Play function**
2. `layout/stories/3d/ForceAtlas2_3D.stories.ts` - **Play function**
3. `layout/stories/3d/KamadaKawai3D.stories.ts` - **Play function**
4. `layout/stories/3d/Spherical.stories.ts` - **Play function**

5. `layout/stories/utils/visualization-3d.ts`: Three.js rendering utilities (package-local)
   - `create3DScene()`: Initialize Three.js scene with camera and controls
   - `render3DGraph()`: Render 3D graph in Three.js scene
   - `animateLayout()`: Animate nodes from random → final positions

**Play Function Pattern** (random → final animation):
1. Render 3D graph with random initial node positions
2. Compute final 3D layout positions using the layout algorithm
3. Click "Apply Layout" button (or auto-start)
4. Animate nodes transitioning from random → final positions in 3D space
5. Wait for animation to complete (for Chromatic snapshot)

**Special Considerations**:
- Three.js canvas rendering instead of SVG
- OrbitControls for interactive rotation (after animation completes)
- Fixed camera angle for deterministic Chromatic snapshots
- WebGL context cleanup on story unmount

**Dependencies**:
- External: `three`, `@types/three`, `@storybook/test` (for play functions)
- Internal: Phase 1 infrastructure, `@graphty/layout` exports

**Verification**:
1. Navigate to each 3D layout story
2. Verify animation shows random → final 3D transition
3. Verify 3D scene renders with nodes and edges visible
4. Test orbit controls (drag to rotate, scroll to zoom) - should work after animation
5. Verify fixed camera position in Chromatic mode
6. Check WebGL context is properly disposed on story change
7. **Package Usage Verification**:
   - Import check: `grep -rn "from \"@graphty/layout\"" stories/` - all 3D stories must import
   - Usage check: Verify each imported 3D layout function is called
   - Result check: Verify 3D layout positions are used for final node positions
   - Verify Three.js rendering uses layout result, not re-computed positions

---

### Phase 7: CI/CD Integration & Chromatic

**Objective**: Integrate Storybook builds and Chromatic visual testing into CI/CD pipeline.

**Implementation**:
1. Update `.github/workflows/ci.yml`:
   ```yaml
   build-storybook-algorithms:
     runs-on: ubuntu-latest
     needs: build
     steps:
       - uses: actions/checkout@v4
       - uses: pnpm/action-setup@v4
       - uses: actions/setup-node@v4
         with:
           node-version: 22
           cache: 'pnpm'
       - run: pnpm install
       - run: pnpm --filter @graphty/algorithms build-storybook
       - uses: actions/upload-artifact@v4
         with:
           name: storybook-algorithms
           path: algorithms/storybook-static

   build-storybook-layout:
     # Similar to above for layout package
   ```

2. Add Chromatic jobs:
   ```yaml
   chromatic-algorithms:
     runs-on: ubuntu-latest
     needs: build-storybook-algorithms
     steps:
       - uses: chromaui/action@latest
         with:
           projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN_ALGORITHMS }}
           workingDir: algorithms
           buildScriptName: build-storybook
           onlyChanged: true
   ```

3. Update `algorithms/chromatic.config.json` and `layout/chromatic.config.json`

4. Create `algorithms/.env.example` and `layout/.env.example` with PORT configuration

**Dependencies**:
- External: Chromatic project tokens (repository secrets)
- Internal: All previous phases

**Verification**:
1. Push branch and verify CI workflow runs
2. Check Storybook build artifacts are uploaded
3. Verify Chromatic builds complete successfully
4. Review Chromatic baseline snapshots
5. Make a visual change and verify Chromatic detects it

---

### Phase 8: GitHub Pages Deployment & Documentation

**Objective**: Deploy Storybooks to GitHub Pages and update documentation.

**Implementation**:
1. Update `.github/workflows/deploy-pages.yml`:
   ```yaml
   deploy-pages:
     runs-on: ubuntu-latest
     needs: [build-storybook-algorithms, build-storybook-layout, build-docs]
     permissions:
       pages: write
       id-token: write
     steps:
       - uses: actions/download-artifact@v4
         with:
           name: storybook-algorithms
           path: _site/storybook/algorithms
       # ... similar for layout and graphty-element
       - name: Create landing page
         run: |
           cat > _site/index.html << 'EOF'
           <!DOCTYPE html>
           <html>
           <head><title>Graphty Documentation</title></head>
           <body>
             <h1>Graphty Documentation</h1>
             <a href="./storybook/algorithms/">Algorithms Storybook</a>
             <a href="./storybook/layout/">Layout Storybook</a>
             <a href="./storybook/graphty-element/">graphty-element Storybook</a>
           </body>
           </html>
           EOF
       - uses: actions/upload-pages-artifact@v3
       - uses: actions/deploy-pages@v4
   ```

2. Update package README files with Storybook links and badges

3. Update monorepo `CLAUDE.md` with new port assignments and Storybook commands

4. Archive legacy HTML demos:
   - Move `algorithms/examples/html/` to `algorithms/examples/html-legacy/`
   - Move `layout/examples/` to `layout/examples-legacy/`

**Dependencies**:
- External: GitHub Pages configuration
- Internal: All previous phases

**Verification**:
1. Merge to master and verify deploy-pages workflow runs
2. Navigate to GitHub Pages URLs:
   - `https://graphty-org.github.io/graphty-monorepo/storybook/algorithms/`
   - `https://graphty-org.github.io/graphty-monorepo/storybook/layout/`
3. Verify all stories load correctly in deployed environment
4. Click README Storybook links - should navigate to deployed Storybooks
5. Verify legacy demos are archived (not deleted)

---

## Common Utilities Needed

Utilities are implemented as package-local files in `{package}/stories/utils/`:

| Utility | Purpose | Location |
|---------|---------|----------|
| `SeededRandom` | Deterministic PRNG for reproducible graphs | `stories/utils/graph-generators.ts` |
| `generateGraph()` | Create graphs of various types with seeded randomness | `stories/utils/graph-generators.ts` |
| `createSvgContainer()` | Create SVG element with consistent styling | `stories/utils/visualization.ts` |
| `renderGraph()` | Render graph with nodes, edges, labels | `stories/utils/visualization.ts` |
| `create3DScene()` | Initialize Three.js scene with camera and controls | `layout/stories/utils/visualization-3d.ts` |
| `render3DGraph()` | Render 3D graph in Three.js scene | `layout/stories/utils/visualization-3d.ts` |

Note: Each package (algorithms, layout) has its own `stories/utils/` directory. Code can be duplicated between packages or shared via copy-paste as needed.

---

## External Libraries Assessment

| Task | Library | Reason |
|------|---------|--------|
| 3D rendering | `three` | Already used in existing 3D layout demos; mature, well-documented |
| Storybook HTML | `@storybook/html-vite` | Pure HTML/JS stories, no framework dependency |
| Visual testing | `chromatic` | Already used in graphty-element; integrates with Storybook |
| Seeded RNG | Custom Mulberry32 | Simple, fast, no external dependency |
| SVG manipulation | Native DOM API | Simple requirements, no library needed |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Non-deterministic visual tests | Use fixed seed (42); custom SeededRandom class; play functions run animations to completion |
| 3D WebGL context issues | Proper cleanup on story unmount; fixed camera angle for Chromatic; fallback message if WebGL unavailable |
| Animation timing in tests | Use Storybook play functions to wait for animations to complete before Chromatic snapshot |
| Large graph performance | Limit default nodeCount; show warning for large graphs; use requestAnimationFrame for smooth rendering |
| Three.js bundle size | Dynamic import in 3D stories only; tree-shaking with Vite |
| Floyd-Warshall test hangs | Do not increase test coverage for floyd-warshall per existing CLAUDE.md guidance |
| Port conflicts | Use designated ports 9001 (algorithms) and 9011 (layout) per port assignment table |

---

## Play Function Guidelines

**ALL stories use play functions** to demonstrate value through animation.

### Animation Patterns

#### Step-by-Step Animation (shows HOW the algorithm works)
Used for algorithms that build solutions incrementally:
- **Traversal**: BFS, DFS - visit nodes in traversal order
- **Shortest Path**: Dijkstra, BellmanFord, FloydWarshall - discover path step by step
- **MST**: Kruskal, Prim - add edges one by one
- **Pathfinding**: AStar - discover path with heuristic
- **Flow**: FordFulkerson, MinCut - augment flow path by path

#### Before/After Animation (shows WHAT the algorithm reveals)
Used for algorithms that compute a final result to visualize:
- **Centrality**: Plain graph → nodes sized/colored by score (heat map)
- **Components**: Plain graph → nodes colored by component
- **Community**: Plain graph → nodes colored by community
- **Clustering**: Plain graph → nodes colored by cluster
- **Link Prediction**: Original graph → predicted edges shown (dashed)
- **Matching**: Original graph → matched edges highlighted

#### Random → Final Animation (shows the layout transformation)
Used for all layout algorithms:
- **2D Layouts**: Circular, Shell, Spring, Spectral, Spiral, Bipartite, Multipartite, BFS, Planar, KamadaKawai, ForceAtlas2, ARF
- **3D Layouts**: Spring3D, ForceAtlas2_3D, KamadaKawai3D, Spherical
- **Exception**: Random layout (no animation - already random)

### Why Play Functions for Everything?

1. **Demonstrates value**: Users see what each algorithm/layout does
2. **Educational**: Animations teach how algorithms work or what they reveal
3. **Consistent UX**: Every story has the same interaction pattern
4. **Chromatic-ready**: Play functions ensure final state is captured for visual testing

---

## Phase Summary

| Phase | Stories | Focus | Status |
|-------|---------|-------|--------|
| 1 | 0 | Storybook setup | ✅ Complete |
| 2 | 2 | Traversal algorithms | ✅ Complete |
| 3 | 10 | Shortest path + centrality | ✅ Complete |
| 4 | 18 | Remaining algorithms | Pending |
| 5 | 13 | 2D layouts | Pending |
| 6 | 4 | 3D layouts | Pending |
| 7 | 0 | CI/CD + Chromatic | Pending |
| 8 | 0 | GitHub Pages + docs | Pending |

**Total**: 47 stories across 8 phases

---

## Success Criteria

1. All 47 original demos converted to Storybook stories
2. 100% deterministic visual tests in Chromatic (same seed = same snapshot)
3. Feature parity with HTML demos (same controls, same visualizations)
4. Interactive exploration via Random Graph button and Storybook controls
5. Consistent UX across all stories (shared decorators, controls, styling)
6. CI integration with Chromatic for visual regression testing
7. GitHub Pages deployment with accessible Storybooks
8. Documentation updated with links to Storybooks
9. Legacy HTML demos archived for reference
10. All tests passing (component tests + visual regression)
