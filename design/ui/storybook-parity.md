# Storybook Parity Plan: Converting HTML Demos to Storybook

## Overview

This document outlines the plan to convert the existing HTML demos in the `@graphty/algorithms` and `@graphty/layout` packages to Storybook stories. The goal is to create a unified, interactive documentation system that supports:

1. **Deterministic visual testing** via Chromatic
2. **Interactive controls** replacing HTML inputs
3. **Reproducible graph generation** with a "Random Graph" button
4. **Consistent patterns** with existing graphty-element stories

## Current State Analysis

### HTML Demo Inventory

**Algorithms Package** (`algorithms/examples/html/`):
- 30+ interactive algorithm demos organized by category
- Categories: traversal, shortest-path, centrality, components, mst, pathfinding, community, clustering, flow, link-prediction, matching
- Shared utilities: `graph-utils.js`, `ui-controls.js`, `visualization.js`
- SVG-based 2D visualization
- Step-by-step animation with play/pause/step controls

**Layout Package** (`layout/examples/`):
- 13 2D layout demos (random, circular, shell, spring, spectral, spiral, bipartite, multipartite, bfs, planar, kamada-kawai, forceatlas2, arf)
- 4 3D layout demos (spring, forceatlas2, kamada-kawai, spherical)
- Shared utility: `layout-helpers.js`
- SVG for 2D, Three.js for 3D visualization

### Existing Storybook Patterns (graphty-element)

- Storybook 9.x with `@storybook/web-components-vite`
- Chromatic integration with `onlyChanged: true`
- Fixed seed (`seed: 42`) for deterministic physics-based layouts
- `preSteps` parameter for graph settling (0-8000 depending on complexity)
- Custom `waitForGraphSettled()` utility for play functions
- Event-waiting decorators to prevent race conditions

## Architecture Design

### Directory Structure

```
# Monorepo-level shared Storybook infrastructure
tools/
├── storybook/
│   ├── storybook.shared.config.ts   # Shared Storybook main config factory
│   ├── preview.shared.ts            # Shared preview configuration
│   ├── graph-generators.ts          # Seeded graph generation utilities
│   ├── visualization-2d.ts          # SVG rendering utilities
│   ├── visualization-3d.ts          # Three.js rendering utilities
│   ├── controls.ts                  # Shared control type definitions
│   ├── decorators.ts                # Shared story decorators
│   └── styles.css                   # Shared Storybook styles

# Package-level Storybook configuration
algorithms/
├── .storybook/
│   ├── main.ts              # Imports from tools/storybook/
│   └── preview.ts           # Extends shared preview
├── .env.example             # PORT, HOST, HTTPS config
├── stories/
│   ├── traversal/
│   │   ├── BFS.stories.ts
│   │   └── DFS.stories.ts
│   ├── shortest-path/
│   │   ├── Dijkstra.stories.ts
│   │   └── BellmanFord.stories.ts
│   ├── centrality/
│   │   ├── Degree.stories.ts
│   │   ├── PageRank.stories.ts
│   │   └── ...
│   └── ... (other categories)
├── chromatic.config.json
└── vitest.config.ts

layout/
├── .storybook/
│   ├── main.ts              # Imports from tools/storybook/
│   └── preview.ts           # Extends shared preview
├── .env.example             # PORT, HOST, HTTPS config
├── stories/
│   ├── 2d/
│   │   ├── Random.stories.ts
│   │   ├── Circular.stories.ts
│   │   ├── Spring.stories.ts
│   │   └── ...
│   └── 3d/
│       ├── Spring3D.stories.ts
│       ├── ForceAtlas2_3D.stories.ts
│       └── ...
├── chromatic.config.json
└── vitest.config.ts
```

### Storybook Configuration

#### Shared Configuration Factory (tools/storybook/storybook.shared.config.ts)

This factory function creates Storybook main configs with shared settings, following the pattern established in `graphty-element/.storybook/main.ts` for SSL and server configuration.

```typescript
import type { StorybookConfig } from "@storybook/html-vite";

export interface SharedStorybookOptions {
  /** Package name for identification */
  packageName: string;
  /** Story glob patterns */
  stories: string[];
  /** Additional static directories to serve */
  staticDirs?: string[];
  /** Additional Vite config overrides */
  viteConfig?: Record<string, unknown>;
}

export function createStorybookConfig(options: SharedStorybookOptions): StorybookConfig {
  return {
    stories: options.stories,
    addons: [
      "@chromatic-com/storybook",
      "@storybook/addon-vitest",
      "@storybook/addon-docs",
    ],
    framework: {
      name: "@storybook/html-vite",
      options: {},
    },
    core: {
      disableTelemetry: true,
    },
    staticDirs: options.staticDirs,
    async viteFinal(config, { configType }) {
      const fs = await import("fs");
      const path = await import("path");
      const { mergeConfig } = await import("vite");

      // SSL configuration via environment variables (matching graphty-element pattern)
      // Environment variables: HTTPS_CERT_PATH, HTTPS_KEY_PATH
      const sslCertPath = process.env.HTTPS_CERT_PATH;
      const sslKeyPath = process.env.HTTPS_KEY_PATH;

      const sslCertExists = sslCertPath && fs.existsSync(sslCertPath);
      const sslKeyExists = sslKeyPath && fs.existsSync(sslKeyPath);
      const useHttps = sslCertExists && sslKeyExists;

      const server: Record<string, unknown> = {
        host: process.env.HOST ?? "localhost",
        allowedHosts: true,
      };

      if (useHttps && sslCertPath && sslKeyPath) {
        server.https = {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath),
        };
      }

      return mergeConfig(config, {
        server,
        ...options.viteConfig,
      });
    },
  };
}
```

#### Package-Level Config (algorithms/.storybook/main.ts)

```typescript
import { createStorybookConfig } from "../../tools/storybook/storybook.shared.config";

export default createStorybookConfig({
  packageName: "algorithms",
  stories: ["../stories/**/*.stories.@(js|ts)"],
  staticDirs: ["../examples/html/shared"],
});
```

#### Package-Level Config (layout/.storybook/main.ts)

```typescript
import { createStorybookConfig } from "../../tools/storybook/storybook.shared.config";

export default createStorybookConfig({
  packageName: "layout",
  stories: ["../stories/**/*.stories.@(js|ts)"],
});
```

#### Environment Configuration (.env.example)

Both packages use the same `.env.example` pattern as graphty-element:

```bash
# Copy this file to .env and fill in your values
# .env is gitignored and will not be committed

# =============================================================================
# Server Configuration
# =============================================================================
# Shared by Vite dev server and Storybook
HOST=localhost
PORT=9001  # algorithms: 9001, layout: 9011

# =============================================================================
# HTTPS Configuration (optional, required for some features)
# =============================================================================
# SSL certificates for HTTPS. Generate self-signed certs with:
#   openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes
HTTPS_CERT_PATH=/path/to/server.crt
HTTPS_KEY_PATH=/path/to/server.key
```

#### npm scripts (package.json)

Following the graphty-element pattern for .env-based configuration:

```json
{
  "scripts": {
    "storybook": ". ../.env 2>/dev/null; storybook dev -p ${PORT:-6006} --host ${HOST:-localhost} ${HTTPS_CERT_PATH:+--https --ssl-cert $HTTPS_CERT_PATH --ssl-key $HTTPS_KEY_PATH} --no-open",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --exit-zero-on-changes"
  }
}
```

> **Implementation Note: Why CLI Args Instead of viteFinal**
>
> The npm script sources the `.env` file and passes server configuration via CLI args rather than configuring the Vite server in `viteFinal`. This is necessary because:
>
> 1. **Storybook uses Vite in middleware mode**: When Storybook runs with `@storybook/html-vite`, it sets `middlewareMode: true` in Vite's config. This means Vite does NOT create its own HTTP server—it runs as middleware inside Storybook's server.
>
> 2. **viteFinal server config is ignored**: Any `server.host`, `server.port`, or `server.https` settings in `viteFinal` are ignored because Vite isn't managing the server—Storybook is.
>
> 3. **Storybook's server is controlled by CLI args**: The only way to configure Storybook's HTTP server (host, port, HTTPS) is via CLI arguments like `--host`, `-p`, `--https`, `--ssl-cert`, and `--ssl-key`.
>
> 4. **Shell sourcing loads .env variables**: The `. ../.env 2>/dev/null;` prefix sources the monorepo root `.env` file so that environment variables (`HOST`, `PORT`, `HTTPS_CERT_PATH`, `HTTPS_KEY_PATH`) are available for shell expansion in the CLI args.
>
> **Contrast with regular Vite dev server**: For `npm run serve` or `npm run examples`, the `vite.config.js` loads env from the monorepo root using Vite's `loadEnv()` because Vite creates its own server (not in middleware mode).

#### Shared Preview Configuration (tools/storybook/preview.shared.ts)

```typescript
import type { Preview } from "@storybook/html";
import isChromatic from "chromatic/isChromatic";

// Global random seed for deterministic graph generation
let globalSeed = 42;

export const setGlobalSeed = (seed: number): void => {
  globalSeed = seed;
};

export const getGlobalSeed = (): number => globalSeed;

export const sharedPreview: Preview = {
  parameters: {
    chromatic: {
      delay: 300, // Wait for SVG rendering
      pauseAnimationAtEnd: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    seed: {
      description: "Random seed for graph generation",
      defaultValue: "42",
      toolbar: {
        title: "Seed",
        items: [
          { value: "42", title: "Default (42)" },
          { value: "123", title: "Seed 123" },
          { value: "random", title: "Random" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      // Set seed based on global type or force determinism in Chromatic
      const seed = isChromatic() ? 42 :
        (context.globals.seed === "random" ? Date.now() : parseInt(context.globals.seed));
      setGlobalSeed(seed);
      return Story();
    },
  ],
};

export default sharedPreview;
```

#### Package-Level Preview (algorithms/.storybook/preview.ts)

```typescript
import { sharedPreview } from "../../tools/storybook/preview.shared";
import type { Preview } from "@storybook/html";

const preview: Preview = {
  ...sharedPreview,
  // Package-specific overrides can be added here
};

export default preview;
```

### Hoisted Shared Utilities (tools/storybook/)

The following utilities are hoisted to `tools/storybook/` for reuse across algorithms and layout packages. Both packages import from this shared location.

#### tools/storybook/graph-generators.ts

```typescript
import { Graph } from "@graphty/algorithms";

// Seeded random number generator for determinism
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Mulberry32 PRNG
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export type GraphType =
  | "random"
  | "complete"
  | "cycle"
  | "star"
  | "tree"
  | "grid"
  | "bipartite"
  | "scale-free";

export interface GraphGeneratorOptions {
  nodeCount: number;
  graphType: GraphType;
  seed: number;
  edgeProbability?: number; // For random graphs
  directed?: boolean;
  weighted?: boolean;
}

export function generateGraph(options: GraphGeneratorOptions): Graph<string> {
  const { nodeCount, graphType, seed, edgeProbability = 0.3, directed = false, weighted = false } = options;
  const rng = new SeededRandom(seed);
  const graph = new Graph<string>({ directed });

  // Add nodes
  const nodes: string[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
    nodes.push(nodeId);
    graph.addNode(nodeId);
  }

  // Add edges based on graph type
  switch (graphType) {
    case "random":
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (rng.next() < edgeProbability) {
            const weight = weighted ? rng.nextInt(1, 10) : undefined;
            graph.addEdge(nodes[i], nodes[j], weight);
          }
        }
      }
      break;

    case "complete":
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const weight = weighted ? rng.nextInt(1, 10) : undefined;
          graph.addEdge(nodes[i], nodes[j], weight);
        }
      }
      break;

    case "cycle":
      for (let i = 0; i < nodeCount; i++) {
        const weight = weighted ? rng.nextInt(1, 10) : undefined;
        graph.addEdge(nodes[i], nodes[(i + 1) % nodeCount], weight);
      }
      break;

    case "star":
      for (let i = 1; i < nodeCount; i++) {
        const weight = weighted ? rng.nextInt(1, 10) : undefined;
        graph.addEdge(nodes[0], nodes[i], weight);
      }
      break;

    case "tree":
      for (let i = 1; i < nodeCount; i++) {
        const parent = Math.floor((i - 1) / 2);
        const weight = weighted ? rng.nextInt(1, 10) : undefined;
        graph.addEdge(nodes[parent], nodes[i], weight);
      }
      break;

    case "grid":
      const cols = Math.ceil(Math.sqrt(nodeCount));
      for (let i = 0; i < nodeCount; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        // Right neighbor
        if (col < cols - 1 && i + 1 < nodeCount) {
          const weight = weighted ? rng.nextInt(1, 10) : undefined;
          graph.addEdge(nodes[i], nodes[i + 1], weight);
        }
        // Bottom neighbor
        if (i + cols < nodeCount) {
          const weight = weighted ? rng.nextInt(1, 10) : undefined;
          graph.addEdge(nodes[i], nodes[i + cols], weight);
        }
      }
      break;

    case "bipartite":
      const leftSize = Math.floor(nodeCount / 2);
      for (let i = 0; i < leftSize; i++) {
        for (let j = leftSize; j < nodeCount; j++) {
          if (rng.next() < edgeProbability) {
            const weight = weighted ? rng.nextInt(1, 10) : undefined;
            graph.addEdge(nodes[i], nodes[j], weight);
          }
        }
      }
      break;

    case "scale-free":
      // Barabási–Albert model
      const m = 2; // Edges per new node
      for (let i = m; i < nodeCount; i++) {
        const degrees: number[] = nodes.slice(0, i).map(n =>
          graph.getNeighbors(n).length || 1
        );
        const totalDegree = degrees.reduce((a, b) => a + b, 0);
        const connected = new Set<number>();

        while (connected.size < Math.min(m, i)) {
          let r = rng.next() * totalDegree;
          for (let j = 0; j < i; j++) {
            r -= degrees[j];
            if (r <= 0 && !connected.has(j)) {
              connected.add(j);
              const weight = weighted ? rng.nextInt(1, 10) : undefined;
              graph.addEdge(nodes[i], nodes[j], weight);
              break;
            }
          }
        }
      }
      break;
  }

  return graph;
}

// Generate a new random graph (for the "Random Graph" button)
export function generateRandomGraph(
  currentOptions: GraphGeneratorOptions
): GraphGeneratorOptions {
  return {
    ...currentOptions,
    seed: Date.now(), // New random seed
  };
}
```

#### tools/storybook/visualization-2d.ts

```typescript
import type { Graph } from "@graphty/algorithms";
import { SeededRandom } from "./graph-generators";

export interface Position {
  x: number;
  y: number;
}

export interface VisualizationOptions {
  width: number;
  height: number;
  nodeRadius: number;
  nodeColors?: {
    default: string;
    visited: string;
    current: string;
    highlighted: string;
  };
  showLabels?: boolean;
  showWeights?: boolean;
}

const DEFAULT_COLORS = {
  default: "#9e9e9e",
  visited: "#4caf50",
  current: "#ff9800",
  highlighted: "#2196f3",
};

export function createSvgContainer(
  width: number,
  height: number
): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.border = "1px solid #e0e0e0";
  svg.style.borderRadius = "8px";
  svg.style.background = "#fafafa";
  return svg;
}

export function calculateNodePositions<T>(
  graph: Graph<T>,
  options: VisualizationOptions,
  seed: number
): Map<T, Position> {
  const nodes = graph.getNodes();
  const positions = new Map<T, Position>();
  const rng = new SeededRandom(seed);

  const margin = options.nodeRadius * 2;
  const effectiveWidth = options.width - margin * 2;
  const effectiveHeight = options.height - margin * 2;

  // Simple circular layout for initial positioning
  const angleStep = (2 * Math.PI) / nodes.length;
  const centerX = options.width / 2;
  const centerY = options.height / 2;
  const radius = Math.min(effectiveWidth, effectiveHeight) / 2.5;

  nodes.forEach((node, i) => {
    const angle = i * angleStep - Math.PI / 2;
    positions.set(node, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  return positions;
}

export function renderGraph<T>(
  svg: SVGSVGElement,
  graph: Graph<T>,
  positions: Map<T, Position>,
  options: VisualizationOptions,
  state?: {
    visited?: Set<T>;
    current?: T;
    highlighted?: Set<T>;
  }
): void {
  // Clear existing content
  svg.innerHTML = "";

  const colors = { ...DEFAULT_COLORS, ...options.nodeColors };
  const edges = graph.getEdges();
  const nodes = graph.getNodes();

  // Create defs for arrow markers
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "3.5");
  marker.setAttribute("orient", "auto");
  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
  polygon.setAttribute("fill", "#666");
  marker.appendChild(polygon);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Draw edges
  const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgeGroup.setAttribute("class", "edges");

  for (const [source, target, weight] of edges) {
    const sourcePos = positions.get(source);
    const targetPos = positions.get(target);
    if (!sourcePos || !targetPos) continue;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(sourcePos.x));
    line.setAttribute("y1", String(sourcePos.y));
    line.setAttribute("x2", String(targetPos.x));
    line.setAttribute("y2", String(targetPos.y));
    line.setAttribute("stroke", "#999");
    line.setAttribute("stroke-width", "2");

    if (graph.isDirected()) {
      line.setAttribute("marker-end", "url(#arrowhead)");
    }

    edgeGroup.appendChild(line);

    // Draw weight label
    if (options.showWeights && weight !== undefined) {
      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(midX));
      text.setAttribute("y", String(midY - 5));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("fill", "#666");
      text.textContent = String(weight);
      edgeGroup.appendChild(text);
    }
  }
  svg.appendChild(edgeGroup);

  // Draw nodes
  const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodeGroup.setAttribute("class", "nodes");

  for (const node of nodes) {
    const pos = positions.get(node);
    if (!pos) continue;

    // Determine node color based on state
    let color = colors.default;
    if (state?.current === node) {
      color = colors.current;
    } else if (state?.highlighted?.has(node)) {
      color = colors.highlighted;
    } else if (state?.visited?.has(node)) {
      color = colors.visited;
    }

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.setAttribute("r", String(options.nodeRadius));
    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", "#fff");
    circle.setAttribute("stroke-width", "2");
    nodeGroup.appendChild(circle);

    // Draw label
    if (options.showLabels) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(pos.x));
      text.setAttribute("y", String(pos.y + 4));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("fill", "#fff");
      text.textContent = String(node);
      nodeGroup.appendChild(text);
    }
  }
  svg.appendChild(nodeGroup);
}

// Render centrality-style heat map
export function renderCentralityGraph<T>(
  svg: SVGSVGElement,
  graph: Graph<T>,
  positions: Map<T, Position>,
  centrality: Map<T, number>,
  options: VisualizationOptions
): void {
  svg.innerHTML = "";

  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  // Find min/max centrality for normalization
  const values = Array.from(centrality.values());
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Color scale: green (low) -> yellow -> red (high)
  const getColor = (value: number): string => {
    const normalized = (value - minVal) / range;
    if (normalized < 0.5) {
      // Green to Yellow
      const g = Math.round(128 + 127 * (normalized * 2));
      const r = Math.round(255 * (normalized * 2));
      return `rgb(${r}, ${g}, 0)`;
    } else {
      // Yellow to Red
      const g = Math.round(255 * (1 - (normalized - 0.5) * 2));
      return `rgb(255, ${g}, 0)`;
    }
  };

  // Draw edges
  const edgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (const [source, target] of edges) {
    const sourcePos = positions.get(source);
    const targetPos = positions.get(target);
    if (!sourcePos || !targetPos) continue;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(sourcePos.x));
    line.setAttribute("y1", String(sourcePos.y));
    line.setAttribute("x2", String(targetPos.x));
    line.setAttribute("y2", String(targetPos.y));
    line.setAttribute("stroke", "#ccc");
    line.setAttribute("stroke-width", "1");
    edgeGroup.appendChild(line);
  }
  svg.appendChild(edgeGroup);

  // Draw nodes with centrality coloring
  const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (const node of nodes) {
    const pos = positions.get(node);
    const value = centrality.get(node) ?? 0;
    if (!pos) continue;

    // Size based on centrality
    const baseRadius = options.nodeRadius;
    const sizeMultiplier = 0.5 + ((value - minVal) / range) * 1;
    const radius = baseRadius * sizeMultiplier;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", getColor(value));
    circle.setAttribute("stroke", "#fff");
    circle.setAttribute("stroke-width", "2");
    nodeGroup.appendChild(circle);

    if (options.showLabels) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(pos.x));
      text.setAttribute("y", String(pos.y + 4));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "10");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("fill", "#333");
      text.textContent = String(node);
      nodeGroup.appendChild(text);
    }
  }
  svg.appendChild(nodeGroup);
}
```

#### tools/storybook/decorators.ts

```typescript
import type { Decorator } from "@storybook/html";
import isChromatic from "chromatic/isChromatic";

// Decorator that adds a "Random Graph" button
export const randomGraphDecorator: Decorator = (Story, context) => {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "16px";

  // Button container
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "8px";
  buttonContainer.style.alignItems = "center";

  // Random Graph button (hidden in Chromatic for determinism)
  if (!isChromatic()) {
    const randomButton = document.createElement("button");
    randomButton.textContent = "🎲 Random Graph";
    randomButton.className = "storybook-random-btn";
    randomButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #4caf50;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    `;
    randomButton.addEventListener("mouseenter", () => {
      randomButton.style.background = "#45a049";
    });
    randomButton.addEventListener("mouseleave", () => {
      randomButton.style.background = "#4caf50";
    });
    randomButton.addEventListener("click", () => {
      // Dispatch custom event that stories can listen to
      container.dispatchEvent(
        new CustomEvent("regenerate-graph", {
          bubbles: true,
          detail: { seed: Date.now() },
        })
      );
    });
    buttonContainer.appendChild(randomButton);

    // Seed display
    const seedDisplay = document.createElement("span");
    seedDisplay.className = "seed-display";
    seedDisplay.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      color: #666;
      padding: 4px 8px;
      background: #f5f5f5;
      border-radius: 4px;
    `;
    seedDisplay.textContent = `Seed: ${context.args.seed || 42}`;
    buttonContainer.appendChild(seedDisplay);
  }

  container.appendChild(buttonContainer);

  // Story content
  const storyContent = Story();
  if (typeof storyContent === "string") {
    const div = document.createElement("div");
    div.innerHTML = storyContent;
    container.appendChild(div);
  } else {
    container.appendChild(storyContent);
  }

  return container;
};

// Decorator that adds algorithm animation controls
export const animationControlsDecorator: Decorator = (Story, context) => {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "16px";

  // Control buttons (hidden in Chromatic)
  if (!isChromatic()) {
    const controls = document.createElement("div");
    controls.className = "animation-controls";
    controls.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    const buttonStyle = `
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;

    // Play/Pause button
    const playPauseBtn = document.createElement("button");
    playPauseBtn.textContent = "▶️ Play";
    playPauseBtn.style.cssText = buttonStyle + "background: #2196f3; color: white;";
    playPauseBtn.addEventListener("click", () => {
      container.dispatchEvent(new CustomEvent("toggle-animation", { bubbles: true }));
    });
    controls.appendChild(playPauseBtn);

    // Step button
    const stepBtn = document.createElement("button");
    stepBtn.textContent = "⏭️ Step";
    stepBtn.style.cssText = buttonStyle + "background: #ff9800; color: white;";
    stepBtn.addEventListener("click", () => {
      container.dispatchEvent(new CustomEvent("step-animation", { bubbles: true }));
    });
    controls.appendChild(stepBtn);

    // Reset button
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "🔄 Reset";
    resetBtn.style.cssText = buttonStyle + "background: #f44336; color: white;";
    resetBtn.addEventListener("click", () => {
      container.dispatchEvent(new CustomEvent("reset-animation", { bubbles: true }));
    });
    controls.appendChild(resetBtn);

    container.appendChild(controls);
  }

  const storyContent = Story();
  if (typeof storyContent === "string") {
    const div = document.createElement("div");
    div.innerHTML = storyContent;
    container.appendChild(div);
  } else {
    container.appendChild(storyContent);
  }

  return container;
};
```

### Control Patterns

#### Standard Controls for HTML Input Replacement

| HTML Input Type | Storybook Control | Example |
|-----------------|-------------------|---------|
| `<input type="range">` | `control: { type: "range", min, max, step }` | Node count slider |
| `<select>` | `control: { type: "select", options }` | Graph type dropdown |
| `<input type="number">` | `control: { type: "number", min, max }` | Algorithm parameters |
| `<input type="checkbox">` | `control: { type: "boolean" }` | Feature toggles |
| `<input type="text">` | `control: { type: "text" }` | Start node selection |
| Multiple radio buttons | `control: { type: "radio", options }` | Mode selection |

#### Example Control Definitions

```typescript
// tools/storybook/controls.ts

export const graphGeneratorArgTypes = {
  nodeCount: {
    control: { type: "range", min: 3, max: 30, step: 1 },
    description: "Number of nodes in the graph",
    table: {
      category: "Graph Generation",
      defaultValue: { summary: 10 },
    },
  },
  graphType: {
    control: { type: "select" },
    options: ["random", "complete", "cycle", "star", "tree", "grid", "bipartite", "scale-free"],
    description: "Type of graph to generate",
    table: {
      category: "Graph Generation",
      defaultValue: { summary: "random" },
    },
  },
  edgeProbability: {
    control: { type: "range", min: 0.1, max: 1, step: 0.1 },
    description: "Probability of edge creation (for random graphs)",
    table: {
      category: "Graph Generation",
      defaultValue: { summary: 0.3 },
    },
    if: { arg: "graphType", eq: "random" },
  },
  directed: {
    control: { type: "boolean" },
    description: "Whether the graph is directed",
    table: {
      category: "Graph Generation",
      defaultValue: { summary: false },
    },
  },
  weighted: {
    control: { type: "boolean" },
    description: "Whether edges have weights",
    table: {
      category: "Graph Generation",
      defaultValue: { summary: false },
    },
  },
  seed: {
    control: { type: "number" },
    description: "Random seed for reproducibility",
    table: {
      category: "Graph Generation",
      defaultValue: { summary: 42 },
    },
  },
};

export const layoutArgTypes = {
  iterations: {
    control: { type: "range", min: 10, max: 500, step: 10 },
    description: "Number of layout iterations",
    table: {
      category: "Layout Parameters",
      defaultValue: { summary: 100 },
    },
  },
  springConstant: {
    control: { type: "range", min: 0.1, max: 5, step: 0.1 },
    description: "Spring constant (K) for force-directed layouts",
    table: {
      category: "Layout Parameters",
      defaultValue: { summary: 1 },
    },
  },
};

export const visualizationArgTypes = {
  width: {
    control: { type: "range", min: 400, max: 1200, step: 50 },
    description: "SVG canvas width",
    table: {
      category: "Visualization",
      defaultValue: { summary: 800 },
    },
  },
  height: {
    control: { type: "range", min: 300, max: 800, step: 50 },
    description: "SVG canvas height",
    table: {
      category: "Visualization",
      defaultValue: { summary: 600 },
    },
  },
  nodeRadius: {
    control: { type: "range", min: 10, max: 30, step: 2 },
    description: "Node circle radius",
    table: {
      category: "Visualization",
      defaultValue: { summary: 20 },
    },
  },
  showLabels: {
    control: { type: "boolean" },
    description: "Show node labels",
    table: {
      category: "Visualization",
      defaultValue: { summary: true },
    },
  },
  showWeights: {
    control: { type: "boolean" },
    description: "Show edge weights",
    table: {
      category: "Visualization",
      defaultValue: { summary: true },
    },
  },
};
```

### Example Stories

#### Algorithm Story: BFS

```typescript
// algorithms/stories/traversal/BFS.stories.ts
import type { Meta, StoryObj } from "@storybook/html";
import isChromatic from "chromatic/isChromatic";
import { bfs } from "@graphty/algorithms";
import {
  generateGraph,
  type GraphGeneratorOptions
} from "../../../tools/storybook/graph-generators";
import {
  createSvgContainer,
  calculateNodePositions,
  renderGraph,
  type VisualizationOptions,
} from "../../../tools/storybook/visualization-2d";
import {
  graphGeneratorArgTypes,
  visualizationArgTypes
} from "../../../tools/storybook/controls";
import { randomGraphDecorator, animationControlsDecorator } from "../../../tools/storybook/decorators";

interface BfsStoryArgs extends GraphGeneratorOptions, VisualizationOptions {
  startNode: string;
  animationSpeed: number;
}

const meta: Meta<BfsStoryArgs> = {
  title: "Algorithms/Traversal/BFS",
  decorators: [randomGraphDecorator, animationControlsDecorator],
  argTypes: {
    ...graphGeneratorArgTypes,
    ...visualizationArgTypes,
    startNode: {
      control: { type: "select" },
      options: ["A", "B", "C", "D", "E"],
      description: "Starting node for BFS traversal",
      table: {
        category: "Algorithm",
        defaultValue: { summary: "A" },
      },
    },
    animationSpeed: {
      control: { type: "range", min: 100, max: 2000, step: 100 },
      description: "Animation speed (ms per step)",
      table: {
        category: "Animation",
        defaultValue: { summary: 500 },
      },
    },
  },
  args: {
    // Graph generation
    nodeCount: 10,
    graphType: "random",
    edgeProbability: 0.3,
    directed: false,
    weighted: false,
    seed: 42,
    // Visualization
    width: 800,
    height: 600,
    nodeRadius: 20,
    showLabels: true,
    showWeights: false,
    // Algorithm
    startNode: "A",
    animationSpeed: 500,
  },
  parameters: {
    chromatic: {
      delay: 100,
    },
    docs: {
      description: {
        component: `
# Breadth-First Search (BFS)

BFS explores a graph level by level, visiting all neighbors of a node before moving to the next level.

## Algorithm Complexity
- **Time**: O(V + E) where V is vertices and E is edges
- **Space**: O(V) for the queue and visited set

## Use Cases
- Finding shortest path in unweighted graphs
- Level-order traversal
- Testing bipartiteness
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<BfsStoryArgs>;

export const Default: Story = {
  render: (args) => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "16px";

    // Generate graph
    const graph = generateGraph({
      nodeCount: args.nodeCount,
      graphType: args.graphType,
      seed: args.seed,
      edgeProbability: args.edgeProbability,
      directed: args.directed,
      weighted: args.weighted,
    });

    // Create SVG
    const svg = createSvgContainer(args.width, args.height);
    container.appendChild(svg);

    // Calculate positions
    const positions = calculateNodePositions(graph, {
      width: args.width,
      height: args.height,
      nodeRadius: args.nodeRadius,
    }, args.seed);

    // State for animation
    let visited = new Set<string>();
    let current: string | undefined;
    let animationFrame: number | undefined;
    let isPlaying = false;

    // BFS generator for step-by-step execution
    function* bfsGenerator(startNode: string) {
      const queue: string[] = [startNode];
      const localVisited = new Set<string>();
      localVisited.add(startNode);

      while (queue.length > 0) {
        const node = queue.shift()!;
        yield { current: node, visited: new Set(localVisited), queue: [...queue] };

        for (const neighbor of graph.getNeighbors(node)) {
          if (!localVisited.has(neighbor)) {
            localVisited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      yield { current: undefined, visited: localVisited, queue: [] };
    }

    let generator = bfsGenerator(args.startNode);

    const renderCurrentState = () => {
      renderGraph(svg, graph, positions, {
        width: args.width,
        height: args.height,
        nodeRadius: args.nodeRadius,
        showLabels: args.showLabels,
        showWeights: args.showWeights,
      }, { visited, current });
    };

    const step = () => {
      const result = generator.next();
      if (!result.done) {
        visited = result.value.visited;
        current = result.value.current;
        renderCurrentState();
        return true;
      }
      return false;
    };

    const animate = () => {
      if (isPlaying && step()) {
        animationFrame = window.setTimeout(animate, args.animationSpeed);
      } else {
        isPlaying = false;
      }
    };

    // For Chromatic: run to completion immediately
    if (isChromatic()) {
      while (step()) {}
    } else {
      renderCurrentState();
    }

    // Event listeners for controls
    container.addEventListener("toggle-animation", () => {
      isPlaying = !isPlaying;
      if (isPlaying) animate();
    });

    container.addEventListener("step-animation", () => {
      isPlaying = false;
      if (animationFrame) clearTimeout(animationFrame);
      step();
    });

    container.addEventListener("reset-animation", () => {
      isPlaying = false;
      if (animationFrame) clearTimeout(animationFrame);
      visited = new Set();
      current = undefined;
      generator = bfsGenerator(args.startNode);
      renderCurrentState();
    });

    container.addEventListener("regenerate-graph", ((e: CustomEvent) => {
      // Regenerate with new seed - handled by Storybook controls
    }) as EventListener);

    // Info panel
    const info = document.createElement("div");
    info.className = "bfs-info";
    info.style.cssText = `
      display: flex;
      gap: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
    `;
    info.innerHTML = `
      <div><strong>Algorithm:</strong> Breadth-First Search</div>
      <div><strong>Start Node:</strong> ${args.startNode}</div>
      <div><strong>Nodes:</strong> ${args.nodeCount}</div>
      <div><strong>Graph Type:</strong> ${args.graphType}</div>
    `;
    container.appendChild(info);

    // Legend
    const legend = document.createElement("div");
    legend.style.cssText = `
      display: flex;
      gap: 16px;
      font-size: 12px;
    `;
    legend.innerHTML = `
      <div style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:16px;background:#9e9e9e;border-radius:50%;display:inline-block"></span>
        Unvisited
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:16px;background:#ff9800;border-radius:50%;display:inline-block"></span>
        Current
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <span style="width:16px;height:16px;background:#4caf50;border-radius:50%;display:inline-block"></span>
        Visited
      </div>
    `;
    container.appendChild(legend);

    return container;
  },
};

// Show final state (for Chromatic visual testing)
export const FinalState: Story = {
  args: {
    ...Default.args,
  },
  render: (args) => {
    const container = document.createElement("div");

    const graph = generateGraph({
      nodeCount: args.nodeCount,
      graphType: args.graphType,
      seed: args.seed,
      edgeProbability: args.edgeProbability,
      directed: args.directed,
      weighted: args.weighted,
    });

    const svg = createSvgContainer(args.width, args.height);
    container.appendChild(svg);

    const positions = calculateNodePositions(graph, {
      width: args.width,
      height: args.height,
      nodeRadius: args.nodeRadius,
    }, args.seed);

    // Run BFS to completion
    const visited = bfs(graph, args.startNode);

    renderGraph(svg, graph, positions, {
      width: args.width,
      height: args.height,
      nodeRadius: args.nodeRadius,
      showLabels: args.showLabels,
      showWeights: args.showWeights,
    }, { visited });

    return container;
  },
  parameters: {
    chromatic: {
      // This story is specifically for visual testing
      disableSnapshot: false,
    },
  },
};
```

#### Layout Story: Spring Layout

```typescript
// layout/stories/2d/Spring.stories.ts
import type { Meta, StoryObj } from "@storybook/html";
import isChromatic from "chromatic/isChromatic";
import { springLayout, type SpringLayoutOptions } from "@graphty/layout";
import { Graph } from "@graphty/algorithms";
import {
  generateGraph,
  type GraphGeneratorOptions
} from "../../../tools/storybook/graph-generators";
import {
  createSvgContainer,
  renderGraph,
  type Position,
} from "../../../tools/storybook/visualization-2d";
import {
  graphGeneratorArgTypes,
  layoutArgTypes,
  visualizationArgTypes
} from "../../../tools/storybook/controls";
import { randomGraphDecorator } from "../../../tools/storybook/decorators";

interface SpringStoryArgs extends GraphGeneratorOptions, SpringLayoutOptions {
  width: number;
  height: number;
  nodeRadius: number;
  showLabels: boolean;
}

const meta: Meta<SpringStoryArgs> = {
  title: "Layout/2D/Spring",
  decorators: [randomGraphDecorator],
  argTypes: {
    ...graphGeneratorArgTypes,
    ...visualizationArgTypes,
    iterations: {
      control: { type: "range", min: 10, max: 500, step: 10 },
      description: "Number of simulation iterations",
      table: {
        category: "Layout Parameters",
        defaultValue: { summary: 100 },
      },
    },
    k: {
      control: { type: "range", min: 0.1, max: 5, step: 0.1 },
      description: "Optimal distance between nodes (spring constant)",
      table: {
        category: "Layout Parameters",
        defaultValue: { summary: 1 },
      },
    },
    scale: {
      control: { type: "range", min: 100, max: 500, step: 10 },
      description: "Scale factor for final positions",
      table: {
        category: "Layout Parameters",
        defaultValue: { summary: 250 },
      },
    },
  },
  args: {
    // Graph generation
    nodeCount: 15,
    graphType: "random",
    edgeProbability: 0.2,
    directed: false,
    weighted: false,
    seed: 42,
    // Layout parameters
    iterations: 100,
    k: 1,
    scale: 250,
    // Visualization
    width: 800,
    height: 600,
    nodeRadius: 15,
    showLabels: true,
  },
  parameters: {
    chromatic: {
      delay: 100,
    },
    docs: {
      description: {
        component: `
# Spring Layout (Fruchterman-Reingold)

A force-directed layout algorithm that simulates a physical system of springs and repelling charges.

## Parameters
- **iterations**: More iterations = better convergence but slower
- **k**: Controls the optimal distance between connected nodes
- **scale**: Multiplier for final coordinate positions

## Use Cases
- General-purpose graph visualization
- Social networks
- Dependency graphs
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<SpringStoryArgs>;

export const Default: Story = {
  render: (args) => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "16px";

    // Generate graph
    const graph = generateGraph({
      nodeCount: args.nodeCount,
      graphType: args.graphType,
      seed: args.seed,
      edgeProbability: args.edgeProbability,
      directed: args.directed,
      weighted: args.weighted,
    });

    // Create SVG
    const svg = createSvgContainer(args.width, args.height);
    container.appendChild(svg);

    // Apply layout
    const layoutResult = springLayout(graph, {
      iterations: args.iterations,
      k: args.k,
      scale: args.scale,
      seed: args.seed, // For determinism
    });

    // Convert layout result to positions map
    const positions = new Map<string, Position>();
    const margin = args.nodeRadius * 2;

    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const [node, pos] of layoutResult) {
      minX = Math.min(minX, pos[0]);
      maxX = Math.max(maxX, pos[0]);
      minY = Math.min(minY, pos[1]);
      maxY = Math.max(maxY, pos[1]);
    }

    // Scale to fit
    const scaleX = (args.width - margin * 2) / (maxX - minX || 1);
    const scaleY = (args.height - margin * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    for (const [node, pos] of layoutResult) {
      positions.set(node, {
        x: margin + (pos[0] - minX) * scale,
        y: margin + (pos[1] - minY) * scale,
      });
    }

    // Render
    renderGraph(svg, graph, positions, {
      width: args.width,
      height: args.height,
      nodeRadius: args.nodeRadius,
      showLabels: args.showLabels,
      showWeights: false,
    });

    // Re-render on graph regeneration
    container.addEventListener("regenerate-graph", ((e: CustomEvent) => {
      const newGraph = generateGraph({
        nodeCount: args.nodeCount,
        graphType: args.graphType,
        seed: e.detail.seed,
        edgeProbability: args.edgeProbability,
        directed: args.directed,
        weighted: args.weighted,
      });

      const newLayout = springLayout(newGraph, {
        iterations: args.iterations,
        k: args.k,
        scale: args.scale,
        seed: e.detail.seed,
      });

      // Update positions and re-render
      // ... (similar scaling logic)
    }) as EventListener);

    // Info panel
    const info = document.createElement("div");
    info.style.cssText = `
      display: flex;
      gap: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
    `;
    info.innerHTML = `
      <div><strong>Layout:</strong> Spring (Fruchterman-Reingold)</div>
      <div><strong>Nodes:</strong> ${args.nodeCount}</div>
      <div><strong>Iterations:</strong> ${args.iterations}</div>
      <div><strong>K:</strong> ${args.k}</div>
    `;
    container.appendChild(info);

    return container;
  },
};

// Different graph types for visual comparison
export const CompleteGraph: Story = {
  args: {
    ...Default.args,
    graphType: "complete",
    nodeCount: 8,
  },
};

export const StarGraph: Story = {
  args: {
    ...Default.args,
    graphType: "star",
    nodeCount: 12,
  },
};

export const GridGraph: Story = {
  args: {
    ...Default.args,
    graphType: "grid",
    nodeCount: 16,
  },
};

export const ScaleFreeGraph: Story = {
  args: {
    ...Default.args,
    graphType: "scale-free",
    nodeCount: 20,
  },
};
```

### Chromatic Configuration

#### algorithms/chromatic.config.json

```json
{
  "projectId": "Project:algorithms-storybook-id",
  "onlyChanged": true,
  "zip": true,
  "externals": [
    "**/*.css"
  ]
}
```

#### layout/chromatic.config.json

```json
{
  "projectId": "Project:layout-storybook-id",
  "onlyChanged": true,
  "zip": true,
  "externals": [
    "**/*.css"
  ]
}
```

## Implementation Plan

### Phase 1: Infrastructure Setup

1. **Create shared Storybook infrastructure at monorepo level**
   ```bash
   mkdir -p tools/storybook
   ```
   Create shared modules:
   - `tools/storybook/storybook.shared.config.ts` - Config factory
   - `tools/storybook/preview.shared.ts` - Shared preview config
   - `tools/storybook/graph-generators.ts` - Seeded graph generation
   - `tools/storybook/visualization-2d.ts` - SVG rendering
   - `tools/storybook/visualization-3d.ts` - Three.js rendering (for 3D layouts)
   - `tools/storybook/controls.ts` - Shared control definitions
   - `tools/storybook/decorators.ts` - Shared decorators
   - `tools/storybook/styles.css` - Shared styles

2. **Add Storybook dependencies to algorithms and layout packages**
   ```bash
   cd algorithms && pnpm add -D @storybook/html-vite @storybook/addon-docs @chromatic-com/storybook @storybook/addon-vitest storybook chromatic
   cd layout && pnpm add -D @storybook/html-vite @storybook/addon-docs @chromatic-com/storybook @storybook/addon-vitest storybook chromatic three @types/three
   ```

3. **Create .storybook configuration directories**
   - `algorithms/.storybook/main.ts` (imports from tools/storybook/)
   - `algorithms/.storybook/preview.ts` (extends shared preview)
   - `algorithms/.env.example` (PORT=9001)
   - `layout/.storybook/main.ts` (imports from tools/storybook/)
   - `layout/.storybook/preview.ts` (extends shared preview)
   - `layout/.env.example` (PORT=9011)

4. **Add npm scripts to package.json files**
   ```json
   {
     "scripts": {
       "storybook": ". ./.env 2>/dev/null; storybook dev -p ${PORT:-9001} --host ${HOST:-localhost} ${HTTPS_CERT_PATH:+--https --ssl-cert $HTTPS_CERT_PATH --ssl-key $HTTPS_KEY_PATH} --no-open",
       "build-storybook": "storybook build",
       "chromatic": "chromatic --exit-zero-on-changes"
     }
   }
   ```

5. **Add root-level scripts for unified development**
   ```json
   {
     "scripts": {
       "storybook:algorithms": "pnpm --filter @graphty/algorithms storybook",
       "storybook:layout": "pnpm --filter @graphty/layout storybook"
     }
   }
   ```

6. **Create initial test story for each package**
   - `algorithms/stories/HelloWorld.stories.ts` - Minimal story to verify setup
   - `layout/stories/HelloWorld.stories.ts` - Minimal story to verify setup

#### Phase 1 Verification (Playwright MCP)

After completing Phase 1, verify the implementation using Playwright MCP:

```bash
# Start Storybook servers
pnpm run storybook:algorithms &  # Port 9001
pnpm run storybook:layout &       # Port 9011
```

**Verification Checklist (use Playwright MCP):**
1. Navigate to `http://localhost:9001` - Verify algorithms Storybook loads
2. Navigate to `http://localhost:9011` - Verify layout Storybook loads
3. Take snapshot of each Storybook sidebar to confirm HelloWorld story appears
4. Click on HelloWorld story - Verify it renders without errors
5. Check browser console for any JavaScript errors
6. Verify controls panel appears in Storybook

### Phase 2: Algorithm Stories Migration

Convert demos in order of complexity (simpler first):

1. **Traversal** (2 demos)
   - BFS
   - DFS

2. **Shortest Path** (3 demos)
   - Dijkstra
   - Bellman-Ford
   - Floyd-Warshall

3. **Centrality** (7 demos)
   - Degree Centrality
   - PageRank
   - Betweenness
   - Closeness
   - Eigenvector
   - Katz
   - HITS

4. **Graph Components** (1 demo)
   - Connected Components

5. **MST** (2 demos)
   - Kruskal
   - Prim

6. **Pathfinding** (1 demo)
   - A*

7. **Community Detection** (4 demos)
   - Louvain
   - Label Propagation
   - Girvan-Newman
   - Leiden

8. **Clustering** (4 demos)
   - K-Core
   - Hierarchical
   - Spectral
   - MCL

9. **Flow** (2 demos)
   - Ford-Fulkerson
   - Min-Cut

10. **Link Prediction** (2 demos)
    - Common Neighbors
    - Adamic-Adar

11. **Matching** (2 demos)
    - Bipartite Matching
    - Graph Isomorphism

#### Phase 2 Verification (Playwright MCP)

After completing each algorithm category, verify using Playwright MCP:

```bash
# Ensure Storybook is running
pnpm run storybook:algorithms  # Port 9001
```

**Verification Checklist (use Playwright MCP for each category):**
1. Navigate to the algorithm story (e.g., `http://localhost:9001/?path=/story/algorithms-traversal-bfs--default`)
2. Take screenshot of the rendered graph visualization
3. Verify SVG element exists and contains nodes/edges
4. Test "Random Graph" button functionality (if not in Chromatic mode)
5. Test animation controls (Play/Step/Reset) for algorithm demos
6. Verify controls panel shows expected inputs (node count, graph type, etc.)
7. Check that changing controls updates the visualization
8. Verify no console errors during interaction

**Determinism Verification:**
1. Reload the story multiple times
2. Take screenshots each time
3. Verify screenshots are identical (same seed = same output)

### Phase 3: Layout Stories Migration

1. **2D Layouts** (13 demos)
   - Random Layout
   - Circular Layout
   - Shell Layout
   - Spring Layout (Fruchterman-Reingold)
   - Spectral Layout
   - Spiral Layout
   - Bipartite Layout
   - Multipartite Layout
   - BFS Layout
   - Planar Layout
   - Kamada-Kawai Layout
   - ForceAtlas2 Layout
   - ARF Layout

2. **3D Layouts** (4 demos)
   - 3D Spring Layout
   - 3D ForceAtlas2
   - 3D Kamada-Kawai
   - 3D Spherical Layout

   Note: 3D stories require Three.js integration and will render to a canvas instead of SVG.

#### Phase 3 Verification (Playwright MCP)

After completing layout stories, verify using Playwright MCP:

```bash
# Ensure Storybook is running
pnpm run storybook:layout  # Port 9011
```

**2D Layout Verification Checklist:**
1. Navigate to each 2D layout story (e.g., `http://localhost:9011/?path=/story/layout-2d-spring--default`)
2. Take screenshot of the rendered graph
3. Verify SVG element exists with properly positioned nodes
4. Test layout parameter controls (iterations, spring constant, etc.)
5. Verify changing parameters updates the layout
6. Test "Random Graph" button generates new graph
7. Verify no console errors

**3D Layout Verification Checklist:**
1. Navigate to each 3D layout story
2. Take screenshot of the Three.js canvas
3. Verify 3D scene renders with nodes visible
4. Test orbit controls (drag to rotate, scroll to zoom) if not in Chromatic
5. Verify layout parameter controls work
6. Check WebGL context is properly initialized
7. Verify no console errors

**Cross-Browser Verification (optional):**
Run Playwright tests in multiple browsers to ensure consistent rendering.

### Phase 4: CI/CD Integration & GitHub Pages Deployment

1. **Update CI workflow** (`.github/workflows/ci.yml`)

   Add Storybook build jobs:
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
       - run: pnpm --filter @graphty/layout build-storybook
       - uses: actions/upload-artifact@v4
         with:
           name: storybook-layout
           path: layout/storybook-static
   ```

2. **Add Chromatic visual testing jobs**
   ```yaml
   chromatic-algorithms:
     runs-on: ubuntu-latest
     needs: build-storybook-algorithms
     steps:
       - uses: actions/checkout@v4
         with:
           fetch-depth: 0  # Required for Chromatic
       - uses: pnpm/action-setup@v4
       - uses: actions/setup-node@v4
       - run: pnpm install
       - uses: chromaui/action@latest
         with:
           projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN_ALGORITHMS }}
           workingDir: algorithms
           buildScriptName: build-storybook
           onlyChanged: true

   chromatic-layout:
     runs-on: ubuntu-latest
     needs: build-storybook-layout
     steps:
       - uses: actions/checkout@v4
         with:
           fetch-depth: 0
       - uses: pnpm/action-setup@v4
       - uses: actions/setup-node@v4
       - run: pnpm install
       - uses: chromaui/action@latest
         with:
           projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN_LAYOUT }}
           workingDir: layout
           buildScriptName: build-storybook
           onlyChanged: true
   ```

3. **Update deploy-pages workflow** (`.github/workflows/deploy-pages.yml`)

   Combine all Storybooks into unified GitHub Pages deployment:
   ```yaml
   deploy-pages:
     runs-on: ubuntu-latest
     needs: [build-storybook-algorithms, build-storybook-layout, build-docs]
     permissions:
       pages: write
       id-token: write
     environment:
       name: github-pages
       url: ${{ steps.deployment.outputs.page_url }}
     steps:
       - uses: actions/checkout@v4

       # Download all artifacts
       - uses: actions/download-artifact@v4
         with:
           name: storybook-algorithms
           path: _site/storybook/algorithms

       - uses: actions/download-artifact@v4
         with:
           name: storybook-layout
           path: _site/storybook/layout

       - uses: actions/download-artifact@v4
         with:
           name: storybook-graphty-element
           path: _site/storybook/graphty-element

       - uses: actions/download-artifact@v4
         with:
           name: docs
           path: _site/docs

       # Create index page with links to all Storybooks
       - name: Create landing page
         run: |
           cat > _site/index.html << 'EOF'
           <!DOCTYPE html>
           <html>
           <head>
             <title>Graphty Documentation</title>
             <style>
               body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
               a { display: block; margin: 10px 0; }
             </style>
           </head>
           <body>
             <h1>Graphty Documentation</h1>
             <h2>Storybooks</h2>
             <a href="./storybook/algorithms/">📊 Algorithms Storybook</a>
             <a href="./storybook/layout/">📐 Layout Storybook</a>
             <a href="./storybook/graphty-element/">🎨 graphty-element Storybook</a>
             <h2>API Documentation</h2>
             <a href="./docs/algorithms/">Algorithms API</a>
             <a href="./docs/layout/">Layout API</a>
             <a href="./docs/graphty-element/">graphty-element API</a>
           </body>
           </html>
           EOF

       - uses: actions/upload-pages-artifact@v3
         with:
           path: _site

       - uses: actions/deploy-pages@v4
         id: deployment
   ```

4. **GitHub Pages URL Structure**

   After deployment, Storybooks will be available at:
   - `https://graphty-org.github.io/graphty-monorepo/storybook/algorithms/`
   - `https://graphty-org.github.io/graphty-monorepo/storybook/layout/`
   - `https://graphty-org.github.io/graphty-monorepo/storybook/graphty-element/`

#### Phase 4 Verification (Playwright MCP)

After CI/CD integration, verify the deployment:

```bash
# Trigger a CI build and wait for GitHub Pages deployment
```

**Verification Checklist (use Playwright MCP):**
1. Navigate to the GitHub Pages URL for each Storybook
2. Verify each Storybook loads correctly
3. Test navigation between stories
4. Verify all assets (CSS, JS, images) load correctly
5. Test that stories render properly in the deployed environment
6. Verify Chromatic builds complete successfully in CI
7. Check that Chromatic visual baselines are established

### Phase 5: Documentation & Cleanup

1. **Update README files** with links to Storybook demos
   - Add Storybook badges to package READMEs
   - Include links to deployed GitHub Pages Storybooks
   - Update "Getting Started" sections to reference Storybook demos

2. **Archive or remove** old HTML demo files
   - Move `algorithms/examples/html/` to `algorithms/examples/html-legacy/`
   - Move `layout/examples/` to `layout/examples-legacy/`
   - Keep for reference during transition period
   - Remove after confirming all functionality is migrated

3. **Add Storybook-specific documentation** to package CLAUDE.md files
   - Document Storybook commands and ports
   - Add notes about story organization
   - Include Chromatic workflow information

4. **Update monorepo CLAUDE.md**
   - Add Storybook port assignments
   - Document shared tools/storybook/ utilities
   - Update development workflow sections

#### Phase 5 Verification (Playwright MCP)

Final verification of the complete migration:

**Documentation Verification:**
1. Navigate to GitHub repository README
2. Verify Storybook links work correctly
3. Check that all package READMEs have been updated

**Legacy Demo Verification:**
1. Confirm old HTML demos are archived (not deleted)
2. Verify Storybook provides equivalent functionality for each demo

**Complete Feature Parity Check (use Playwright MCP):**
1. For each original HTML demo:
   - Open the legacy demo and take screenshot
   - Open the corresponding Storybook story and take screenshot
   - Compare functionality (controls, animations, visualizations)
2. Document any differences or improvements
3. Verify all 47 demos have Storybook equivalents

## Determinism Guarantees

To ensure Chromatic visual tests are reliable:

1. **Fixed Seeds**: All graph generation uses `seed: 42` by default
2. **Seeded RNG**: Custom `SeededRandom` class ensures reproducible random numbers
3. **Layout Seeds**: Pass seed to layout algorithms that support it
4. **Chromatic Detection**: Use `isChromatic()` to:
   - Skip animations and show final state
   - Use fixed seed regardless of user selection
   - Disable random graph button
5. **Static Initial Positions**: For algorithms with step-by-step animation, show completed final state in Chromatic

## Random Graph Button Implementation

The "Random Graph" button provides users with a way to:

1. Generate new graph instances with different seeds
2. Test algorithm/layout behavior on varied inputs
3. Explore edge cases interactively

**Implementation Details:**
- Hidden in Chromatic (`isChromatic() === true`) for determinism
- Dispatches `regenerate-graph` custom event with new seed
- Stories listen for event and re-render with new graph
- Seed value displayed for reproducibility

```typescript
// Button visibility
if (!isChromatic()) {
  const randomButton = document.createElement("button");
  randomButton.textContent = "🎲 Random Graph";
  randomButton.addEventListener("click", () => {
    container.dispatchEvent(
      new CustomEvent("regenerate-graph", {
        bubbles: true,
        detail: { seed: Date.now() },
      })
    );
  });
}
```

## Port Assignments

Following the existing port convention (9000-9099):

| Package | Dev Server | Storybook |
|---------|------------|-----------|
| algorithms | 9000 | 9001 |
| layout | 9010 | 9011 |
| graphty-element | 9020 | 9025 |
| graphty | 9050 | 9035 |

## Migration Checklist

For each demo being converted:

- [ ] Create story file with proper Meta configuration
- [ ] Implement render function with all controls
- [ ] Add `randomGraphDecorator` for interactive graph regeneration
- [ ] Add animation controls decorator (for step-by-step algorithms)
- [ ] Add documentation in story parameters
- [ ] Create variant stories for different graph types
- [ ] Create "FinalState" story for Chromatic testing
- [ ] Verify determinism with fixed seed
- [ ] Test Chromatic snapshot quality
- [ ] Update any cross-references in documentation

## Success Criteria

1. **All 47 demos converted** to Storybook stories
2. **100% deterministic** visual tests in Chromatic
3. **Feature parity** with existing HTML demos (same controls, same visualizations)
4. **Interactive exploration** via Random Graph button
5. **Consistent UX** across all algorithm and layout stories
6. **CI integration** with Chromatic for visual regression testing
7. **GitHub Pages deployment** with all Storybooks accessible
8. **Documentation** updated with links to new Storybook instances
9. **Playwright MCP verification** completed for each phase
10. **Shared infrastructure** hoisted to `tools/storybook/` for code reuse
11. **Environment configuration** using `.env` pattern consistent with graphty-element

## Summary

This plan converts 47 HTML demos (30+ algorithm demos, 17 layout demos) to Storybook stories with:

- **Shared infrastructure** at `tools/storybook/` for code reuse across packages
- **Environment-based configuration** using `.env` files for PORT, HOST, and HTTPS settings
- **Chromatic integration** for visual regression testing
- **GitHub Pages deployment** for public access to all Storybooks
- **Playwright MCP verification** at the end of each implementation phase

The implementation follows a phased approach with explicit verification steps to ensure quality at each stage.
