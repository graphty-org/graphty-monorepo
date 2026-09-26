/**
 * The X a CloseButton draws (design/figma-spec.md 4.7): two 1px strokes filling a square sized by
 * CloseButton's `--cb-icon-size` (10px at the default size). `vector-effect: non-scaling-stroke`
 * keeps the stroke at one CSS pixel whatever that size is.
 * @returns the glyph
 */
export function CloseGlyph(): React.JSX.Element {
    return (
        <svg className="cm-close-glyph" viewBox="0 0 10 10" fill="none" aria-hidden="true" focusable="false">
            <path d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
