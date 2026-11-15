/**
 * @file The legend `<graphty-element legend>` draws over the graph (issue #292): HTML in the shadow
 * root, exposed as `::part(legend)`, built from `session.styles.legend()` through the same
 * {@link legendSections} a screenshot's key is drawn from, so the two never disagree. It is redrawn
 * on `project:derived` and hidden while no layer binds a value. Every word in it is the data's or
 * the consumer's: field names, values, the names readers gave them, and the accessible name.
 */

import { legendSections } from "../screenshot/drawLegend";
import type { ScreenshotLegendPosition, ScreenshotLegendSection } from "../screenshot/types";
import type { LegendBlock } from "../session/styles/legend";

/** What the legend needs from the element: the legend model and its change notification. */
export interface LegendHost {
    /** `session.styles.legend()`. */
    legend(): readonly LegendBlock[];
    /**
     * Calls `listener` after every change the picture has caught up with (`project:derived`).
     * @returns Stops listening.
     */
    onDerived(listener: () => void): () => void;
}

/**
 * The defaults, all overridable from the page through `::part(legend)`. Sizes are in `em`, so the
 * part's `font-size` scales the whole key.
 */
const CSS = `
[part="legend"] {
    position: absolute;
    z-index: 1;
    box-sizing: border-box;
    max-width: 40%;
    max-height: calc(100% - 16px);
    overflow: auto;
    padding: 0.5em;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: rgb(255 255 255 / 92%);
    color: #1a1a1a;
    font: 12px system-ui, sans-serif;
    line-height: 1.35;
}
[part="legend"][hidden] { display: none; }
[part="legend"][data-position="top-left"] { top: 8px; left: 8px; }
[part="legend"][data-position="top-right"] { top: 8px; right: 8px; }
[part="legend"][data-position="bottom-left"] { bottom: 8px; left: 8px; }
[part="legend"][data-position="bottom-right"] { bottom: 8px; right: 8px; }
[part="legend"] .section + .section { margin-top: 0.5em; }
[part="legend"] .title { font-weight: 600; }
[part="legend"] ul { list-style: none; margin: 0; padding: 0; }
[part="legend"] li { display: flex; align-items: center; gap: 0.5em; white-space: nowrap; }
[part="legend"] .chip { flex: none; width: 0.85em; height: 0.85em; }
[part="legend"] .ramp { width: 10em; height: 0.7em; margin-top: 0.2em; }
[part="legend"] .ends { display: flex; justify-content: space-between; gap: 1em; }
[part="legend"] .note { color: #666; }
`;

/** A size wedge for a ramp with no colors: thin at the low end, full height at the high end. */
const WEDGE = "linear-gradient(to top right, #888 50%, transparent 50%)";

/**
 * The legend overlay. Built once per element; shown between {@link LegendOverlay.connect} and
 * {@link LegendOverlay.disconnect}.
 */
export class LegendOverlay {
    readonly element = document.createElement("div");
    readonly #style = document.createElement("style");
    #stop: (() => void) | undefined;

    /**
     * Build the empty overlay; nothing is in the page until `connect`.
     * @param host - The element side.
     */
    constructor(private readonly host: LegendHost) {
        this.element.setAttribute("part", "legend");
        this.element.setAttribute("role", "group");
        this.element.hidden = true;
        this.#style.textContent = CSS;
        this.setPosition("top-left");
    }

    /**
     * Put the overlay in the shadow root and follow the session.
     * @param root - The element's shadow root.
     */
    connect(root: Node): void {
        if (this.element.parentNode === root) {
            return;
        }

        root.appendChild(this.#style);
        root.appendChild(this.element);
        this.#stop = this.host.onDerived(() => {
            this.draw();
        });
        this.draw();
    }

    /** Leave the shadow root and stop following the session. */
    disconnect(): void {
        this.#stop?.();
        this.#stop = undefined;
        this.#style.remove();
        this.element.remove();
    }

    /**
     * The accessible name, which the consumer chooses; none when unset.
     * @param label - The name, or undefined for none.
     */
    setLabel(label: string | undefined): void {
        if (label === undefined) {
            this.element.removeAttribute("aria-label");
        } else {
            this.element.setAttribute("aria-label", label);
        }
    }

    /**
     * The corner the overlay sits in.
     * @param position - The corner.
     */
    setPosition(position: ScreenshotLegendPosition): void {
        this.element.dataset.position = position;
    }

    /** Rebuild the overlay from the legend now; hidden when no layer binds a value. */
    draw(): void {
        const sections = legendSections(this.host.legend());
        this.element.replaceChildren(...sections.map((section, index) => renderSection(section, index)));
        this.element.hidden = sections.length === 0;
    }
}

/**
 * One section as HTML: a group named by its title, holding a list of rows or a ramp with its ends,
 * and its note. Chips and ramps are hidden from screen readers; the words beside them are read.
 * @param section - The section.
 * @param index - Its place, for the id its group is named by.
 * @returns The section's element.
 */
function renderSection(section: ScreenshotLegendSection, index: number): HTMLElement {
    const group = document.createElement("div");
    group.className = "section";
    group.setAttribute("role", "group");
    const title = document.createElement("div");
    title.className = "title";
    title.id = `graphty-legend-${String(index)}`;
    title.textContent = section.title;
    group.setAttribute("aria-labelledby", title.id);
    group.append(title);

    if (section.rows !== undefined) {
        const list = document.createElement("ul");
        list.setAttribute("role", "list");
        for (const row of section.rows) {
            const item = document.createElement("li");
            if (row.color !== undefined) {
                item.append(chip("chip", row.color));
            }
            item.append(row.label);
            list.append(item);
        }
        group.append(list);
    }

    if (section.ramp !== undefined) {
        const { colors = [], min, max } = section.ramp;
        let paint = WEDGE;
        if (colors.length === 1) {
            paint = colors[0];
        } else if (colors.length > 1) {
            paint = `linear-gradient(to right, ${colors.join(", ")})`;
        }
        const ends = document.createElement("div");
        ends.className = "ends";
        const low = document.createElement("span");
        low.textContent = min;
        const high = document.createElement("span");
        high.textContent = max;
        ends.append(low, high);
        group.append(chip("ramp", paint), ends);
    }

    if (section.note !== undefined) {
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = section.note;
        group.append(note);
    }

    return group;
}

/**
 * A painted box a screen reader skips.
 * @param className - `chip` or `ramp`.
 * @param paint - Its CSS background.
 * @returns The box.
 */
function chip(className: string, paint: string): HTMLElement {
    const box = document.createElement("span");
    box.className = className;
    box.setAttribute("aria-hidden", "true");
    box.style.background = paint;
    if (className === "ramp") {
        box.style.display = "block";
    }
    return box;
}
