# Algorithm & Layout Options Refactoring Plan

**Version:** 1.0
**Date:** 2025-12-20
**Status:** Proposed

## Overview

This document outlines a plan to unify the options handling for both algorithms and layouts in the graphty React app. The goal is to eliminate duplicated schema definitions, leverage graphty-element's new unified Zod-based schema system, and create shared UI components for rendering options forms.

## Current State

### Master Branch (Layouts)

The layout options implementation uses a pattern that duplicates schemas:

```
src/
├── data/
│   ├── layoutMetadata.ts         # 16 layouts with category/description
│   └── layoutSchemas.ts          # Duplicated Zod schemas + HIDDEN_FIELDS
├── components/
│   ├── RunLayoutsModal.tsx       # Layout selection + options modal
│   └── layout-options/
│       └── LayoutOptionsForm.tsx # Dynamic form from Zod schema
└── utils/
    └── zodSchemaParser.ts        # Introspects Zod _def internals
```

**Issues:**
1. Schemas duplicated from graphty-element (maintenance burden)
2. No metadata (labels, descriptions) - generated from camelCase field names
3. Manual `HIDDEN_FIELDS` map instead of schema-based `advanced` flag
4. Zod introspection via `_def` is fragile (internal API)

### Algorithms Branch (Current)

The algorithm modal has a static catalog but no dynamic options:

```
src/
├── components/
│   └── RunAlgorithmModal.tsx     # Static ALGORITHM_CATALOG, no options form
└── types/
    └── graphty-element.ts        # Type definitions for graphty-element
```

**Issues:**
1. `ALGORITHM_CATALOG` is manually maintained, duplicates graphty-element info
2. Only supports source/target node selection, not algorithm-specific options
3. No dynamic form generation from schemas

### graphty-element (Authoritative Source)

graphty-element now provides rich APIs for both:

```typescript
// Layouts
import { getAllLayoutInfo, getAllLayoutSchemas } from "@graphty/graphty-element";
// Returns: { type, maxDimensions, zodOptionsSchema, hasZodOptions }

// Algorithms
import { getAllAlgorithmInfo, getAllAlgorithmSchemas } from "@graphty/graphty-element";
// Returns: { namespace, type, key, schema, hasOptions, hasSuggestedStyles }

// Schema utilities
import { getOptionsMeta, getOptionsFiltered, getOptionsGrouped, parseOptions } from "@graphty/graphty-element";
```

Each schema includes rich metadata:
```typescript
defineOptions({
    dampingFactor: {
        schema: z.number().min(0).max(1).default(0.85),
        meta: {
            label: "Damping Factor",
            description: "Probability of following a link",
            step: 0.05,
            advanced: false,
        },
    },
});
```

## Proposed Architecture

### File Structure After Refactoring

```
src/
├── components/
│   ├── options/
│   │   ├── OptionsForm.tsx           # Shared dynamic form component
│   │   ├── OptionsForm.test.tsx      # Tests for shared form
│   │   └── index.ts                  # Exports
│   ├── RunLayoutsModal.tsx           # Refactored to use OptionsForm
│   ├── RunLayoutsModal.test.tsx      # Updated tests
│   ├── RunAlgorithmModal.tsx         # Refactored to use OptionsForm
│   └── RunAlgorithmModal.test.tsx    # Updated tests
├── data/
│   └── (delete layoutMetadata.ts)    # No longer needed
│   └── (delete layoutSchemas.ts)     # No longer needed
├── utils/
│   └── (delete zodSchemaParser.ts)   # No longer needed
└── types/
    └── graphty-element.ts            # Keep, may need updates
```

### Component Design

#### OptionsForm (Shared Component)

A single form component that renders controls for any `OptionsSchema`:

```typescript
import type { OptionsSchema } from "@graphty/graphty-element";

interface OptionsFormProps {
    /** The options schema from graphty-element */
    schema: OptionsSchema;
    /** Current option values */
    values: Record<string, unknown>;
    /** Callback when values change */
    onChange: (values: Record<string, unknown>) => void;
    /** Whether to show advanced options (default: false) */
    showAdvanced?: boolean;
    /** Optional filter for which options to show */
    filter?: (key: string, meta: OptionMeta) => boolean;
}

export function OptionsForm({
    schema,
    values,
    onChange,
    showAdvanced = false,
    filter,
}: OptionsFormProps): React.JSX.Element;
```

**Rendering Logic:**

| Schema Type | Mantine Control | Notes |
|-------------|-----------------|-------|
| `z.number()` | `NumberInput` | Uses `min`, `max`, `step` from metadata |
| `z.boolean()` | `Checkbox` | Simple toggle |
| `z.enum()` | `Select` | Options from enum values |
| `z.string()` | `TextInput` | For simple string options |
| Complex types | Hidden | Arrays, records, objects skipped |

**Features:**
- Uses explicit `label` and `description` from metadata
- Respects `advanced` flag for show/hide
- Uses `step` for number input increments
- Groups options using `getOptionsGrouped()` if categories exist

#### RunLayoutsModal (Refactored)

```typescript
import { getAllLayoutInfo, getOptionsMeta, parseOptions } from "@graphty/graphty-element";
import { OptionsForm } from "./options/OptionsForm";

// Get layout info directly from graphty-element
const layoutInfos = getAllLayoutInfo();

// Group by category (force, geometric, hierarchical, special)
const layoutsByCategory = groupLayoutsByCategory(layoutInfos);
```

**Changes from current:**
1. Remove import of `layoutSchemas.ts` and `layoutMetadata.ts`
2. Use `getAllLayoutInfo()` for layout catalog
3. Use `zodOptionsSchema` from each layout for form generation
4. Replace `LayoutOptionsForm` with shared `OptionsForm`

#### RunAlgorithmModal (Refactored)

```typescript
import { getAllAlgorithmInfo, getOptionsMeta, parseOptions } from "@graphty/graphty-element";
import { OptionsForm } from "./options/OptionsForm";

// Get algorithm info directly from graphty-element
const algorithmInfos = getAllAlgorithmInfo();

// Group by category
const ALGORITHM_CATEGORIES = {
    centrality: ["degree", "pagerank", "betweenness", "closeness", "eigenvector", "katz", "hits"],
    community: ["louvain", "leiden", "girvan-newman", "label-propagation"],
    "shortest-path": ["dijkstra", "bellman-ford", "floyd-warshall"],
    traversal: ["bfs", "dfs"],
    components: ["connected-components", "scc"],
    mst: ["kruskal", "prim"],
    flow: ["max-flow", "min-cut", "bipartite-matching"],
};
```

**Changes from current:**
1. Remove static `ALGORITHM_CATALOG` (or derive from `getAllAlgorithmInfo()`)
2. Add `OptionsForm` for algorithm-specific options
3. Keep source/target node selection for algorithms that need it
4. Pass all options to `runAlgorithm()` via `algorithmOptions`

## Implementation Plan

### Phase 1: Merge & Setup

1. **Merge master branch into algorithms worktree**
   - Brings in layout modal implementation
   - Resolves any conflicts

2. **Verify graphty-element exports**
   - Confirm `getAllLayoutInfo()`, `getAllAlgorithmInfo()` work
   - Confirm `getOptionsMeta()`, `getOptionsFiltered()` work
   - Update `src/types/graphty-element.ts` if needed

### Phase 2: Create Shared OptionsForm

1. **Create `src/components/options/OptionsForm.tsx`**
   - Generic form component using graphty-element utilities
   - Renders NumberInput, Checkbox, Select based on schema type
   - Supports `showAdvanced` toggle
   - Uses metadata for labels, descriptions, step values

2. **Create `src/components/options/OptionsForm.test.tsx`**
   - Test rendering for each field type
   - Test value changes and callbacks
   - Test advanced options toggle
   - Test with real schemas from graphty-element

### Phase 3: Refactor RunLayoutsModal

1. **Update imports**
   - Import `getAllLayoutInfo` from graphty-element
   - Import shared `OptionsForm`
   - Remove imports from `layoutSchemas.ts`, `layoutMetadata.ts`

2. **Replace layout catalog**
   - Use `getAllLayoutInfo()` instead of static metadata
   - Derive categories from layout types or add category to `LayoutInfo`

3. **Replace form component**
   - Use `OptionsForm` with `zodOptionsSchema`
   - Remove `hiddenFields` prop (use `showAdvanced` instead)

4. **Update tests**
   - Adjust mocks for new data flow
   - Test with graphty-element schemas

### Phase 4: Refactor RunAlgorithmModal

1. **Add options form section**
   - Add `OptionsForm` below algorithm selection
   - Show/hide based on `hasOptions`
   - Manage options state

2. **Update algorithm catalog**
   - Consider deriving from `getAllAlgorithmInfo()` or keep manual for categories
   - Add descriptions from graphty-element if available

3. **Update runAlgorithm call**
   - Merge form options with source/target options
   - Pass all via `algorithmOptions`

4. **Update tests**
   - Test options form rendering
   - Test option values passed to runAlgorithm

### Phase 5: Cleanup

1. **Delete obsolete files**
   - `src/data/layoutMetadata.ts`
   - `src/data/layoutSchemas.ts`
   - `src/utils/zodSchemaParser.ts`
   - `src/components/layout-options/LayoutOptionsForm.tsx`

2. **Update any remaining imports**

3. **Run full test suite**
   - `npm run test:ci`
   - `npm run lint`
   - `npm run build`

## Type Updates for graphty-element.d.ts

The types file may need updates to expose the new APIs:

```typescript
// Add to GraphtyElementType or as separate exports
export interface LayoutInfo {
    type: string;
    maxDimensions: number;
    zodOptionsSchema: OptionsSchema;
    hasZodOptions: boolean;
}

export interface AlgorithmInfo {
    namespace: string;
    type: string;
    key: string;
    schema: OptionsSchema;
    hasOptions: boolean;
    hasSuggestedStyles: boolean;
}

// May need to import these from graphty-element package directly
// rather than defining locally
```

## Migration Notes

### Breaking Changes

None expected - this is an internal refactoring.

### Backward Compatibility

- Layout modal behavior remains the same
- Algorithm modal gains new options but existing functionality preserved
- All existing tests should pass after updates

### Testing Strategy

1. **Unit tests**: Each component tested in isolation
2. **Integration tests**: Modal interaction with graphty-element
3. **Manual testing**: Verify UI renders correctly, options applied to graph

## Success Criteria

1. ✅ No duplicated schema definitions in graphty React app
2. ✅ Single `OptionsForm` component used by both modals
3. ✅ All layout options configurable via UI
4. ✅ All algorithm options configurable via UI
5. ✅ Labels and descriptions from graphty-element metadata
6. ✅ Advanced options hidden by default, toggleable
7. ✅ All tests passing
8. ✅ Lint and build passing

## Implementation Notes (Updated 2025-12-20)

### Blocking Issues Found

During Phase 3, we discovered that several utilities needed from graphty-element are not exported from the main package:

1. **Not exported from main package:**
   - `getAllLayoutInfo()` - exists in layout/index but not re-exported
   - `getAllAlgorithmInfo()` - exists in algorithms/index but not re-exported
   - `getDefaults()`, `getOptionsMeta()`, `getOptionsFiltered()` - exist in config/OptionsSchema but not re-exported

2. **Workarounds implemented:**
   - Created local implementations of `getDefaults()`, `getOptionsMeta()`, `getOptionsFiltered()` in OptionsForm.tsx
   - For algorithms: Use `Algorithm.getZodOptionsSchema()` which IS exported and works
   - For layouts: Keep existing `LayoutOptionsForm` until graphty-element exports are added

### graphty-element Changes Needed

Add to main package exports:
```typescript
// From config/OptionsSchema
export type { ConfigurableInfo, InferOptions, OptionDefinition, OptionMeta, OptionsSchema, PartialOptions, SafeParseResult } from "./src/config/OptionsSchema";
export { defineOptions, getDefaults, getOptionsFiltered, getOptionsGrouped, getOptionsMeta, hasOptions, parseOptions, safeParseOptions, toZodSchema } from "./src/config/OptionsSchema";

// From layout/index
export { getAllLayoutInfo, getAllLayoutSchemas } from "./src/layout/index";
export type { LayoutInfo } from "./src/layout/index";

// From algorithms/index
export { getAllAlgorithmInfo, getAllAlgorithmSchemas } from "./src/algorithms/index";
export type { AlgorithmInfo } from "./src/algorithms/index";
```

### Revised Plan

- **Phase 3 (Layouts):** Keep existing LayoutOptionsForm - it works and the needed exports aren't available yet
- **Phase 4 (Algorithms):** Add OptionsForm to RunAlgorithmModal using `Algorithm.getZodOptionsSchema()`
- **Phase 5:** Keep layout files until graphty-element is updated, clean up algorithm catalog duplication

## Future Enhancements

1. **Options presets**: Save/load option configurations
2. **Options diff**: Show which options differ from defaults
3. **Options export**: Copy options as JSON for sharing
4. **Live preview**: See layout/algorithm changes as options change
