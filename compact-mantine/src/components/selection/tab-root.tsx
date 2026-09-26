import React from "react";

// A pill tab is as wide as its label in weight 550 whether or not it is selected, so selecting
// one never shifts the row (design/figma-spec.md 5.1; Figma renders the label twice, a hidden
// bold copy stacked under the visible one). The theme hands this to Tabs.Tab as `renderRoot`:
// it renders the tab's button as Mantine would and adds, inside the label, an empty
// aria-hidden span carrying the text in `data-text`. The stylesheet draws that text with
// `::after` at weight 550, zero height and hidden, so it takes width and nothing else: it is not
// DOM text (`getByText` still finds one label), and aria-hidden keeps it out of the tab's
// accessible name (generated content otherwise counts towards it).
//
// Only a plain-text label is reserved; a label that is a React element renders as given.

/** The class the theme gives a tab's label span (TABS_CLASSES.tabLabel). */
const LABEL_CLASS = "cm-tab-label";

function reserve(child: React.ReactNode): React.ReactNode {
    if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
        return child;
    }
    const { className, children } = child.props;
    if (!className?.split(" ").includes(LABEL_CLASS) || (typeof children !== "string" && typeof children !== "number")) {
        return child;
    }
    return React.cloneElement(
        child,
        undefined,
        children,
        <span key="cm-tab-reserve" className="cm-tab-reserve" data-text={String(children)} aria-hidden="true" />,
    );
}

/**
 * Tabs.Tab's `renderRoot`: the tab's button, with the bold-width reserve added to its label.
 * @param props - the props Mantine would have given the button
 * @returns the button
 */
export function renderTabRoot(props: Record<string, unknown>): React.ReactNode {
    const { children, ...rest } = props as React.ComponentPropsWithRef<"button">;
    return <button {...rest}>{React.Children.map(children, reserve)}</button>;
}
