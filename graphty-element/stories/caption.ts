import type { Decorator } from "@storybook/web-components-vite";

/** How a caption is drawn: a strip above the canvas, legible in a screenshot. */
const CAPTION_STYLE = [
    "padding: 10px 16px",
    "background: #2a2a2a",
    "color: #ffffff",
    "font-family: system-ui, sans-serif",
    "font-size: 14px",
    "line-height: 1.4",
].join("; ");

/**
 * A decorator that puts a line of reader text above the story's canvas.
 *
 * The caption is the story's own explanation, drawn where both a reader and a screenshot see it.
 * @template TArgs - The args of the story it decorates.
 * @param text - What the story shows and how to get it.
 * @returns The decorator.
 */
export function captioned<TArgs>(text: string): Decorator<TArgs> {
    return (story) => {
        const container = document.createElement("div");
        const caption = document.createElement("div");
        caption.className = "story-caption";
        caption.style.cssText = CAPTION_STYLE;
        caption.textContent = text;
        container.append(caption);

        const rendered: unknown = story();
        if (rendered instanceof Node) {
            container.append(rendered);
        }

        return container;
    };
}
