import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "lit";

import { blueHighlight, greenSuccess, orangeWarning } from "../../src/utils/styleHelpers/color/binary";
import { carbon, okabeIto, pastel, tolMuted, tolVibrant } from "../../src/utils/styleHelpers/color/categorical";
import { blueOrange, purpleGreen, redBlue } from "../../src/utils/styleHelpers/color/diverging";
import { blues, greens, inferno, oranges, plasma, viridis } from "../../src/utils/styleHelpers/color/sequential";
import { holds } from "../assertions";

/**
 * The colour ramps this story draws.
 *
 * Gathered here rather than imported as one namespace: `StyleHelpers` existed to be in scope
 * inside a `calculatedStyle` expression string, and it went with the evaluator. The ramps
 * themselves did not move.
 */
const StyleHelpers = {
    color: {
        sequential: { viridis, plasma, inferno, blues, greens, oranges },
        categorical: { okabeIto, tolVibrant, tolMuted, carbon, pastel },
        diverging: { purpleGreen, blueOrange, redBlue },
        binary: { blueHighlight, greenSuccess, orangeWarning },
    },
};

const DESCRIPTION = `
The color palettes the element ships, and how a style layer uses one; to add a palette of your
own, see [Custom palette](?path=/story/extending-simple-tier-palette--brand-palettes).

A palette turns a value into a color. Sequential palettes suit a measurement (low to high),
categorical ones suit groups, diverging ones suit values with a meaningful middle, and the binary
highlights mark what a result selected. Name a palette by its id in \`styles.encode()\`, and the
element reads the range of the values and paints every node. The catalog of palettes, with each
one's colors, kind and the color vision deficiencies it was checked against, is importable from
\`@graphty/graphty-element/catalog\` with no renderer behind it. See
[Palettes and scales](https://graphty.app/docs/graphty-element/guide/style-helpers).
`;

/** What a consumer writes to paint a graph with a palette, and to list the palettes. */
const PALETTE_SOURCE = `import { paletteDescriptor, palettesOfKind } from "@graphty/graphty-element/catalog";

const graph = document.querySelector("graphty-element");

// Color every node by its degree, through the viridis palette.
const run = await graph.session.runs.start("degree");
await graph.session.styles.encode({ run, channel: "node.color", palette: "viridis" });

// Every palette, for a picker of your own.
palettesOfKind("categorical"); // [{ id: "okabe-ito", plainName, colors, capacity, colorblindSafe }, ...]
paletteDescriptor("okabe-ito")?.colors; // ["#E69F00", "#56B4E9", ...]`;

const meta: Meta = {
    title: "Styling/Palettes",
    // The component id this section had before it was retitled, so every story id (and its
    // approved screenshot) stays the same.
    id: "algorithms-palette-picker",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: { component: DESCRIPTION },
            source: {
                language: "js",
                code: PALETTE_SOURCE,
            },
        },
        chromatic: {
            delay: 300, // Ensure DOM updates complete before snapshot
        },
        paintCheck: {
            exempt: "draws the colour ramps as DOM swatches and puts no graph on screen at all",
        },
    },
};
export default meta;

type Story = StoryObj;

/**
 * Interactive Palette Picker
 * Visual catalog of all available color palettes used by algorithm visualizations
 */
export const PalettePicker: Story = {
    name: "Built-in palettes",
    render: () => html`
        <style>
            .palette-picker {
                font-family: system-ui, sans-serif;
                padding: 20px;
                background: #f5f5f5;
            }
            .palette-category {
                margin-bottom: 30px;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .palette-category h2 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 18px;
            }
            .palette-row {
                margin-bottom: 20px;
            }
            .palette-name {
                font-weight: 600;
                margin-bottom: 8px;
                color: #555;
                font-size: 14px;
            }
            .palette-intro {
                color: #333;
                font-size: 14px;
                margin: 0 0 20px 0;
            }
            .palette-description {
                font-size: 12px;
                color: #777;
                margin-bottom: 8px;
            }
            .color-swatches {
                display: flex;
                gap: 4px;
                height: 40px;
            }
            .color-swatch {
                flex: 1;
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                position: relative;
                transition: transform 0.2s;
            }
            .color-swatch:hover {
                transform: scale(1.1);
                z-index: 10;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            .color-swatch::after {
                content: attr(data-color);
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                color: #999;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .color-swatch:hover::after {
                opacity: 1;
            }
            .accessibility-badge {
                display: inline-block;
                background: #28a745;
                color: white;
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: 8px;
            }
        </style>
        <div class="palette-picker">
            <h1>Built-in palettes</h1>
            <p class="palette-intro">
                Each palette is named by the id shown beside it, as in
                <code>styles.encode({ run, channel: "node.color", palette: "viridis" })</code>.
            </p>

            <!-- Sequential Gradients -->
            <div class="palette-category">
                <h2>Sequential Gradients (Continuous Data)</h2>

                <div class="palette-row">
                    <div class="palette-name">Viridis <span class="accessibility-badge">Colorblind safe</span></div>
                    <div class="palette-description">
                        <code>viridis</code> | Purple to Yellow | Default for continuous data
                    </div>
                    <div class="color-swatches" id="seq-viridis"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Plasma <span class="accessibility-badge">Colorblind safe</span></div>
                    <div class="palette-description">
                        <code>plasma</code> | Blue to Pink to Yellow | Warmer alternative
                    </div>
                    <div class="color-swatches" id="seq-plasma"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Inferno <span class="accessibility-badge">Colorblind safe</span></div>
                    <div class="palette-description">
                        <code>inferno</code> | Black to Red to Yellow | Dark, dramatic
                    </div>
                    <div class="color-swatches" id="seq-inferno"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Blues</div>
                    <div class="palette-description">
                        <code>blues</code> | Light Blue to Dark Blue | Cooler aesthetic
                    </div>
                    <div class="color-swatches" id="seq-blues"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Greens</div>
                    <div class="palette-description">
                        <code>greens</code> | Light Green to Dark Green | Growth metrics
                    </div>
                    <div class="color-swatches" id="seq-greens"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Oranges</div>
                    <div class="palette-description">
                        <code>oranges</code> | Light Orange to Dark Orange | Heat, energy
                    </div>
                    <div class="color-swatches" id="seq-oranges"></div>
                </div>
            </div>

            <!-- Categorical Palettes -->
            <div class="palette-category">
                <h2>Categorical Palettes (Discrete Groups)</h2>

                <div class="palette-row">
                    <div class="palette-name">Okabe-Ito <span class="accessibility-badge">Colorblind safe</span></div>
                    <div class="palette-description">
                        <code>okabe-ito</code> | 8 colors | R 4.0+ default, universally safe
                    </div>
                    <div class="color-swatches" id="cat-okabe"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">
                        Paul Tol Vibrant <span class="accessibility-badge">Colorblind safe</span>
                    </div>
                    <div class="palette-description"><code>tol-vibrant</code> | 7 colors | High saturation</div>
                    <div class="color-swatches" id="cat-tol-vibrant"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">
                        Paul Tol Muted <span class="accessibility-badge">Colorblind safe</span>
                    </div>
                    <div class="palette-description"><code>tol-muted</code> | 9 colors | Softer aesthetic</div>
                    <div class="color-swatches" id="cat-tol-muted"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">IBM Carbon</div>
                    <div class="palette-description"><code>carbon</code> | 5 colors | Modern enterprise design</div>
                    <div class="color-swatches" id="cat-carbon"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Pastel</div>
                    <div class="palette-description">
                        <code>pastel</code> | 8 colors | Softer, derived from Okabe-Ito
                    </div>
                    <div class="color-swatches" id="cat-pastel"></div>
                </div>
            </div>

            <!-- Diverging Gradients -->
            <div class="palette-category">
                <h2>Diverging Gradients (Above/Below Average)</h2>

                <div class="palette-row">
                    <div class="palette-name">
                        Purple-Green <span class="accessibility-badge">Colorblind safe</span>
                    </div>
                    <div class="palette-description">
                        <code>purple-green</code> | Purple, White, Green | No red-green confusion
                    </div>
                    <div class="color-swatches" id="div-purple-green"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Blue-Orange <span class="accessibility-badge">Colorblind safe</span></div>
                    <div class="palette-description">
                        <code>blue-orange</code> | Blue, White, Orange | High contrast
                    </div>
                    <div class="color-swatches" id="div-blue-orange"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Red-Blue</div>
                    <div class="palette-description">
                        <code>red-blue</code> | Red, white, blue | Use only where red and blue carry their usual
                        meaning, such as temperature
                    </div>
                    <div class="color-swatches" id="div-red-blue"></div>
                </div>
            </div>

            <!-- Binary Highlights -->
            <div class="palette-category">
                <h2>Binary Highlights (True/False States)</h2>

                <div class="palette-row">
                    <div class="palette-name">Blue Highlight</div>
                    <div class="palette-description">
                        <code>blue-highlight</code> | Blue vs Gray | Default for paths/selection
                    </div>
                    <div class="color-swatches" id="bin-blue"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Green Success</div>
                    <div class="palette-description"><code>green-highlight</code> | Green vs Gray | Success states</div>
                    <div class="color-swatches" id="bin-green"></div>
                </div>

                <div class="palette-row">
                    <div class="palette-name">Orange Warning</div>
                    <div class="palette-description">
                        <code>orange-highlight</code> | Orange vs Gray | Warnings/attention
                    </div>
                    <div class="color-swatches" id="bin-orange"></div>
                </div>
            </div>
        </div>
    `,
    play: async ({ canvasElement }) => {
        // Helper to render sequential gradient swatches
        const renderSequential = (containerId: string, fn: (value: number) => string, steps = 20): void => {
            const container = canvasElement.querySelector(`#${containerId}`);

            if (!container) {
                return;
            }

            for (let i = 0; i < steps; i++) {
                const value = i / (steps - 1);
                const color = fn(value);
                const swatch = document.createElement("div");
                swatch.className = "color-swatch";
                swatch.style.backgroundColor = color;
                swatch.setAttribute("data-color", color);
                container.appendChild(swatch);
            }
        };

        // Helper to render categorical swatches
        const renderCategorical = (containerId: string, fn: (index: number) => string, count: number): void => {
            const container = canvasElement.querySelector(`#${containerId}`);

            if (!container) {
                return;
            }

            for (let i = 0; i < count; i++) {
                const color = fn(i);
                const swatch = document.createElement("div");
                swatch.className = "color-swatch";
                swatch.style.backgroundColor = color;
                swatch.setAttribute("data-color", color);
                container.appendChild(swatch);
            }
        };

        // Helper to render diverging gradient swatches
        const renderDiverging = (
            containerId: string,
            fn: (value: number, midpoint: number) => string,
            steps = 20,
        ): void => {
            const container = canvasElement.querySelector(`#${containerId}`);

            if (!container) {
                return;
            }

            for (let i = 0; i < steps; i++) {
                const value = i / (steps - 1);
                const color = fn(value, 0.5);
                const swatch = document.createElement("div");
                swatch.className = "color-swatch";
                swatch.style.backgroundColor = color;
                swatch.setAttribute("data-color", color);
                container.appendChild(swatch);
            }
        };

        // Helper to render binary swatches
        const renderBinary = (containerId: string, fn: (state: boolean) => string): void => {
            const container = canvasElement.querySelector(`#${containerId}`);

            if (!container) {
                return;
            }

            [false, true].forEach((state) => {
                const color = fn(state);
                const swatch = document.createElement("div");
                swatch.className = "color-swatch";
                swatch.style.backgroundColor = color;
                swatch.setAttribute("data-color", color);
                (swatch as HTMLElement).style.flex = "0 0 48%";
                container.appendChild(swatch);
            });
        };

        // Render sequential gradients
        renderSequential("seq-viridis", StyleHelpers.color.sequential.viridis);
        renderSequential("seq-plasma", StyleHelpers.color.sequential.plasma);
        renderSequential("seq-inferno", StyleHelpers.color.sequential.inferno);
        renderSequential("seq-blues", StyleHelpers.color.sequential.blues);
        renderSequential("seq-greens", StyleHelpers.color.sequential.greens);
        renderSequential("seq-oranges", StyleHelpers.color.sequential.oranges);

        // Render categorical palettes
        renderCategorical("cat-okabe", StyleHelpers.color.categorical.okabeIto, 8);
        renderCategorical("cat-tol-vibrant", StyleHelpers.color.categorical.tolVibrant, 7);
        renderCategorical("cat-tol-muted", StyleHelpers.color.categorical.tolMuted, 9);
        renderCategorical("cat-carbon", StyleHelpers.color.categorical.carbon, 5);
        renderCategorical("cat-pastel", StyleHelpers.color.categorical.pastel, 8);

        // Render diverging gradients
        renderDiverging("div-purple-green", StyleHelpers.color.diverging.purpleGreen);
        renderDiverging("div-blue-orange", StyleHelpers.color.diverging.blueOrange);
        renderDiverging("div-red-blue", StyleHelpers.color.diverging.redBlue);

        // Render binary highlights
        renderBinary("bin-blue", StyleHelpers.color.binary.blueHighlight);
        renderBinary("bin-green", StyleHelpers.color.binary.greenSuccess);
        renderBinary("bin-orange", StyleHelpers.color.binary.orangeWarning);

        // WHAT THIS STORY HAS TO SHOW, and the one way it can silently show nothing: every
        // renderer above returns quietly when its container is missing, so a renamed id or a
        // dropped row leaves an empty panel and a passing test. Seventeen ramps are drawn here --
        // six sequential at twenty steps, five categorical at 8 + 7 + 9 + 5 + 8, three diverging
        // at twenty and three binary pairs -- which is 120 + 37 + 60 + 6 swatches.
        const swatches = canvasElement.querySelectorAll("[data-color]");
        const empty = [...canvasElement.querySelectorAll(".color-swatches")]
            .filter((row) => row.childElementCount === 0)
            .map((row) => row.id);

        await holds(
            empty.length === 0,
            `Algorithms/Palette Picker: ${String(empty.length)} palette rows drew no swatch at all ` +
                `-- ${empty.join(", ")}`,
        );

        await holds(
            swatches.length === 223,
            `Algorithms/Palette Picker: draws 17 ramps totalling 223 swatches and rendered ${String(swatches.length)}`,
        );

        const uncoloured = [...swatches].filter(
            (swatch) => (swatch as HTMLElement).style.backgroundColor === "",
        ).length;

        await holds(
            uncoloured === 0,
            `Algorithms/Palette Picker: ${String(uncoloured)} swatches carry a data-color and are drawn with no ` +
                "background colour at all",
        );
    },
};
