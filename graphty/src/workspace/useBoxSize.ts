import { useEffect, useState } from "react";

/**
 * An element's border-box size, measured from the moment it mounts. Mantine's `useElementSize`
 * observes only an element its ref already held when the component rendered, so an element that
 * mounts after its component's first render (a dock that waits for the session, a table that
 * replaces "No matches") stayed unmeasured until something else drew the component again (#6048,
 * #6062). A callback ref sees every element it is handed.
 * @returns the callback ref for the element, and its width and height (0 until measured).
 */
export function useBoxSize(): { ref: (element: HTMLElement | null) => void; width: number; height: number } {
    const [element, ref] = useState<HTMLElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const observer = new ResizeObserver(([entry]) => {
            const box = entry.borderBoxSize[0];
            const width = box?.inlineSize ?? entry.contentRect.width;
            const height = box?.blockSize ?? entry.contentRect.height;
            setSize((now) => (now.width === width && now.height === height ? now : { width, height }));
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [element]);
    return { ref, ...size };
}
