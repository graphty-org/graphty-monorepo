/**
 * The spinner a loading Button draws (design/figma-spec.md 4.1, bc/btn-primary-md-loading--default
 * #28-#30): a 16px box holding a 12px ring, a faint track and a quarter arc, in the button's ink.
 * @returns the spinner
 */
export function ButtonSpinner(): React.JSX.Element {
    return (
        <svg className="cm-button-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
            <path d="M8 2.75A5.25 5.25 0 0 1 13.25 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
