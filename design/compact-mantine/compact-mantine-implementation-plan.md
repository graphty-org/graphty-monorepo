# compact-mantine Implementation Plan

## Overview

This document provides a detailed, phased implementation plan for the `@graphty/compact-mantine` package as specified in the [design document](./compact-mantine-design.md).

**Goal**: Extract the Mantine theme and custom components from `@graphty/graphty` into a standalone redistributable npm package.

**Total Estimated Effort**: 10-15 days (phases can overlap)

---

## Phase 1: Package Setup (Days 1-2)

### 1.1 Create Package Directory Structure

**Task**: Initialize the new package in the monorepo.

```bash
# Create directories
mkdir -p compact-mantine/src/{theme/components,components,hooks,constants,utils,types}
mkdir -p compact-mantine/tests/{theme,components}
mkdir -p compact-mantine/stories
mkdir -p compact-mantine/.storybook
```

**Implementation Steps**:

1. Create `compact-mantine/` directory at monorepo root
2. Create subdirectory structure per design document Section 2.1
3. Add to `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'algorithms'
     - 'layout'
     - 'graphty-element'
     - 'graphty'
     - 'compact-mantine'  # Add this line
   ```

**Tests**:
- Verify directory exists
- Verify pnpm recognizes new workspace: `pnpm ls --filter @graphty/compact-mantine`

**Dependencies**: None

**Verification**: `pnpm install` completes without errors

---

### 1.2 Create package.json

**Task**: Create package configuration with proper peer dependencies.

**Implementation**:

Create `compact-mantine/package.json`:
```json
{
  "name": "@graphty/compact-mantine",
  "version": "0.1.0",
  "description": "Compact size variants for Mantine UI components - optimized for dense UIs",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": [
    "dist"
  ],
  "sideEffects": false,
  "peerDependencies": {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0",
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@mantine/core": "^8.3.10",
    "@mantine/hooks": "^8.3.10",
    "@storybook/addon-essentials": "^8.6.12",
    "@storybook/react": "^8.6.12",
    "@storybook/react-vite": "^8.6.12",
    "@storybook/test": "^8.6.12",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitejs/plugin-react": "^4.5.2",
    "jsdom": "^26.1.0",
    "lucide-react": "^0.525.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "storybook": "^8.6.12",
    "typescript": "~5.8.3",
    "vite": "^6.3.5",
    "vite-plugin-dts": "^4.5.4",
    "vitest": "^3.2.3"
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage",
    "storybook": "storybook dev",
    "build-storybook": "storybook build",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  },
  "keywords": [
    "mantine",
    "react",
    "ui",
    "theme",
    "compact",
    "sidebar",
    "property-panel"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/graphty-org/graphty-monorepo.git",
    "directory": "compact-mantine"
  }
}
```

**Tests**:
- `pnpm install` succeeds
- `pnpm ls --filter @graphty/compact-mantine` shows package

**Dependencies**: Step 1.1

**Verification**: Package installs correctly

---

### 1.3 Create Build Configuration

**Task**: Set up Vite and TypeScript for library builds.

**Implementation**:

Create `compact-mantine/vite.config.ts`:
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true,
            rollupTypes: true,
        }),
    ],
    build: {
        lib: {
            entry: "src/index.ts",
            formats: ["es", "cjs"],
            fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
        },
        rollupOptions: {
            external: [
                "react",
                "react-dom",
                "react/jsx-runtime",
                "@mantine/core",
                "@mantine/hooks",
                "lucide-react",
            ],
        },
    },
});
```

Create `compact-mantine/tsconfig.json`:
```json
{
    "extends": "../tsconfig.base.json",
    "compilerOptions": {
        "outDir": "dist",
        "declaration": true,
        "declarationDir": "dist",
        "composite": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx", "stories"]
}
```

**Tests**:
- `npm run build` produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`
- Types are correctly generated

**Dependencies**: Steps 1.1, 1.2

**Verification**: Build produces correct output files

---

### 1.4 Create Test Configuration

**Task**: Set up Vitest for testing.

**Implementation**:

Create `compact-mantine/vitest.config.ts`:
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage",
            thresholds: {
                lines: 80,
                functions: 80,
                statements: 80,
                branches: 75,
            },
        },
    },
});
```

Create `compact-mantine/tests/setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
import "@mantine/core/styles.css";
```

**Tests**:
- `npm test` runs without errors
- Test file discovery works

**Dependencies**: Steps 1.1-1.3

**Verification**: `npm run test:run` executes successfully

---

### 1.5 Create Storybook Configuration

**Task**: Set up Storybook using existing configs as reference.

**Implementation**:

Update `compact-mantine/package.json` storybook script to use port 9060:
```json
{
    "scripts": {
        "storybook": "storybook dev -p 9060 --no-open"
    }
}
```

Note: The port is passed via command line flag (like graphty) rather than .env to avoid conflicts with the monorepo root .env PORT setting.

Create `compact-mantine/.storybook/main.ts`:
```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
    stories: ["../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)", "../src/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
    addons: ["@storybook/addon-essentials", "@chromatic-com/storybook"],
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    docs: {},
    typescript: {
        reactDocgen: "react-docgen-typescript",
    },
    core: {
        disableTelemetry: true,
    },
    async viteFinal(config, { configType }) {
        const fs = await import("fs");
        const path = await import("path");
        const { mergeConfig, loadEnv } = await import("vite");

        // Load env file from monorepo root (one level up from this package)
        const monorepoRoot = path.resolve(__dirname, "../..");
        const env = loadEnv(configType === "DEVELOPMENT" ? "development" : "production", monorepoRoot, "");

        // Also load package-level .env
        const packageEnv = loadEnv(configType === "DEVELOPMENT" ? "development" : "production", path.resolve(__dirname, ".."), "");

        // Package env takes precedence over monorepo env
        const mergedEnv = { ...env, ...packageEnv };

        // SSL configuration via environment variables
        const sslKeyPath = mergedEnv.HTTPS_KEY_PATH;
        const sslCertPath = mergedEnv.HTTPS_CERT_PATH;
        const useHttps = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

        const server: Record<string, unknown> = {
            host: mergedEnv.HOST ?? true,
            allowedHosts: true,
        };

        if (mergedEnv.PORT) {
            server.port = parseInt(mergedEnv.PORT);
        }

        if (useHttps) {
            server.https = {
                key: fs.readFileSync(sslKeyPath),
                cert: fs.readFileSync(sslCertPath),
            };
        }

        const merged = mergeConfig(config, {
            server,
        });
        return merged;
    },
};

export default config;
```

Create `compact-mantine/.storybook/preview.tsx`:
```typescript
import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import type { Preview, StoryContext } from "@storybook/react";
import React from "react";

import { compactTheme } from "../src";

function getColorScheme(globals: Record<string, unknown>): "light" | "dark" {
    if (globals.theme === "light") {
        return "light";
    }
    return "dark";
}

const preview: Preview = {
    globalTypes: {
        theme: {
            description: "Color scheme for Mantine components",
            toolbar: {
                title: "Theme",
                icon: "mirror",
                items: [
                    { value: "light", title: "Light", icon: "sun" },
                    { value: "dark", title: "Dark", icon: "moon" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: "dark",
    },
    decorators: [
        (Story, context: StoryContext) => {
            const colorScheme = getColorScheme(context.globals);
            return (
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <Story />
                </MantineProvider>
            );
        },
    ],
    parameters: {
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: { disable: true },
        chromatic: {
            modes: {
                light: { theme: "light" },
                dark: { theme: "dark" },
            },
        },
    },
};

export default preview;
```

**Tests**:
- `npm run storybook` starts on port 9060
- Theme toggle works in toolbar

**Dependencies**: Steps 1.1-1.4

**Verification**: Storybook starts and displays stories

---

### 1.6 Create Nx Integration

**Task**: Add Nx project configuration.

**Implementation**:

Create `compact-mantine/project.json`:
```json
{
    "name": "compact-mantine",
    "$schema": "../node_modules/nx/schemas/project-schema.json",
    "projectType": "library",
    "sourceRoot": "compact-mantine/src",
    "targets": {
        "build": {
            "executor": "@nx/vite:build",
            "outputs": ["{projectRoot}/dist"],
            "options": {
                "configFile": "compact-mantine/vite.config.ts"
            }
        },
        "test": {
            "executor": "@nx/vite:test",
            "options": {
                "configFile": "compact-mantine/vitest.config.ts"
            }
        },
        "lint": {
            "executor": "@nx/eslint:lint"
        },
        "storybook": {
            "executor": "@storybook/core/serve",
            "options": {
                "configDir": "compact-mantine/.storybook"
            }
        },
        "build-storybook": {
            "executor": "@storybook/core/build",
            "options": {
                "configDir": "compact-mantine/.storybook",
                "outputDir": "compact-mantine/storybook-static"
            }
        }
    }
}
```

**Tests**:
- `pnpm exec nx run compact-mantine:build` works
- `pnpm exec nx run compact-mantine:test` works

**Dependencies**: Steps 1.1-1.5

**Verification**: Nx commands execute successfully

---

### 1.7 Create Placeholder Entry Point

**Task**: Create minimal entry point so build succeeds.

**Implementation**:

Create `compact-mantine/src/index.ts`:
```typescript
// Placeholder - will be populated in Phase 2
export const VERSION = "0.1.0";
```

Create `compact-mantine/src/theme/index.ts`:
```typescript
import { createTheme } from "@mantine/core";

export const compactTheme = createTheme({});
```

Update `compact-mantine/src/index.ts`:
```typescript
export { compactTheme } from "./theme";
export const VERSION = "0.1.0";
```

**Tests**:
- Build succeeds
- Package can be imported

**Dependencies**: Steps 1.1-1.6

**Verification**:
- `npm run build` succeeds
- `npm run storybook` loads without errors

---

## Phase 2: Extract Theme (Days 3-4)

### 2.1 Extract Color Palette

**Task**: Copy and organize color definitions.

**Source**: `graphty/src/theme.ts` (lines 24-35)

**Implementation**:

Create `compact-mantine/src/theme/colors.ts`:
```typescript
import type { MantineColorsTuple } from "@mantine/core";

/**
 * Custom dark color palette optimized for dense UIs.
 *
 * Usage:
 * - 0-2: Light tones (text, borders in light mode)
 * - 3-5: Mid tones (secondary elements)
 * - 6-7: Dark tones (input backgrounds in dark mode)
 * - 8-9: Darkest tones (main backgrounds in dark mode)
 */
export const compactDarkColors: MantineColorsTuple = [
    "#d5d7da",  // 0 - lightest (light mode text)
    "#a3a8b1",  // 1
    "#7a828e",  // 2 - dimmed text
    "#5f6873",  // 3
    "#48525c",  // 4
    "#374047",  // 5
    "#2a3035",  // 6 - input background
    "#1f2428",  // 7
    "#161b22",  // 8
    "#0d1117",  // 9 - darkest (main background)
];

/**
 * Color configuration for the compact theme.
 */
export const compactColors = {
    dark: compactDarkColors,
};
```

**Tests**:
```typescript
// tests/theme/colors.test.ts
import { describe, expect, it } from "vitest";
import { compactColors, compactDarkColors } from "../../src/theme/colors";

describe("compactColors", () => {
    it("exports dark color palette with 10 shades", () => {
        expect(compactDarkColors).toHaveLength(10);
    });

    it("has lightest shade at index 0", () => {
        expect(compactDarkColors[0]).toBe("#d5d7da");
    });

    it("has darkest shade at index 9", () => {
        expect(compactDarkColors[9]).toBe("#0d1117");
    });

    it("exports as compactColors.dark", () => {
        expect(compactColors.dark).toBe(compactDarkColors);
    });
});
```

**Dependencies**: Phase 1

**Verification**: Tests pass, colors export correctly

---

### 2.2 Extract Input Component Extensions

**Task**: Create theme extensions for input components.

**Source**: `graphty/src/theme.ts` (TextInput, NumberInput, NativeSelect, Select, Textarea, PasswordInput, Autocomplete, ColorInput)

**Implementation**:

Create `compact-mantine/src/theme/components/inputs.ts`:
```typescript
import {
    Autocomplete,
    ColorInput,
    NativeSelect,
    NumberInput,
    PasswordInput,
    Select,
    Textarea,
    TextInput,
} from "@mantine/core";

/**
 * Shared CSS variables for compact-sized inputs.
 */
const compactInputVars = {
    root: {},
    wrapper: {
        "--input-size": "24px",
        "--input-fz": "11px",
        "--input-bg": "var(--mantine-color-default)",
        "--input-bd": "none",
    },
};

/**
 * Shared styles for compact-sized inputs.
 */
const compactInputStyles = {
    label: {
        fontSize: 11,
        color: "var(--mantine-color-dimmed)",
        marginBottom: 1,
        lineHeight: 1.2,
    },
    input: {
        paddingLeft: 8,
        paddingRight: 8,
        border: "none",
    },
};

/**
 * Theme extensions for input components with "compact" size support.
 */
export const inputComponentExtensions = {
    TextInput: TextInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    NumberInput: NumberInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return { ...compactInputVars, controls: {} };
            }
            return { root: {}, wrapper: {}, controls: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    NativeSelect: NativeSelect.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    Select: Select.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    Textarea: Textarea.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {},
                    wrapper: {
                        "--input-fz": "11px",
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                    },
                };
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    PasswordInput: PasswordInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    innerInput: {
                        paddingLeft: 8,
                        paddingRight: 8,
                    },
                };
            }
            return {};
        },
    }),

    Autocomplete: Autocomplete.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    ColorInput: ColorInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputVars,
                    eyeDropperIcon: {},
                    eyeDropperButton: {},
                    colorPreview: {},
                };
            }
            return { root: {}, wrapper: {}, eyeDropperIcon: {}, eyeDropperButton: {}, colorPreview: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),
};
```

**Tests**:
```typescript
// tests/theme/inputs.test.ts
import { describe, expect, it } from "vitest";
import { inputComponentExtensions } from "../../src/theme/components/inputs";

describe("inputComponentExtensions", () => {
    it("exports TextInput extension", () => {
        expect(inputComponentExtensions.TextInput).toBeDefined();
    });

    it("exports NumberInput extension", () => {
        expect(inputComponentExtensions.NumberInput).toBeDefined();
    });

    it("exports all 8 input components", () => {
        const components = Object.keys(inputComponentExtensions);
        expect(components).toHaveLength(8);
        expect(components).toContain("TextInput");
        expect(components).toContain("NumberInput");
        expect(components).toContain("Select");
        expect(components).toContain("NativeSelect");
        expect(components).toContain("Textarea");
        expect(components).toContain("PasswordInput");
        expect(components).toContain("Autocomplete");
        expect(components).toContain("ColorInput");
    });
});
```

**Dependencies**: Step 2.1

**Verification**: Tests pass, extensions defined correctly

---

### 2.3 Extract Button Component Extensions

**Task**: Create theme extensions for Button and ActionIcon.

**Source**: `graphty/src/theme.ts` (Button, ActionIcon)

**Implementation**:

Create `compact-mantine/src/theme/components/buttons.ts`:
```typescript
import { ActionIcon, Button } from "@mantine/core";

/**
 * Theme extensions for button components with "compact" size support.
 */
export const buttonComponentExtensions = {
    Button: Button.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--button-height": "24px",
                        "--button-fz": "11px",
                        "--button-padding-x": "8px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    ActionIcon: ActionIcon.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--ai-size": "24px",
                    },
                };
            }
            return { root: {} };
        },
    }),
};
```

**Tests**:
```typescript
// tests/theme/buttons.test.ts
import { describe, expect, it } from "vitest";
import { buttonComponentExtensions } from "../../src/theme/components/buttons";

describe("buttonComponentExtensions", () => {
    it("exports Button extension", () => {
        expect(buttonComponentExtensions.Button).toBeDefined();
    });

    it("exports ActionIcon extension", () => {
        expect(buttonComponentExtensions.ActionIcon).toBeDefined();
    });
});
```

**Dependencies**: Step 2.1

**Verification**: Tests pass

---

### 2.4 Extract Control Component Extensions

**Task**: Create theme extensions for Checkbox, Switch, Slider, Radio, SegmentedControl.

**Source**: `graphty/src/theme.ts`

**Implementation**:

Create `compact-mantine/src/theme/components/controls.ts`:
```typescript
import { Checkbox, Radio, SegmentedControl, Slider, Switch } from "@mantine/core";

/**
 * Theme extensions for control components with "compact" size support.
 */
export const controlComponentExtensions = {
    SegmentedControl: SegmentedControl.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--sc-font-size": "10px",
                        "--sc-padding": "4px 8px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Checkbox: Checkbox.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--checkbox-size": "16px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    Switch: Switch.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--switch-height": "16px",
                        "--switch-width": "28px",
                        "--switch-thumb-size": "12px",
                        "--switch-track-label-padding": "2px",
                        "--switch-label-font-size": "5px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    Slider: Slider.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--slider-size": "4px",
                        "--slider-thumb-size": "12px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Radio: Radio.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--radio-size": "16px",
                        "--radio-icon-size": "6px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),
};
```

**Tests**: Similar pattern to buttons.test.ts

**Dependencies**: Step 2.1

**Verification**: Tests pass

---

### 2.5 Extract Display Component Extensions

**Task**: Create theme extensions for Badge and Pill.

**Source**: `graphty/src/theme.ts`

**Implementation**:

Create `compact-mantine/src/theme/components/display.ts`:
```typescript
import { Badge, Pill } from "@mantine/core";

/**
 * Theme extensions for display components with "compact" size support.
 */
export const displayComponentExtensions = {
    Badge: Badge.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--badge-height": "14px",
                        "--badge-fz": "9px",
                        "--badge-padding-x": "4px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Pill: Pill.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--pill-height": "16px",
                        "--pill-fz": "10px",
                    },
                };
            }
            return { root: {} };
        },
    }),
};
```

**Tests**: Similar pattern

**Dependencies**: Step 2.1

**Verification**: Tests pass

---

### 2.6 Assemble Complete Theme

**Task**: Create the main theme file combining all extensions.

**Implementation**:

Create `compact-mantine/src/theme/components/index.ts`:
```typescript
export { buttonComponentExtensions } from "./buttons";
export { controlComponentExtensions } from "./controls";
export { displayComponentExtensions } from "./display";
export { inputComponentExtensions } from "./inputs";
```

Update `compact-mantine/src/theme/index.ts`:
```typescript
import { createTheme } from "@mantine/core";

import { compactColors } from "./colors";
import {
    buttonComponentExtensions,
    controlComponentExtensions,
    displayComponentExtensions,
    inputComponentExtensions,
} from "./components";

/**
 * Mantine theme with "compact" size support for dense UIs.
 *
 * Compact size specifications:
 * - Input height: 24px
 * - Font size: 11px
 * - No borders
 * - Semantic color backgrounds
 *
 * @example
 * ```tsx
 * import { MantineProvider, TextInput } from '@mantine/core';
 * import { compactTheme } from '@graphty/compact-mantine';
 *
 * function App() {
 *     return (
 *         <MantineProvider theme={compactTheme}>
 *             <TextInput size="compact" label="Name" />
 *         </MantineProvider>
 *     );
 * }
 * ```
 */
export const compactTheme = createTheme({
    colors: compactColors,
    components: {
        ...inputComponentExtensions,
        ...buttonComponentExtensions,
        ...controlComponentExtensions,
        ...displayComponentExtensions,
    },
});

export { compactColors, compactDarkColors } from "./colors";
```

**Tests**:
```typescript
// tests/theme/theme.test.ts
import { describe, expect, it } from "vitest";
import { compactTheme } from "../../src/theme";

describe("compactTheme", () => {
    it("exports a valid Mantine theme object", () => {
        expect(compactTheme).toBeDefined();
        expect(compactTheme.colors).toBeDefined();
        expect(compactTheme.components).toBeDefined();
    });

    it("includes dark color palette", () => {
        expect(compactTheme.colors?.dark).toBeDefined();
        expect(compactTheme.colors?.dark).toHaveLength(10);
    });

    it("includes all 19 component extensions", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toHaveLength(19);
    });

    it("does not use hardcoded dark-N color references", () => {
        const themeStr = JSON.stringify(compactTheme);
        expect(themeStr).not.toMatch(/--mantine-color-dark-[0-9]/);
    });

    it("uses semantic color variables", () => {
        const themeStr = JSON.stringify(compactTheme);
        expect(themeStr).toContain("--mantine-color-default");
        expect(themeStr).toContain("--mantine-color-dimmed");
    });
});
```

**Dependencies**: Steps 2.1-2.5

**Verification**: All theme tests pass

---

### 2.7 Update Main Exports

**Task**: Update barrel exports.

**Implementation**:

Update `compact-mantine/src/index.ts`:
```typescript
// Theme exports
export { compactColors, compactDarkColors, compactTheme } from "./theme";

// Version
export const VERSION = "0.1.0";
```

**Tests**:
- Import works in consumer code
- TypeScript types resolve

**Dependencies**: Step 2.6

**Verification**: Build succeeds, exports work

---

### 2.8 Create CSS Regression Tests

**Task**: Add tests verifying computed CSS values match spec.

**Source**: `graphty/src/components/sidebar/__tests__/CompactStyleRegression.test.tsx`

**IMPORTANT NOTE**: JSDOM does not fully process CSS variables and stylesheets. The graphty CSS regression tests work because they use Playwright browser testing (see `graphty/vitest.config.ts` with `browser.enabled: true`).

For compact-mantine Phase 2, create **integration tests** that verify:
1. Components render without error with compact size
2. Theme is properly applied via MantineProvider
3. DOM structure is correct

**Full CSS regression testing** (verifying computed values like `24px`, `11px`, `0px` border) should be done via:
- **Storybook visual tests** (Chromatic) - see Phase 4.3
- **Browser-based Playwright tests** - can be added later if needed

**Implementation**:

Create `compact-mantine/tests/theme/compact-css-regression.test.tsx`:
```typescript
import { MantineProvider, NumberInput, TextInput } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for compact size styling.
 *
 * Note: JSDOM does not fully process CSS variables and stylesheets,
 * so these tests verify:
 * - Components render without error
 * - Theme is applied correctly via MantineProvider
 * - DOM structure is as expected
 *
 * Full CSS regression testing (verifying computed values like 24px, 11px)
 * should be done in a browser environment via:
 * - Storybook visual tests (Chromatic)
 * - Playwright browser tests
 */
describe("Compact CSS Regression", () => {
    describe("TextInput with compact size", () => {
        it("renders without error", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with label", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" label="Test Label" />
                </MantineProvider>,
            );
            expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
        });

        it("has semantic background color applied (not transparent)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            const bg = getComputedStyle(input).backgroundColor;
            // JSDOM does resolve some styles - verify it's not completely transparent
            expect(bg).not.toBe("rgba(0, 0, 0, 0)");
            expect(bg).not.toBe("transparent");
            expect(bg).toMatch(/^rgb/);
        });
    });

    describe("NumberInput with compact size", () => {
        it("renders without error", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });
    });

    describe("Theme applies to components", () => {
        it("renders with dark color scheme", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme="dark">
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders with light color scheme", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme="light">
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });
    });
});
```

**Tests**: Integration tests pass

**Dependencies**: Steps 2.6-2.7

**Verification**: Components render correctly with theme applied

**Future Enhancement**: To add full CSS value verification, configure browser-based testing:
```typescript
// vitest.config.ts - add browser project
test: {
    browser: {
        enabled: true,
        headless: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
    },
}
```

---

## Phase 3: Extract Components (Days 5-7)

### 3.1 Extract Utility Functions

**Task**: Copy utility functions needed by components.

**Source**: `graphty/src/utils/color-utils.ts`, `graphty/src/constants/`

**Implementation**:

Create `compact-mantine/src/utils/color-utils.ts`:
```typescript
/**
 * Parse HEXA color string (#RRGGBBAA) and extract RGB and opacity.
 */
export function parseHexaColor(hexa: string): { hex: string; opacity: number } {
    // Normalize to 8-character HEXA
    let normalized = hexa.replace("#", "");

    if (normalized.length === 3) {
        normalized = normalized.split("").map((c) => c + c).join("") + "ff";
    } else if (normalized.length === 4) {
        normalized = normalized.split("").map((c) => c + c).join("");
    } else if (normalized.length === 6) {
        normalized = normalized + "ff";
    }

    const hex = "#" + normalized.slice(0, 6);
    const alphaHex = normalized.slice(6, 8);
    const opacity = Math.round((parseInt(alphaHex, 16) / 255) * 100);

    return { hex, opacity };
}

/**
 * Convert RGB hex and opacity to HEXA format.
 */
export function toHexaColor(hex: string, opacity: number): string {
    const normalized = hex.replace("#", "");
    const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${normalized}${alpha}`;
}

/**
 * Check if a color string is valid hex format.
 */
export function isValidHex(color: string): boolean {
    return /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
}
```

Create `compact-mantine/src/utils/index.ts`:
```typescript
export { isValidHex, parseHexaColor, toHexaColor } from "./color-utils";
```

Create `compact-mantine/src/constants/colors.ts`:
```typescript
/**
 * Default color swatches for color pickers.
 */
export const SWATCH_COLORS = [
    "#5B8FF9", // Blue
    "#61DDAA", // Green
    "#F6BD16", // Yellow
    "#E86452", // Red
    "#6DC8EC", // Cyan
    "#945FB9", // Purple
    "#FF9845", // Orange
    "#1E9493", // Teal
    "#FF99C3", // Pink
    "#ffffff", // White
    "#aaaaaa", // Gray
    "#000000", // Black
];

/**
 * HEXA versions of swatch colors (with full opacity).
 */
export const SWATCH_COLORS_HEXA = SWATCH_COLORS.map((c) => c + "ff");
```

Create `compact-mantine/src/constants/spacing.ts`:
```typescript
import { rem } from "@mantine/core";

/**
 * Mantine spacing values for consistent component spacing.
 */
export const MANTINE_SPACING = {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
};
```

Create `compact-mantine/src/constants/index.ts`:
```typescript
export { SWATCH_COLORS, SWATCH_COLORS_HEXA } from "./colors";
export { MANTINE_SPACING } from "./spacing";
```

**Tests**:
```typescript
// tests/utils/color-utils.test.ts
import { describe, expect, it } from "vitest";
import { isValidHex, parseHexaColor, toHexaColor } from "../../src/utils/color-utils";

describe("parseHexaColor", () => {
    it("parses 6-digit hex with full opacity", () => {
        const result = parseHexaColor("#ff0000");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(100);
    });

    it("parses 8-digit hexa", () => {
        const result = parseHexaColor("#ff000080");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(50);
    });
});

describe("toHexaColor", () => {
    it("converts hex and opacity to hexa", () => {
        expect(toHexaColor("#ff0000", 100)).toBe("#ff0000ff");
        expect(toHexaColor("#ff0000", 50)).toBe("#ff000080");
    });
});

describe("isValidHex", () => {
    it("validates hex colors", () => {
        expect(isValidHex("#fff")).toBe(true);
        expect(isValidHex("#ffffff")).toBe(true);
        expect(isValidHex("#ffffffaa")).toBe(true);
        expect(isValidHex("invalid")).toBe(false);
    });
});
```

**Dependencies**: Phase 2

**Verification**: Utility tests pass

---

### 3.2 Create Type Definitions

**Task**: Define TypeScript types for components.

**Implementation**:

Create `compact-mantine/src/types/index.ts`:
```typescript
import type { ReactNode } from "react";

/**
 * Props for the ControlSection component.
 */
export interface ControlSectionProps {
    /** Section label displayed in header */
    label: string;
    /** Whether section is expanded by default */
    defaultOpen?: boolean;
    /** Visual indicator that child values differ from defaults */
    hasConfiguredValues?: boolean;
    /** Section content */
    children: ReactNode;
}

/**
 * Props for the ControlSubGroup component.
 */
export interface ControlSubGroupProps {
    /** Group label */
    label: string;
    /** Whether group is expanded by default */
    defaultOpen?: boolean;
    /** Group content */
    children: ReactNode;
}

/**
 * Props for the ControlGroup component.
 */
export interface ControlGroupProps {
    /** Group content */
    children: ReactNode;
}

/**
 * Props for compact color input with opacity support.
 */
export interface CompactColorInputProps {
    /** Color in hex format (#RRGGBB) */
    color: string;
    /** Opacity percentage (0-100) */
    opacity: number;
    /** Called when color changes */
    onColorChange: (color: string) => void;
    /** Called when opacity changes */
    onOpacityChange: (opacity: number) => void;
    /** Label text */
    label?: string;
    /** Custom color swatches */
    swatches?: string[];
}

/**
 * Props for style inputs with default/explicit value distinction.
 */
export interface StyleInputBaseProps<T> {
    /** Label text */
    label: string;
    /** Current value - undefined means using default */
    value: T | undefined;
    /** Default value shown when value is undefined */
    defaultValue: T;
    /** Called when value changes */
    onChange: (value: T | undefined) => void;
}

export type StyleNumberInputProps = StyleInputBaseProps<number> & {
    /** Minimum allowed value */
    min?: number;
    /** Maximum allowed value */
    max?: number;
    /** Step increment */
    step?: number;
    /** Value suffix (e.g., "px", "%") */
    suffix?: string;
};

export type StyleColorInputProps = StyleInputBaseProps<string>;

export type StyleSelectProps = StyleInputBaseProps<string> & {
    /** Dropdown options */
    data: Array<{ value: string; label: string } | string>;
};

/**
 * Props for EffectToggle component.
 */
export interface EffectToggleProps {
    /** Checkbox label */
    label: string;
    /** Whether effect is enabled */
    checked: boolean;
    /** Called when checked state changes */
    onChange: (checked: boolean) => void;
    /** Content shown when checked */
    children?: ReactNode;
}

/**
 * Gradient color stop.
 */
export interface ColorStop {
    /** Stop color in hex format */
    color: string;
    /** Stop position (0-1) */
    offset: number;
}

/**
 * Props for GradientEditor component.
 */
export interface GradientEditorProps {
    /** Gradient color stops */
    stops: ColorStop[];
    /** Called when stops change */
    onChange: (stops: ColorStop[]) => void;
    /** Minimum number of stops */
    minStops?: number;
    /** Maximum number of stops */
    maxStops?: number;
}

/**
 * Props for StatRow component.
 */
export interface StatRowProps {
    /** Label text */
    label: string;
    /** Value to display */
    value: string | number;
}
```

**Tests**: Types compile without errors

**Dependencies**: Phase 2

**Verification**: TypeScript builds successfully

---

### 3.3 Extract ControlSection Component

**Task**: Extract the collapsible section component.

**Source**: `graphty/src/components/sidebar/controls/ControlSection.tsx`

**Implementation**:

Create `compact-mantine/src/components/ControlSection.tsx`:
```typescript
import { Box, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ControlSectionProps } from "../types";

/**
 * Collapsible section for organizing control groups.
 *
 * @example
 * ```tsx
 * <ControlSection label="Appearance" defaultOpen>
 *     <StyleColorInput ... />
 *     <StyleNumberInput ... />
 * </ControlSection>
 * ```
 */
export function ControlSection({
    label,
    defaultOpen = true,
    hasConfiguredValues = false,
    children,
}: ControlSectionProps) {
    const [opened, { toggle }] = useDisclosure(defaultOpen);

    return (
        <Box>
            <UnstyledButton
                onClick={toggle}
                style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--mantine-color-default-hover)",
                }}
            >
                <Group gap="xs">
                    {opened ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Text
                        size="xs"
                        fw={600}
                        style={{
                            color: hasConfiguredValues
                                ? "var(--mantine-color-blue-filled)"
                                : "var(--mantine-color-text)",
                        }}
                    >
                        {label}
                    </Text>
                </Group>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box p="xs">{children}</Box>
            </Collapse>
        </Box>
    );
}
```

**Tests**:
```typescript
// tests/components/ControlSection.test.tsx
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSection } from "../../src";

describe("ControlSection", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test Section">
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("shows content when defaultOpen is true", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test" defaultOpen>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByText("Content")).toBeVisible();
    });

    it("hides content when defaultOpen is false", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test" defaultOpen={false}>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByText("Content")).not.toBeVisible();
    });

    it("toggles on click", async () => {
        const user = userEvent.setup();
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test" defaultOpen>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );

        expect(screen.getByText("Content")).toBeVisible();
        await user.click(screen.getByText("Test"));
        expect(screen.getByText("Content")).not.toBeVisible();
    });
});
```

**Dependencies**: Steps 3.1-3.2

**Verification**: Component renders and tests pass

---

### 3.4 Extract StyleNumberInput Component

**Task**: Extract number input with default/explicit value styling.

**Source**: `graphty/src/components/sidebar/controls/StyleNumberInput.tsx`

**Implementation**:

Create `compact-mantine/src/components/StyleNumberInput.tsx`:
```typescript
import { ActionIcon, Group, NumberInput } from "@mantine/core";
import { RotateCcw } from "lucide-react";

import type { StyleNumberInputProps } from "../types";

/**
 * Number input that visually distinguishes default vs explicit values.
 *
 * - Default value: Shows in italic with dimmed color
 * - Explicit value: Shows normally with reset button
 *
 * @example
 * ```tsx
 * const [size, setSize] = useState<number | undefined>(undefined);
 *
 * <StyleNumberInput
 *     label="Size"
 *     value={size}
 *     defaultValue={1.0}
 *     onChange={setSize}
 *     min={0.1}
 *     max={10}
 *     step={0.1}
 * />
 * ```
 */
export function StyleNumberInput({
    label,
    value,
    defaultValue,
    onChange,
    min,
    max,
    step,
    suffix,
}: StyleNumberInputProps) {
    const isDefault = value === undefined;
    const displayValue = isDefault ? defaultValue : value;

    return (
        <Group gap="xs" wrap="nowrap">
            <NumberInput
                size="compact"
                label={label}
                value={displayValue}
                onChange={(val) => {
                    const numVal = typeof val === "string" ? parseFloat(val) : val;
                    onChange(numVal === defaultValue ? undefined : numVal);
                }}
                min={min}
                max={max}
                step={step}
                suffix={suffix}
                style={{ flex: 1 }}
                styles={{
                    input: {
                        fontStyle: isDefault ? "italic" : "normal",
                        color: isDefault ? "var(--mantine-color-dimmed)" : undefined,
                    },
                }}
            />
            {!isDefault && (
                <ActionIcon
                    size="compact"
                    variant="subtle"
                    onClick={() => onChange(undefined)}
                    aria-label="Reset to default"
                >
                    <RotateCcw size={12} />
                </ActionIcon>
            )}
        </Group>
    );
}
```

**Tests**:
```typescript
// tests/components/StyleNumberInput.test.tsx
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, StyleNumberInput } from "../../src";

describe("StyleNumberInput", () => {
    it("shows default value when value is undefined", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput
                    label="Size"
                    value={undefined}
                    defaultValue={10}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("10");
    });

    it("shows italic styling for default value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput
                    label="Size"
                    value={undefined}
                    defaultValue={10}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox");
        expect(getComputedStyle(input).fontStyle).toBe("italic");
    });

    it("hides reset button when using default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput
                    label="Size"
                    value={undefined}
                    defaultValue={10}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("shows reset button when explicit value set", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput
                    label="Size"
                    value={20}
                    defaultValue={10}
                    onChange={vi.fn()}
                />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("calls onChange with undefined when reset clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput
                    label="Size"
                    value={20}
                    defaultValue={10}
                    onChange={onChange}
                />
            </MantineProvider>,
        );

        await user.click(screen.getByRole("button", { name: /reset/i }));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });
});
```

**Dependencies**: Steps 3.1-3.2

**Verification**: Component renders and tests pass

---

### 3.5 Extract Remaining Components

**Task**: Extract remaining components following same pattern.

**Components to extract**:
- `ControlSubGroup` - Nested collapsible group
- `ControlGroup` - Non-collapsible container
- `StyleColorInput` - Color input with default/explicit styling
- `StyleSelect` - Select with default/explicit styling
- `CompactColorInput` - Color picker with opacity
- `EffectToggle` - Checkbox with collapsible children
- `GradientEditor` - Multi-stop gradient editor
- `StatRow` - Label/value pair display

**Implementation pattern**: Same as Steps 3.3-3.4

**Dependencies**: Steps 3.1-3.4

**Verification**: All component tests pass

---

### 3.6 Create Hook: useActualColorScheme

**Task**: Extract hook for detecting actual light/dark mode.

**Source**: `graphty/src/hooks/useActualColorScheme.ts`

**Implementation**:

Create `compact-mantine/src/hooks/useActualColorScheme.ts`:
```typescript
import { useComputedColorScheme } from "@mantine/core";

/**
 * Hook to get the actual resolved color scheme.
 *
 * Resolves "auto" to the actual light/dark value based on system preference.
 *
 * @returns "light" | "dark"
 */
export function useActualColorScheme(): "light" | "dark" {
    return useComputedColorScheme("dark");
}
```

Create `compact-mantine/src/hooks/index.ts`:
```typescript
export { useActualColorScheme } from "./useActualColorScheme";
```

**Tests**:
```typescript
// tests/hooks/useActualColorScheme.test.tsx
import { MantineProvider } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme, useActualColorScheme } from "../../src";

describe("useActualColorScheme", () => {
    it("returns dark when forceColorScheme is dark", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <MantineProvider theme={compactTheme} forceColorScheme="dark">
                {children}
            </MantineProvider>
        );

        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("dark");
    });

    it("returns light when forceColorScheme is light", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <MantineProvider theme={compactTheme} forceColorScheme="light">
                {children}
            </MantineProvider>
        );

        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("light");
    });
});
```

**Dependencies**: Steps 3.1-3.2

**Verification**: Hook tests pass

---

### 3.7 Update Main Exports

**Task**: Add all component exports to index.ts.

**Implementation**:

Update `compact-mantine/src/index.ts`:
```typescript
// Theme exports
export { compactColors, compactDarkColors, compactTheme } from "./theme";

// Component exports
export { CompactColorInput } from "./components/CompactColorInput";
export { ControlGroup } from "./components/ControlGroup";
export { ControlSection } from "./components/ControlSection";
export { ControlSubGroup } from "./components/ControlSubGroup";
export { EffectToggle } from "./components/EffectToggle";
export { GradientEditor } from "./components/GradientEditor";
export { StatRow } from "./components/StatRow";
export { StyleColorInput } from "./components/StyleColorInput";
export { StyleNumberInput } from "./components/StyleNumberInput";
export { StyleSelect } from "./components/StyleSelect";

// Hook exports
export { useActualColorScheme } from "./hooks";

// Constant exports
export { MANTINE_SPACING, SWATCH_COLORS, SWATCH_COLORS_HEXA } from "./constants";

// Utility exports
export { isValidHex, parseHexaColor, toHexaColor } from "./utils";

// Type exports
export type {
    ColorStop,
    CompactColorInputProps,
    ControlGroupProps,
    ControlSectionProps,
    ControlSubGroupProps,
    EffectToggleProps,
    GradientEditorProps,
    StatRowProps,
    StyleColorInputProps,
    StyleNumberInputProps,
    StyleSelectProps,
} from "./types";

// Version
export const VERSION = "0.1.0";
```

Create `compact-mantine/src/components/index.ts`:
```typescript
export { CompactColorInput } from "./CompactColorInput";
export { ControlGroup } from "./ControlGroup";
export { ControlSection } from "./ControlSection";
export { ControlSubGroup } from "./ControlSubGroup";
export { EffectToggle } from "./EffectToggle";
export { GradientEditor } from "./GradientEditor";
export { StatRow } from "./StatRow";
export { StyleColorInput } from "./StyleColorInput";
export { StyleNumberInput } from "./StyleNumberInput";
export { StyleSelect } from "./StyleSelect";
```

**Dependencies**: Steps 3.3-3.6

**Verification**: All exports resolve, build succeeds

---

## Phase 4: Testing (Days 8-9)

### 4.1 Add Light/Dark Mode Tests

**Task**: Test all components in both color schemes.

**Implementation**:

Create `compact-mantine/tests/theme/light-dark-mode.test.tsx`:
```typescript
import { MantineProvider, TextInput } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSection, StyleNumberInput } from "../../src";

describe("Light/Dark mode compatibility", () => {
    describe.each(["light", "dark"] as const)("%s mode", (colorScheme) => {
        it("TextInput renders without error", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("ControlSection renders without error", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <ControlSection label="Test">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            expect(screen.getByText("Test")).toBeInTheDocument();
        });

        it("StyleNumberInput renders without error", () => {
            render(
                <MantineProvider theme={compactTheme} forceColorScheme={colorScheme}>
                    <StyleNumberInput
                        label="Size"
                        value={undefined}
                        defaultValue={10}
                        onChange={() => {}}
                    />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });
    });
});
```

**Dependencies**: Phases 2-3

**Verification**: Tests pass for both light and dark modes

---

### 4.2 Add Interaction Tests

**Task**: Test component interactions.

**Implementation**: Tests using `userEvent` for clicking, typing, etc. (examples in Phase 3 steps)

**Dependencies**: Phases 2-3

**Verification**: Interaction tests pass

---

### 4.3 Set Up Chromatic

**Task**: Configure Chromatic for visual regression testing.

**Implementation**:

Install Chromatic:
```bash
cd compact-mantine && pnpm add -D chromatic
```

Add script to `package.json`:
```json
{
    "scripts": {
        "chromatic": "chromatic --project-token ${CHROMATIC_PROJECT_TOKEN}"
    }
}
```

Create `.github/workflows/chromatic-compact-mantine.yml`:
```yaml
name: Chromatic (compact-mantine)

on:
    push:
        branches: [master]
        paths:
            - 'compact-mantine/**'
    pull_request:
        branches: [master]
        paths:
            - 'compact-mantine/**'

jobs:
    chromatic:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0

            - uses: pnpm/action-setup@v4

            - uses: actions/setup-node@v4
              with:
                  node-version: '20'
                  cache: 'pnpm'

            - run: pnpm install

            - name: Build Storybook
              run: pnpm --filter @graphty/compact-mantine build-storybook

            - name: Run Chromatic
              uses: chromaui/action@latest
              with:
                  workingDir: compact-mantine
                  projectToken: ${{ secrets.CHROMATIC_COMPACT_MANTINE_TOKEN }}
                  storybookBuildDir: storybook-static
```

**Dependencies**: Phases 2-3

**Verification**: Chromatic runs and captures snapshots

---

### 4.4 Verify Coverage Thresholds

**Task**: Ensure all coverage thresholds are met.

**Implementation**:

Run coverage:
```bash
cd compact-mantine && npm run coverage
```

Verify thresholds:
- Lines: ≥80%
- Functions: ≥80%
- Statements: ≥80%
- Branches: ≥75%

**Dependencies**: All tests from Phases 2-3

**Verification**: Coverage report shows all thresholds met

---

### 4.5 Add Browser-Based CSS Regression Tests

**Task**: Add Playwright browser tests to verify computed CSS values match design spec.

**Background**: JSDOM does not fully process CSS variables and stylesheets, so computed style assertions (like `height: 24px`, `fontSize: 11px`) fail in JSDOM. Browser-based tests are required for accurate CSS value verification.

**Implementation**:

1. Update `compact-mantine/vitest.config.ts` to add a browser test project:
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
        // Exclude browser tests from default run
        exclude: ["tests/**/*.browser.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["**/*.stories.tsx", "**/*.stories.ts", "**/*.test.ts", "**/*.test.tsx"],
            thresholds: {
                lines: 80,
                functions: 80,
                statements: 80,
                branches: 75,
            },
        },
        // Browser test project
        projects: [
            {
                extends: true,
                test: {
                    name: "browser",
                    include: ["tests/**/*.browser.test.{ts,tsx}"],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                    },
                },
            },
        ],
    },
});
```

2. Create `compact-mantine/tests/theme/compact-css-values.browser.test.tsx`:
```typescript
import { MantineProvider, NumberInput, TextInput } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Browser-based CSS regression tests for compact size styling.
 * These tests run in a real browser via Playwright to verify computed CSS values.
 *
 * Design specifications:
 * - height: 24px
 * - fontSize: 11px
 * - backgroundColor: semantic color (not transparent)
 * - border: none (0px)
 */
describe("Compact CSS Values (Browser)", () => {
    describe("TextInput compact styles", () => {
        it("has correct compact height (24px)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            expect(getComputedStyle(input).height).toBe("24px");
        });

        it("has correct compact font size (11px)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            expect(getComputedStyle(input).fontSize).toBe("11px");
        });

        it("has no border (0px)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            expect(getComputedStyle(input).borderWidth).toBe("0px");
        });

        it("has semantic background color applied", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            const bg = getComputedStyle(input).backgroundColor;
            expect(bg).not.toBe("rgba(0, 0, 0, 0)");
            expect(bg).not.toBe("transparent");
            expect(bg).toMatch(/^rgb/);
        });
    });

    describe("NumberInput compact styles", () => {
        it("has correct compact height (24px)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            expect(getComputedStyle(input).height).toBe("24px");
        });

        it("has correct compact font size (11px)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <NumberInput size="compact" aria-label="test" />
                </MantineProvider>,
            );
            const input = screen.getByRole("textbox");
            expect(getComputedStyle(input).fontSize).toBe("11px");
        });
    });

    describe("All inputs consistent", () => {
        it("TextInput and NumberInput have same compact height", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <TextInput size="compact" aria-label="text" />
                    <NumberInput size="compact" aria-label="number" />
                </MantineProvider>,
            );
            const textInput = screen.getByRole("textbox", { name: "text" });
            const numberInput = screen.getByRole("textbox", { name: "number" });

            const textHeight = getComputedStyle(textInput).height;
            const numberHeight = getComputedStyle(numberInput).height;

            expect(textHeight).toBe(numberHeight);
            expect(textHeight).toBe("24px");
        });
    });
});
```

3. Add npm script for browser tests in `package.json`:
```json
{
    "scripts": {
        "test:browser": "vitest run --project=browser"
    }
}
```

**Tests**:
- `npm run test:browser` passes all CSS value assertions
- Computed styles match design spec (24px height, 11px font, 0px border)

**Dependencies**: Steps 4.1-4.4, Playwright installed

**Verification**: Browser tests pass with correct computed CSS values

---

## Phase 5: Documentation (Day 10)

### 5.1 Create README.md

**Task**: Write comprehensive documentation.

**Implementation**:

Create `compact-mantine/README.md`:
```markdown
# @graphty/compact-mantine

Compact size variants for Mantine UI components, optimized for dense UIs like sidebars, property panels, and tool palettes.

## Installation

```bash
npm install @graphty/compact-mantine @mantine/core @mantine/hooks
```

## Quick Start

```tsx
import { MantineProvider, TextInput, Button } from '@mantine/core';
import '@mantine/core/styles.css';
import { compactTheme } from '@graphty/compact-mantine';

function App() {
    return (
        <MantineProvider theme={compactTheme} defaultColorScheme="dark">
            <TextInput size="compact" label="Name" />
            <Button size="compact">Save</Button>
        </MantineProvider>
    );
}
```

## Compact Size Specifications

| Property | Value |
|----------|-------|
| Height | 24px |
| Font Size | 11px |
| Padding | 8px horizontal |
| Border | None |
| Background | Semantic (adapts to light/dark) |

## Supported Components

### Mantine Components with Compact Size

- **Inputs**: TextInput, NumberInput, Select, NativeSelect, Textarea, PasswordInput, Autocomplete, ColorInput
- **Buttons**: Button, ActionIcon
- **Controls**: Checkbox, Switch, Slider, Radio, SegmentedControl
- **Display**: Badge, Pill

### Custom Components

- **ControlSection** - Collapsible section with header
- **ControlSubGroup** - Nested collapsible group
- **StyleNumberInput** - Number input with default/explicit value styling
- **StyleColorInput** - Color input with default/explicit value styling
- **StyleSelect** - Select with default/explicit value styling
- **CompactColorInput** - Color picker with opacity support
- **EffectToggle** - Checkbox with collapsible children
- **GradientEditor** - Multi-stop gradient editor
- **StatRow** - Read-only label/value pair

## Theme Customization

### Merging with Custom Theme

```tsx
import { createTheme, mergeThemeOverrides, MantineProvider } from '@mantine/core';
import { compactTheme } from '@graphty/compact-mantine';

const brandTheme = createTheme({
    primaryColor: 'brand',
    colors: {
        brand: ['#e6f7ff', ...],
    },
});

const mergedTheme = mergeThemeOverrides(compactTheme, brandTheme);

function App() {
    return (
        <MantineProvider theme={mergedTheme}>
            {/* Your app */}
        </MantineProvider>
    );
}
```

### Color Scheme Control

The theme works with both light and dark modes:

```tsx
// Dark mode (default)
<MantineProvider theme={compactTheme} defaultColorScheme="dark">

// Light mode
<MantineProvider theme={compactTheme} defaultColorScheme="light">

// System preference
<MantineProvider theme={compactTheme} defaultColorScheme="auto">
```

## API Reference

See [Storybook documentation](https://graphty-org.github.io/graphty-monorepo/storybook/compact-mantine) for interactive examples and API reference.

## License

MIT
```

**Dependencies**: Phases 2-4

**Verification**: README renders correctly on GitHub

---

### 5.2 Add JSDoc Comments

**Task**: Add documentation comments to all exports.

**Implementation**: JSDoc comments already included in code examples above.

**Dependencies**: Phases 2-3

**Verification**: TypeScript intellisense shows documentation

---

### 5.3 Create Storybook Documentation

**Task**: Create comprehensive Storybook stories.

**Implementation**:

Create stories for each component category:
- `stories/Theme.stories.tsx` - Theme overview and comparison
- `stories/CompactInputs.stories.tsx` - Input components
- `stories/CompactButtons.stories.tsx` - Button components
- `stories/CompactControls.stories.tsx` - Control components
- `stories/CustomComponents.stories.tsx` - Custom components

Example `stories/CompactInputs.stories.tsx`:
```typescript
import { NumberInput, Stack, TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
    title: "Compact/Inputs",
};

export default meta;

export const TextInputStates: StoryObj = {
    render: () => (
        <Stack gap="md">
            <TextInput size="compact" label="Empty" />
            <TextInput size="compact" label="Filled" value="Some value" />
            <TextInput size="compact" label="Disabled" disabled value="Disabled" />
            <TextInput size="compact" label="Error" error="This field is required" />
        </Stack>
    ),
};

export const NumberInputStates: StoryObj = {
    render: () => (
        <Stack gap="md">
            <NumberInput size="compact" label="Default" />
            <NumberInput size="compact" label="With value" value={42} />
            <NumberInput size="compact" label="With suffix" value={100} suffix="%" />
        </Stack>
    ),
};

export const CompactVsRegular: StoryObj = {
    render: () => (
        <Stack gap="xl">
            <Stack gap="xs">
                <TextInput size="compact" label="Compact TextInput" />
                <NumberInput size="compact" label="Compact NumberInput" />
            </Stack>
            <Stack gap="xs">
                <TextInput size="sm" label="Small TextInput (standard)" />
                <NumberInput size="sm" label="Small NumberInput (standard)" />
            </Stack>
        </Stack>
    ),
};
```

**Dependencies**: Phases 2-3

**Verification**: Stories render correctly in Storybook

---

## Phase 6: Migrate graphty (Day 11)

### 6.1 Add Dependency

**Task**: Add compact-mantine as dependency to graphty.

**Implementation**:

Update `graphty/package.json`:
```json
{
    "dependencies": {
        "@graphty/compact-mantine": "workspace:*",
        ...
    }
}
```

Run:
```bash
pnpm install
```

**Dependencies**: Phases 1-5

**Verification**: Package installs correctly

---

### 6.2 Update Imports

**Task**: Replace local theme/component imports with package imports.

**Implementation**:

Update `graphty/src/App.tsx` and other files:

```typescript
// BEFORE
import { theme } from "./theme";
import { ControlSection } from "./components/sidebar/controls/ControlSection";

// AFTER
import { compactTheme, ControlSection } from "@graphty/compact-mantine";
```

**Dependencies**: Step 6.1

**Verification**: TypeScript compiles without errors

---

### 6.3 Remove Duplicated Code

**Task**: Delete extracted code from graphty.

**Files to remove/modify**:
- `graphty/src/theme.ts` - Remove, import from package
- `graphty/src/components/sidebar/controls/` - Remove extracted components
- Update any remaining imports

**Dependencies**: Step 6.2

**Verification**: Build and tests pass after removal

---

### 6.4 Verify All Tests Pass

**Task**: Run full test suite.

**Implementation**:

```bash
pnpm run test
pnpm run lint
pnpm run build
```

**Dependencies**: Steps 6.1-6.3

**Verification**: All tests, lint, and build pass

---

## Phase 7: CSS Module Refactor (Days 12-13)

### 7.1 Identify Static Styles

**Task**: Analyze components for static vs dynamic styles.

**Components with static styles to migrate**:
- `ControlSection` - header background, padding, cursor
- `ControlSubGroup` - indentation, borders
- `ControlGroup` - spacing
- `CompactColorInput` - swatch size, popover styles
- `GradientEditor` - stop markers, track styles

**Keep inline for dynamic styles**:
- `StyleNumberInput` - italic/dimmed for default values
- `StyleColorInput` - italic/dimmed for default values
- `StyleSelect` - italic/dimmed for default values

**Dependencies**: Phases 1-6

**Verification**: Analysis document created

---

### 7.2 Create CSS Modules

**Task**: Create CSS module files for each component.

**Implementation**:

Create `compact-mantine/src/components/ControlSection.module.css`:
```css
.header {
    width: 100%;
    padding: 8px 12px;
    background-color: var(--mantine-color-default-hover);
    cursor: pointer;
    border: none;
}

.header:hover {
    background-color: var(--mantine-color-default-hover);
}

.content {
    padding: var(--mantine-spacing-xs);
}
```

Update `compact-mantine/src/components/ControlSection.tsx`:
```typescript
import { Box, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ControlSectionProps } from "../types";

import classes from "./ControlSection.module.css";

export function ControlSection({
    label,
    defaultOpen = true,
    hasConfiguredValues = false,
    children,
}: ControlSectionProps) {
    const [opened, { toggle }] = useDisclosure(defaultOpen);

    return (
        <Box>
            <UnstyledButton onClick={toggle} className={classes.header}>
                <Group gap="xs">
                    {opened ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Text
                        size="xs"
                        fw={600}
                        c={hasConfiguredValues ? "blue" : undefined}
                    >
                        {label}
                    </Text>
                </Group>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box className={classes.content}>{children}</Box>
            </Collapse>
        </Box>
    );
}
```

**Dependencies**: Step 7.1

**Verification**: Component renders identically

---

### 7.3 Migrate Remaining Components

**Task**: Apply CSS module pattern to remaining components.

**Dependencies**: Step 7.2

**Verification**: Visual regression tests pass

---

### 7.4 Update Build Configuration

**Task**: Ensure CSS modules are properly bundled.

**Implementation**:

Vite handles CSS modules automatically. Verify:
- CSS is included in build output
- Class names are properly hashed
- Styles work when package is consumed

**Dependencies**: Steps 7.2-7.3

**Verification**: Build output includes CSS, styles work in consumer app

---

## Common Utilities Needed

### Testing Utilities

Create `compact-mantine/tests/test-utils.tsx`:
```typescript
import { MantineProvider } from "@mantine/core";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { compactTheme } from "../src";

interface WrapperProps {
    children: ReactNode;
}

function Wrapper({ children }: WrapperProps) {
    return (
        <MantineProvider theme={compactTheme} forceColorScheme="dark">
            {children}
        </MantineProvider>
    );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
    return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
```

---

## External Libraries Assessment

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@mantine/core` | ^8.0.0 | Peer dependency | Required |
| `@mantine/hooks` | ^8.0.0 | Peer dependency | Required |
| `lucide-react` | ^0.525.0 | Icons | External (peer) |
| `react` | >=18.0.0 | Peer dependency | Required |
| `react-dom` | >=18.0.0 | Peer dependency | Required |

---

## Risk Mitigation

### Risk 1: Breaking Changes in graphty

**Mitigation**:
- Create feature branch for migration
- Keep old code until migration is verified
- Run full test suite before removing old code

### Risk 2: Visual Regression

**Mitigation**:
- Set up Chromatic before migration
- Capture baseline snapshots from graphty
- Compare post-migration snapshots

### Risk 3: TypeScript Type Mismatches

**Mitigation**:
- Export all types explicitly
- Test type resolution in consumer code
- Use `strict: true` in tsconfig

### Risk 4: CSS Specificity Issues

**Mitigation**:
- Use CSS variables for dynamic values
- Test in both light and dark modes
- Use semantic Mantine colors

### Risk 5: Build Output Size

**Mitigation**:
- Mark all dependencies as external
- Tree-shake unused components
- Monitor bundle size in CI

---

## Success Criteria

Phase completion requirements:

- [ ] **Phase 1**: Package scaffolding complete, `pnpm install` and `npm run build` succeed
- [ ] **Phase 2**: Theme extracted, all 19 components have compact size support, CSS regression tests pass
- [ ] **Phase 3**: All components extracted, unit tests pass, Storybook stories exist
- [ ] **Phase 4**: Coverage thresholds met, Chromatic baseline established
- [ ] **Phase 5**: README complete, JSDoc on all exports, Storybook documentation complete
- [ ] **Phase 6**: graphty migrated, all graphty tests pass
- [ ] **Phase 7**: CSS modules implemented for static styles, visual regression tests pass

---

## References

- [Design Document](./compact-mantine-design.md)
- [Mantine Theme Documentation](https://mantine.dev/theming/theme-object/)
- [Mantine Styles Performance](https://mantine.dev/styles/styles-performance/)
- [Storybook Interaction Testing](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Chromatic Visual Testing](https://www.chromatic.com/storybook)
