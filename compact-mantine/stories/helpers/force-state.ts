// Story helpers for the color package's States stories. A .ts file (createElement rather than
// JSX) so the stories lint block, which covers stories/**/*.ts, covers it too.
import { createElement, type ReactNode, useEffect, useRef } from "react";

/**
 * Forces a hover, focus or picker-open look onto the first element matching `selector` inside it, by writing
 * `data-state`, so a States story can show every state side by side (design/figma-spec.md 16).
 * @param props - Component props
 * @param props.state - the state to force
 * @param props.selector - which element takes it
 * @param props.children - the component
 * @returns the component, wrapped
 */
export function ForceState({
    state,
    selector,
    children,
}: {
    state: "hover" | "focus" | "open";
    selector: string;
    children: ReactNode;
}): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current?.querySelector(selector)?.setAttribute("data-state", state);
    });
    return createElement("div", { ref }, children);
}

/**
 * One labeled cell of a States grid.
 * @param props - Component props
 * @param props.label - the state's name
 * @param props.children - the component in that state
 * @returns the cell
 */
export function StateCell({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
    return createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4 } },
        createElement("div", { style: { color: "var(--cm-text-secondary)", fontSize: 9, lineHeight: "14px" } }, label),
        children,
    );
}
