import { DataRow } from "@graphty/compact-mantine";
import React from "react";

import { formatNumber } from "./words";

/** The figures a distribution's rows show; each one left out is not drawn. */
interface DistributionFigures {
    readonly count?: number;
    readonly min?: number;
    readonly median?: number;
    readonly mean?: number;
    readonly max?: number;
}

/**
 * A distribution's figures, one value per row (as Gephi and Cytoscape list them): Has a value,
 * Lowest, Median, Mean (one decimal) and Highest. The graph's Degree, a layer's number value and
 * an attribute's Summary all draw these rows, so the same figure has the same name everywhere.
 * @param props - Component props
 * @param props.figures - the figures the element reported
 * @returns The rows, in a group the tests and screen readers can name
 */
export function DistributionRows({ figures }: Readonly<{ figures: DistributionFigures }>): React.JSX.Element {
    const { count, min, median, mean, max } = figures;
    return (
        <div // NOSONAR(S6819): a named group of rows, not a form; a fieldset would draw a border and legend box
            role="group"
            aria-label="Distribution"
            data-testid="values-spread"
        >
            {count !== undefined && <DataRow stat name="Has a value" value={formatNumber(count)} />}
            {min !== undefined && <DataRow stat name="Lowest" value={formatNumber(min)} />}
            {median !== undefined && <DataRow stat name="Median" value={formatNumber(median)} />}
            {mean !== undefined && <DataRow stat name="Mean" value={(Math.round(mean * 10) / 10).toFixed(1)} />}
            {max !== undefined && <DataRow stat name="Highest" value={formatNumber(max)} />}
        </div>
    );
}
