/**
 * @file The scale catalogue: how a value in the data becomes a value on a channel.
 *
 * A binding says which attribute to read and which scale to read it through. The scale is what
 * decides whether a value ten times larger looks ten times larger, twice as large, or one step
 * along -- which is the difference between a picture that is readable and one that is a single
 * bright node beside nine hundred identical dark ones.
 *
 * Each descriptor names the kind of domain the scale accepts, so a consumer can offer only the
 * scales that suit the attribute it has: numeric scales for a measurement, categorical scales
 * for a name or a group.
 *
 * `options` are the binding fields the scale itself reads. Every binding also accepts a domain,
 * a clamp and a range whatever its scale, so those are not repeated on each entry here.
 */

import type { OptionDescriptor, ScaleDescriptor } from "./types";

/**
 * Reversing a scale swaps which end of the range the smallest value lands on, which is how "big
 * is dark" becomes "big is light" without touching the palette.
 */
const REVERSE: OptionDescriptor = {
    name: "reverse",
    plainName: "Reverse",
    technicalName: "reverse",
    type: "boolean",
    default: false,
    description: "Send the smallest value to the far end of the range instead of the near end.",
};

/**
 * The value a diverging palette centres on. Meaningless with a sequential or categorical
 * palette, which have no middle.
 */
const MIDPOINT: OptionDescriptor = {
    name: "midpoint",
    plainName: "Midpoint",
    technicalName: "midpoint",
    type: "number",
    description: "The value that lands on the middle colour of a diverging palette.",
};

/**
 * Build the option that says how many groups a binning scale cuts its domain into.
 * @param plainName - The label the control carries.
 * @param description - What the groups mean for this particular scale.
 * @param fallback - The number of groups used when the binding does not say.
 * @returns The option descriptor for that scale's group count.
 */
function binCount(plainName: string, description: string, fallback: number): OptionDescriptor {
    return {
        name: "bins",
        plainName,
        technicalName: "bins",
        type: "integer",
        default: fallback,
        min: 2,
        max: 20,
        step: 1,
        description,
    };
}

/** Every scale the element can read a binding through. */
export const SCALE_DESCRIPTORS: readonly ScaleDescriptor[] = [
    {
        name: "linear",
        plainName: "Even Steps",
        domainKind: "numeric",
        options: [REVERSE, MIDPOINT],
    },
    {
        name: "log",
        plainName: "By Order of Magnitude",
        domainKind: "numeric",
        options: [REVERSE, MIDPOINT],
    },
    {
        name: "neglog10",
        plainName: "By Significance",
        domainKind: "numeric",
        options: [REVERSE, MIDPOINT],
    },
    {
        name: "sqrt",
        plainName: "By Area",
        domainKind: "numeric",
        options: [REVERSE, MIDPOINT],
    },
    {
        name: "pow",
        plainName: "Curved",
        domainKind: "numeric",
        options: [
            {
                name: "exponent",
                plainName: "Exponent",
                technicalName: "exponent",
                type: "number",
                default: 1,
                min: 0.1,
                max: 10,
                step: 0.1,
                description:
                    "How hard the curve bends. Below one spreads the small values out; above " +
                    "one spreads the large ones out.",
            },
            REVERSE,
            MIDPOINT,
        ],
    },
    {
        name: "bins",
        plainName: "Equal Ranges",
        domainKind: "numeric",
        options: [
            binCount("Groups", "How many equally wide ranges to cut the values into.", 5),
            REVERSE,
        ],
    },
    {
        name: "quantile",
        plainName: "Equal Counts",
        domainKind: "numeric",
        options: [
            binCount("Groups", "How many groups of equal size to sort the values into.", 4),
            REVERSE,
        ],
    },
    {
        name: "ordinal",
        plainName: "One Colour per Value",
        domainKind: "categorical",
        options: [REVERSE],
    },
    {
        name: "passthrough",
        plainName: "Use the Value As It Is",
        domainKind: "categorical",
        options: [],
    },
];

/**
 * Find one scale by its name.
 * @param name - The scale name, such as "quantile".
 * @returns The descriptor, or undefined when the element does not know that scale.
 */
export function scaleDescriptor(name: string): ScaleDescriptor | undefined {
    return SCALE_DESCRIPTORS.find((descriptor) => descriptor.name === name);
}

/**
 * The scales that suit a kind of domain, which is what a binding editor offers once it knows
 * whether the chosen attribute holds measurements or names.
 * @param domainKind - The kind of values the attribute holds.
 * @returns Every scale that accepts that kind of domain, in catalogue order.
 */
export function scalesForDomain(domainKind: ScaleDescriptor["domainKind"]): readonly ScaleDescriptor[] {
    return SCALE_DESCRIPTORS.filter((descriptor) => descriptor.domainKind === domainKind);
}
