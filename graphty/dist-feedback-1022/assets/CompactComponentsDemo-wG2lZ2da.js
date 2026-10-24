import {
    V as le,
    W as te,
    X as ie,
    Y as e,
    Z as s,
    _ as se,
    $ as ae,
    a0 as oe,
    a1 as z,
    a2 as c,
    a3 as re,
    a4 as X,
    a5 as a,
    a6 as P,
    a7 as t,
    a8 as n,
    a9 as p,
    aa as q,
    ab as T,
    ac as ce,
    ad as ne,
    ae as _,
    af as de,
    ag as i,
    ah as xe,
    ai as D,
    aj as he,
    ak as O,
    al as Y,
    am as pe,
    an as me,
    ao as U,
    ap as E,
    aq as ue,
    ar as V,
    as as L,
    at as m,
    au as R,
    av as G,
    aw as h,
    ax as b,
} from "./index-hDuyXkBS.js";
import "./preload-helper-BXl3LOEh.js";
var Z = { root: "m_3eebeb36", label: "m_9e365f20" };
const je = { orientation: "horizontal" },
    be = se((r, { color: d, variant: x, size: j }) => ({
        root: {
            "--divider-color": d ? oe(d, r) : void 0,
            "--divider-border-style": x,
            "--divider-size": ae(j, "divider-size"),
        },
    })),
    g = le((r, d) => {
        const x = te("Divider", je, r),
            {
                classNames: j,
                className: y,
                style: S,
                styles: B,
                unstyled: F,
                vars: W,
                color: $,
                orientation: A,
                label: v,
                labelPosition: C,
                mod: k,
                attributes: I,
                ...M
            } = x,
            w = ie({
                name: "Divider",
                classes: Z,
                props: x,
                className: y,
                style: S,
                classNames: j,
                styles: B,
                unstyled: F,
                attributes: I,
                vars: W,
                varsResolver: be,
            });
        return e.jsx(s, {
            ref: d,
            mod: [{ orientation: A, "with-label": !!v }, k],
            ...w("root"),
            ...M,
            role: "separator",
            children: v && e.jsx(s, { component: "span", mod: { position: C }, ...w("label"), children: v }),
        });
    });
g.classes = Z;
g.displayName = "@mantine/core/Divider";
const ge = [
        ["path", { d: "M15 12H3", key: "6jk70r" }],
        ["path", { d: "M17 18H3", key: "1amg6g" }],
        ["path", { d: "M21 6H3", key: "1jwq7v" }],
    ],
    ze = z("align-left", ge);
const ve = [
        ["path", { d: "M12 2v20", key: "t6zp3m" }],
        ["path", { d: "m15 19-3 3-3-3", key: "11eu04" }],
        ["path", { d: "m19 9 3 3-3 3", key: "1mg7y2" }],
        ["path", { d: "M2 12h20", key: "9i4pu4" }],
        ["path", { d: "m5 9-3 3 3 3", key: "j64kie" }],
        ["path", { d: "m9 5 3-3 3 3", key: "l8vdw6" }],
    ],
    fe = z("move", ve);
const ye = [
        [
            "path",
            {
                d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",
                key: "e79jfc",
            },
        ],
        ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", key: "1okk4w" }],
        ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", key: "f64h9f" }],
        ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", key: "qy21gx" }],
        ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", key: "fotxhn" }],
    ],
    Se = z("palette", ye);
const Ce = [
        ["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", key: "1p45f6" }],
        ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
    ],
    ke = z("rotate-cw", Ce);
const we = [
        ["path", { d: "M3 6h18", key: "d0wm0j" }],
        ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
        ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
    ],
    H = z("trash", we);
const Te = [
        ["path", { d: "M12 4v16", key: "1654pz" }],
        ["path", { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2", key: "e0r10z" }],
        ["path", { d: "M9 20h6", key: "s66wpe" }],
    ],
    Ve = z("type", Te);
function Fe() {
    const [r, d] = c.useState("Sample text"),
        [x, j] = c.useState(42),
        [y, S] = c.useState("option1"),
        [B, F] = c.useState("option1"),
        [W, $] = c.useState(!0),
        [A, v] = c.useState(!0),
        [C, k] = c.useState(50),
        [I, M] = c.useState("option1"),
        [w, J] = c.useState(`Multi-line
text content`),
        [K, Q] = c.useState(""),
        [N, ee] = c.useState(!0);
    return e.jsx(re, {
        children: e.jsx(s, {
            style: { height: "100vh", overflow: "auto", backgroundColor: "var(--mantine-color-body)" },
            children: e.jsxs(s, {
                p: "md",
                style: { maxWidth: 800, margin: "0 auto" },
                children: [
                    e.jsx(X, { order: 1, mb: "lg", children: "Compact Components Demo" }),
                    e.jsxs(a, {
                        c: "dimmed",
                        mb: "xl",
                        children: [
                            "All components below use ",
                            e.jsx("code", { children: 'size="compact"' }),
                            " (24px height, 11px font). This demonstrates the Figma-style dense UI suitable for properties panels.",
                        ],
                    }),
                    e.jsxs(u, {
                        title: "Size Comparison",
                        children: [
                            e.jsx(a, {
                                size: "sm",
                                c: "dimmed",
                                mb: "md",
                                children: "Compare compact size with standard Mantine sizes:",
                            }),
                            e.jsxs(P, {
                                gap: "xs",
                                children: [
                                    e.jsxs(t, {
                                        gap: "md",
                                        align: "flex-end",
                                        children: [
                                            e.jsx(s, {
                                                w: 100,
                                                children: e.jsx(a, { size: "xs", c: "dimmed", children: "xs (28px)" }),
                                            }),
                                            e.jsx(n, { size: "xs", placeholder: "Size xs", style: { flex: 1 } }),
                                        ],
                                    }),
                                    e.jsxs(t, {
                                        gap: "md",
                                        align: "flex-end",
                                        children: [
                                            e.jsx(s, {
                                                w: 100,
                                                children: e.jsx(a, {
                                                    size: "xs",
                                                    c: "dimmed",
                                                    children: "compact (24px)",
                                                }),
                                            }),
                                            e.jsx(n, {
                                                size: "compact",
                                                placeholder: "Size compact",
                                                style: { flex: 1 },
                                            }),
                                        ],
                                    }),
                                    e.jsxs(t, {
                                        gap: "md",
                                        align: "flex-end",
                                        children: [
                                            e.jsx(s, {
                                                w: 100,
                                                children: e.jsx(a, { size: "xs", c: "dimmed", children: "sm (32px)" }),
                                            }),
                                            e.jsx(n, { size: "sm", placeholder: "Size sm", style: { flex: 1 } }),
                                        ],
                                    }),
                                    e.jsxs(t, {
                                        gap: "md",
                                        align: "flex-end",
                                        children: [
                                            e.jsx(s, {
                                                w: 100,
                                                children: e.jsx(a, { size: "xs", c: "dimmed", children: "md (36px)" }),
                                            }),
                                            e.jsx(n, { size: "md", placeholder: "Size md", style: { flex: 1 } }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    }),
                    e.jsx(u, {
                        title: "Input Components",
                        children: e.jsxs(f, {
                            children: [
                                e.jsx(l, {
                                    label: "TextInput",
                                    children: e.jsx(n, {
                                        size: "compact",
                                        value: r,
                                        onChange: (o) => {
                                            d(o.currentTarget.value);
                                        },
                                        placeholder: "Enter text...",
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "NumberInput",
                                    children: e.jsx(p, { size: "compact", value: x, onChange: j, min: 0, max: 100 }),
                                }),
                                e.jsx(l, {
                                    label: "NumberInput (hideControls)",
                                    children: e.jsx(p, { size: "compact", value: x, onChange: j, hideControls: !0 }),
                                }),
                                e.jsx(l, {
                                    label: "NativeSelect",
                                    children: e.jsx(q, {
                                        size: "compact",
                                        value: y,
                                        onChange: (o) => {
                                            S(o.currentTarget.value);
                                        },
                                        data: [
                                            { value: "option1", label: "Option 1" },
                                            { value: "option2", label: "Option 2" },
                                            { value: "option3", label: "Option 3" },
                                        ],
                                        rightSection: e.jsx(T, { size: 14 }),
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Select (with chevron)",
                                    children: e.jsx(ce, {
                                        size: "compact",
                                        value: y,
                                        onChange: (o) => {
                                            S(o ?? "option1");
                                        },
                                        data: [
                                            { value: "option1", label: "Option 1" },
                                            { value: "option2", label: "Option 2" },
                                            { value: "option3", label: "Option 3" },
                                        ],
                                        rightSection: e.jsx(T, { size: 14 }),
                                        autoComplete: "off",
                                        "data-lpignore": "true",
                                        "data-1p-ignore": !0,
                                        "data-form-type": "other",
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Autocomplete",
                                    children: e.jsx(ne, {
                                        size: "compact",
                                        value: K,
                                        onChange: Q,
                                        placeholder: "Type to search...",
                                        data: ["React", "Vue", "Angular", "Svelte", "Solid"],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "CompactColorInput (click the chit to open the picker)",
                                    children: e.jsx(_, { defaultColor: "#5B8FF9", showOpacity: !1 }),
                                }),
                                e.jsx(l, {
                                    label: "Textarea",
                                    fullWidth: !0,
                                    children: e.jsx(de, {
                                        size: "compact",
                                        value: w,
                                        onChange: (o) => {
                                            J(o.currentTarget.value);
                                        },
                                        rows: 3,
                                    }),
                                }),
                            ],
                        }),
                    }),
                    e.jsxs(u, {
                        title: "Figma-Style Components",
                        children: [
                            e.jsx(a, {
                                size: "sm",
                                c: "dimmed",
                                mb: "md",
                                children: "These patterns match Figma's properties panel design.",
                            }),
                            e.jsxs(f, {
                                children: [
                                    e.jsx(l, {
                                        label: "TextInput with left icon (W/H pattern)",
                                        fullWidth: !0,
                                        children: e.jsxs(t, {
                                            gap: 8,
                                            children: [
                                                e.jsx(n, {
                                                    size: "compact",
                                                    value: "400",
                                                    leftSection: e.jsx(a, {
                                                        size: "xs",
                                                        c: "dimmed",
                                                        fw: 500,
                                                        children: "W",
                                                    }),
                                                    leftSectionWidth: 24,
                                                    leftSectionPointerEvents: "none",
                                                    style: { flex: 1 },
                                                    styles: { input: { paddingLeft: 28 } },
                                                }),
                                                e.jsx(n, {
                                                    size: "compact",
                                                    value: "300",
                                                    leftSection: e.jsx(a, {
                                                        size: "xs",
                                                        c: "dimmed",
                                                        fw: 500,
                                                        children: "H",
                                                    }),
                                                    leftSectionWidth: 24,
                                                    leftSectionPointerEvents: "none",
                                                    style: { flex: 1 },
                                                    styles: { input: { paddingLeft: 28 } },
                                                }),
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "subtle",
                                                    "aria-label": "Link dimensions",
                                                    children: e.jsx(xe, { size: 14 }),
                                                }),
                                            ],
                                        }),
                                    }),
                                    e.jsx(l, {
                                        label: "TextInput with right icon",
                                        fullWidth: !0,
                                        children: e.jsxs(t, {
                                            gap: 8,
                                            children: [
                                                e.jsx(n, {
                                                    size: "compact",
                                                    value: "0",
                                                    rightSection: e.jsx(ke, {
                                                        size: 12,
                                                        color: "var(--mantine-color-dimmed)",
                                                    }),
                                                    rightSectionWidth: 24,
                                                    style: { flex: 1 },
                                                }),
                                                e.jsx(n, {
                                                    size: "compact",
                                                    value: "100%",
                                                    rightSection: e.jsx(fe, {
                                                        size: 12,
                                                        color: "var(--mantine-color-dimmed)",
                                                    }),
                                                    rightSectionWidth: 24,
                                                    style: { flex: 1 },
                                                }),
                                            ],
                                        }),
                                    }),
                                    e.jsx(l, {
                                        label: "NumberInput with suffix",
                                        fullWidth: !0,
                                        children: e.jsxs(t, {
                                            gap: 8,
                                            children: [
                                                e.jsx(p, {
                                                    size: "compact",
                                                    value: 0,
                                                    suffix: "°",
                                                    hideControls: !0,
                                                    style: { flex: 1 },
                                                }),
                                                e.jsx(p, {
                                                    size: "compact",
                                                    value: 100,
                                                    suffix: "%",
                                                    hideControls: !0,
                                                    style: { flex: 1 },
                                                }),
                                                e.jsx(p, {
                                                    size: "compact",
                                                    value: 12,
                                                    suffix: "px",
                                                    hideControls: !0,
                                                    style: { flex: 1 },
                                                }),
                                            ],
                                        }),
                                    }),
                                    e.jsx(l, {
                                        label: "Figma Fill Row: [■ hex] [opacity%] [eye] [-]",
                                        fullWidth: !0,
                                        children: e.jsxs(t, {
                                            gap: 0,
                                            children: [
                                                e.jsx(_, { defaultColor: "#5B8FF9" }),
                                                e.jsxs(t, {
                                                    gap: 4,
                                                    ml: 8,
                                                    children: [
                                                        e.jsx(i, {
                                                            size: "compact",
                                                            variant: "subtle",
                                                            onClick: () => {
                                                                ee(!N);
                                                            },
                                                            "aria-label": N ? "Hide fill" : "Show fill",
                                                            children: N
                                                                ? e.jsx(D, { size: 14 })
                                                                : e.jsx(he, { size: 14 }),
                                                        }),
                                                        e.jsx(i, {
                                                            size: "compact",
                                                            variant: "subtle",
                                                            color: "red",
                                                            "aria-label": "Remove fill",
                                                            children: e.jsx(O, { size: 14 }),
                                                        }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    }),
                                    e.jsx(l, {
                                        label: "Multiple fills (like Figma)",
                                        fullWidth: !0,
                                        children: e.jsxs(P, {
                                            gap: 4,
                                            children: [
                                                e.jsx(s, {
                                                    p: 4,
                                                    style: {
                                                        backgroundColor: "var(--mantine-primary-color-filled)",
                                                        borderRadius: 4,
                                                        marginLeft: -4,
                                                        marginRight: -4,
                                                    },
                                                    children: e.jsxs(t, {
                                                        gap: 0,
                                                        children: [
                                                            e.jsx(n, {
                                                                size: "compact",
                                                                value: "5B8FF9",
                                                                w: 110,
                                                                leftSection: e.jsx(Y, {
                                                                    color: "#5B8FF9",
                                                                    size: 14,
                                                                    radius: 2,
                                                                    style: { cursor: "pointer" },
                                                                }),
                                                                leftSectionWidth: 24,
                                                                leftSectionPointerEvents: "none",
                                                                styles: {
                                                                    input: {
                                                                        backgroundColor: "transparent",
                                                                        border: "none",
                                                                        fontFamily: "monospace",
                                                                        color: "var(--mantine-primary-color-contrast)",
                                                                        textTransform: "uppercase",
                                                                        paddingLeft: 32,
                                                                    },
                                                                },
                                                            }),
                                                            e.jsx(s, {
                                                                style: {
                                                                    width: 1,
                                                                    height: 16,
                                                                    backgroundColor:
                                                                        "var(--mantine-primary-color-light)",
                                                                },
                                                            }),
                                                            e.jsx(p, {
                                                                size: "compact",
                                                                value: 100,
                                                                suffix: "%",
                                                                hideControls: !0,
                                                                w: 56,
                                                                styles: {
                                                                    input: {
                                                                        backgroundColor: "transparent",
                                                                        border: "none",
                                                                        color: "var(--mantine-primary-color-contrast)",
                                                                        textAlign: "right",
                                                                    },
                                                                },
                                                            }),
                                                            e.jsxs(t, {
                                                                gap: 4,
                                                                ml: "auto",
                                                                children: [
                                                                    e.jsx(i, {
                                                                        size: "compact",
                                                                        variant: "subtle",
                                                                        style: {
                                                                            color: "var(--mantine-primary-color-contrast)",
                                                                        },
                                                                        "aria-label": "Toggle visibility",
                                                                        children: e.jsx(D, { size: 14 }),
                                                                    }),
                                                                    e.jsx(i, {
                                                                        size: "compact",
                                                                        variant: "subtle",
                                                                        style: {
                                                                            color: "var(--mantine-primary-color-contrast)",
                                                                        },
                                                                        "aria-label": "Remove fill",
                                                                        children: e.jsx(O, { size: 14 }),
                                                                    }),
                                                                ],
                                                            }),
                                                        ],
                                                    }),
                                                }),
                                                e.jsxs(t, {
                                                    gap: 0,
                                                    children: [
                                                        e.jsx(n, {
                                                            size: "compact",
                                                            value: "FF6B6B",
                                                            w: 110,
                                                            leftSection: e.jsx(Y, {
                                                                color: "#FF6B6B",
                                                                size: 14,
                                                                radius: 2,
                                                                style: { cursor: "pointer" },
                                                            }),
                                                            leftSectionWidth: 24,
                                                            leftSectionPointerEvents: "none",
                                                            styles: {
                                                                input: {
                                                                    backgroundColor: "var(--mantine-color-default)",
                                                                    border: "none",
                                                                    fontFamily: "monospace",
                                                                    textTransform: "uppercase",
                                                                    paddingLeft: 32,
                                                                },
                                                            },
                                                        }),
                                                        e.jsx(s, {
                                                            style: {
                                                                width: 1,
                                                                height: 16,
                                                                backgroundColor: "var(--mantine-color-default-border)",
                                                            },
                                                        }),
                                                        e.jsx(p, {
                                                            size: "compact",
                                                            value: 50,
                                                            suffix: "%",
                                                            hideControls: !0,
                                                            w: 56,
                                                            styles: {
                                                                input: {
                                                                    backgroundColor: "var(--mantine-color-default)",
                                                                    border: "none",
                                                                    textAlign: "right",
                                                                },
                                                            },
                                                        }),
                                                        e.jsxs(t, {
                                                            gap: 4,
                                                            ml: "auto",
                                                            children: [
                                                                e.jsx(i, {
                                                                    size: "compact",
                                                                    variant: "subtle",
                                                                    "aria-label": "Toggle visibility",
                                                                    children: e.jsx(D, { size: 14 }),
                                                                }),
                                                                e.jsx(i, {
                                                                    size: "compact",
                                                                    variant: "subtle",
                                                                    "aria-label": "Remove fill",
                                                                    children: e.jsx(O, { size: 14 }),
                                                                }),
                                                            ],
                                                        }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    }),
                                    e.jsx(l, {
                                        label: "Compact ActionIcon toolbar",
                                        fullWidth: !0,
                                        children: e.jsxs(t, {
                                            gap: 4,
                                            children: [
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "filled",
                                                    "aria-label": "Align left",
                                                    children: e.jsx(ze, { size: 14 }),
                                                }),
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "subtle",
                                                    "aria-label": "Text formatting",
                                                    children: e.jsx(Ve, { size: 14 }),
                                                }),
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "subtle",
                                                    "aria-label": "Color palette",
                                                    children: e.jsx(Se, { size: 14 }),
                                                }),
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "subtle",
                                                    "aria-label": "Hashtag",
                                                    children: e.jsx(pe, { size: 14 }),
                                                }),
                                                e.jsx(g, { orientation: "vertical" }),
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "subtle",
                                                    "aria-label": "Copy",
                                                    children: e.jsx(me, { size: 14 }),
                                                }),
                                                e.jsx(i, {
                                                    size: "compact",
                                                    variant: "subtle",
                                                    color: "red",
                                                    "aria-label": "Delete",
                                                    children: e.jsx(H, { size: 14 }),
                                                }),
                                            ],
                                        }),
                                    }),
                                ],
                            }),
                        ],
                    }),
                    e.jsx(u, {
                        title: "Control Components",
                        children: e.jsxs(f, {
                            children: [
                                e.jsx(l, {
                                    label: "SegmentedControl",
                                    fullWidth: !0,
                                    children: e.jsx(U, {
                                        size: "compact",
                                        value: B,
                                        onChange: F,
                                        data: [
                                            { value: "option1", label: "Solid" },
                                            { value: "option2", label: "Gradient" },
                                            { value: "option3", label: "Radial" },
                                        ],
                                        fullWidth: !0,
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Checkbox",
                                    children: e.jsx(E, {
                                        size: "compact",
                                        label: "Enable feature",
                                        checked: W,
                                        onChange: (o) => {
                                            $(o.currentTarget.checked);
                                        },
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Switch",
                                    children: e.jsx(ue, {
                                        size: "compact",
                                        label: "Toggle option",
                                        checked: A,
                                        onChange: (o) => {
                                            v(o.currentTarget.checked);
                                        },
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Radio Group",
                                    fullWidth: !0,
                                    children: e.jsx(V.Group, {
                                        value: I,
                                        onChange: M,
                                        children: e.jsxs(t, {
                                            children: [
                                                e.jsx(V, { size: "compact", value: "option1", label: "Option 1" }),
                                                e.jsx(V, { size: "compact", value: "option2", label: "Option 2" }),
                                                e.jsx(V, { size: "compact", value: "option3", label: "Option 3" }),
                                            ],
                                        }),
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Slider",
                                    fullWidth: !0,
                                    children: e.jsx(L, {
                                        size: "compact",
                                        value: C,
                                        onChange: k,
                                        min: 0,
                                        max: 100,
                                        label: (o) => `${o}%`,
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Slider with marks",
                                    fullWidth: !0,
                                    children: e.jsx(L, {
                                        size: "compact",
                                        value: C,
                                        onChange: k,
                                        min: 0,
                                        max: 100,
                                        marks: [
                                            { value: 0, label: "0%" },
                                            { value: 50, label: "50%" },
                                            { value: 100, label: "100%" },
                                        ],
                                    }),
                                }),
                            ],
                        }),
                    }),
                    e.jsx(u, {
                        title: "Button Components",
                        children: e.jsxs(f, {
                            children: [
                                e.jsx(l, {
                                    label: "Button variants",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(m, { size: "compact", children: "Default" }),
                                            e.jsx(m, { size: "compact", variant: "light", children: "Light" }),
                                            e.jsx(m, { size: "compact", variant: "outline", children: "Outline" }),
                                            e.jsx(m, { size: "compact", variant: "subtle", children: "Subtle" }),
                                        ],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Button with icon",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(m, {
                                                size: "compact",
                                                leftSection: e.jsx(R, { size: 12 }),
                                                children: "Add Item",
                                            }),
                                            e.jsx(m, {
                                                size: "compact",
                                                rightSection: e.jsx(G, { size: 12 }),
                                                children: "Settings",
                                            }),
                                        ],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "ActionIcon variants",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(i, {
                                                size: "compact",
                                                variant: "filled",
                                                "aria-label": "Add item",
                                                children: e.jsx(R, { size: 14 }),
                                            }),
                                            e.jsx(i, {
                                                size: "compact",
                                                variant: "light",
                                                "aria-label": "Settings",
                                                children: e.jsx(G, { size: 14 }),
                                            }),
                                            e.jsx(i, {
                                                size: "compact",
                                                variant: "subtle",
                                                "aria-label": "Delete",
                                                children: e.jsx(H, { size: 14 }),
                                            }),
                                            e.jsx(i, {
                                                size: "compact",
                                                variant: "outline",
                                                "aria-label": "Expand",
                                                children: e.jsx(T, { size: 14 }),
                                            }),
                                        ],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "ActionIcon colors",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(i, {
                                                size: "compact",
                                                color: "blue",
                                                "aria-label": "Add blue",
                                                children: e.jsx(R, { size: 14 }),
                                            }),
                                            e.jsx(i, {
                                                size: "compact",
                                                color: "green",
                                                "aria-label": "Add green",
                                                children: e.jsx(R, { size: 14 }),
                                            }),
                                            e.jsx(i, {
                                                size: "compact",
                                                color: "red",
                                                "aria-label": "Delete red",
                                                children: e.jsx(H, { size: 14 }),
                                            }),
                                            e.jsx(i, {
                                                size: "compact",
                                                color: "gray",
                                                "aria-label": "Settings gray",
                                                children: e.jsx(G, { size: 14 }),
                                            }),
                                        ],
                                    }),
                                }),
                            ],
                        }),
                    }),
                    e.jsx(u, {
                        title: "Display Components",
                        children: e.jsxs(f, {
                            children: [
                                e.jsx(l, {
                                    label: "Badge variants",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(h, { size: "compact", children: "Default" }),
                                            e.jsx(h, { size: "compact", variant: "light", children: "Light" }),
                                            e.jsx(h, { size: "compact", variant: "outline", children: "Outline" }),
                                            e.jsx(h, { size: "compact", variant: "dot", children: "Dot" }),
                                        ],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Badge colors",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(h, { size: "compact", color: "blue", children: "Blue" }),
                                            e.jsx(h, { size: "compact", color: "green", children: "Green" }),
                                            e.jsx(h, { size: "compact", color: "red", children: "Red" }),
                                            e.jsx(h, { size: "compact", color: "yellow", children: "Yellow" }),
                                            e.jsx(h, { size: "compact", color: "gray", children: "Gray" }),
                                        ],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Pill",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(b, { size: "compact", children: "Tag 1" }),
                                            e.jsx(b, { size: "compact", children: "Tag 2" }),
                                            e.jsx(b, { size: "compact", withRemoveButton: !0, children: "Removable" }),
                                        ],
                                    }),
                                }),
                                e.jsx(l, {
                                    label: "Pill with remove",
                                    children: e.jsxs(t, {
                                        gap: "xs",
                                        children: [
                                            e.jsx(b, { size: "compact", withRemoveButton: !0, children: "Node" }),
                                            e.jsx(b, { size: "compact", withRemoveButton: !0, children: "Edge" }),
                                            e.jsx(b, { size: "compact", withRemoveButton: !0, children: "Label" }),
                                        ],
                                    }),
                                }),
                            ],
                        }),
                    }),
                    e.jsx(u, {
                        title: "Real-world Example: Properties Panel",
                        children: e.jsxs(s, {
                            p: "sm",
                            style: {
                                backgroundColor: "var(--mantine-color-default-hover)",
                                borderRadius: "var(--mantine-radius-sm)",
                            },
                            children: [
                                e.jsx(a, { size: "xs", fw: 500, mb: "sm", children: "Node Properties" }),
                                e.jsxs(P, {
                                    gap: 8,
                                    children: [
                                        e.jsxs(s, {
                                            children: [
                                                e.jsx(a, { size: "xs", c: "dimmed", mb: 2, children: "Shape" }),
                                                e.jsxs(t, {
                                                    gap: 4,
                                                    grow: !0,
                                                    children: [
                                                        e.jsx(q, {
                                                            size: "compact",
                                                            data: [
                                                                {
                                                                    group: "Basic",
                                                                    items: [
                                                                        { value: "sphere", label: "Sphere" },
                                                                        { value: "cube", label: "Cube" },
                                                                    ],
                                                                },
                                                                {
                                                                    group: "Advanced",
                                                                    items: [
                                                                        { value: "torus", label: "Torus" },
                                                                        { value: "cone", label: "Cone" },
                                                                    ],
                                                                },
                                                            ],
                                                            rightSection: e.jsx(T, { size: 14 }),
                                                        }),
                                                        e.jsx(p, {
                                                            size: "compact",
                                                            value: 1,
                                                            min: 0.1,
                                                            max: 10,
                                                            step: 0.1,
                                                            decimalScale: 1,
                                                            hideControls: !0,
                                                        }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        e.jsx(g, { color: "dark.5" }),
                                        e.jsxs(s, {
                                            children: [
                                                e.jsx(a, { size: "xs", c: "dimmed", mb: 2, children: "Color Mode" }),
                                                e.jsx(U, {
                                                    size: "compact",
                                                    data: [
                                                        { value: "solid", label: "Solid" },
                                                        { value: "gradient", label: "Gradient" },
                                                        { value: "radial", label: "Radial" },
                                                    ],
                                                    fullWidth: !0,
                                                }),
                                            ],
                                        }),
                                        e.jsxs(s, {
                                            children: [
                                                e.jsx(a, { size: "xs", c: "dimmed", mb: 2, children: "Color" }),
                                                e.jsx(_, { defaultColor: "#5B8FF9" }),
                                            ],
                                        }),
                                        e.jsx(g, { color: "dark.5" }),
                                        e.jsxs(s, {
                                            children: [
                                                e.jsx(a, { size: "xs", c: "dimmed", mb: 2, children: "Visibility" }),
                                                e.jsxs(t, {
                                                    gap: "md",
                                                    children: [
                                                        e.jsx(E, {
                                                            size: "compact",
                                                            label: "Visible",
                                                            defaultChecked: !0,
                                                        }),
                                                        e.jsx(E, {
                                                            size: "compact",
                                                            label: "Selectable",
                                                            defaultChecked: !0,
                                                        }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        e.jsxs(s, {
                                            children: [
                                                e.jsx(a, { size: "xs", c: "dimmed", mb: 2, children: "Opacity" }),
                                                e.jsx(L, {
                                                    size: "compact",
                                                    value: 100,
                                                    min: 0,
                                                    max: 100,
                                                    label: (o) => `${o}%`,
                                                }),
                                            ],
                                        }),
                                        e.jsx(g, { color: "dark.5" }),
                                        e.jsxs(t, {
                                            gap: "xs",
                                            justify: "flex-end",
                                            children: [
                                                e.jsx(m, { size: "compact", variant: "subtle", children: "Reset" }),
                                                e.jsx(m, { size: "compact", children: "Apply" }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    }),
                    e.jsx(u, {
                        title: "Compact Size Specifications",
                        children: e.jsx(s, {
                            p: "sm",
                            style: {
                                backgroundColor: "var(--mantine-color-default)",
                                borderRadius: "var(--mantine-radius-sm)",
                                fontFamily: "monospace",
                                fontSize: "12px",
                            },
                            children: e.jsx(a, {
                                c: "dimmed",
                                component: "pre",
                                style: { margin: 0 },
                                children: `/* Input Components */
--input-size: 24px;
--input-fz: 11px;
--input-padding-x: 8px;

/* SegmentedControl */
--sc-font-size: 10px;
--sc-padding: 4px 8px;

/* Checkbox */
--checkbox-size: 16px;

/* Switch */
--switch-height: 16px;
--switch-width: 28px;
--switch-thumb-size: 12px;

/* Slider */
--slider-size: 4px;
--slider-thumb-size: 12px;

/* Button */
--button-height: 24px;
--button-fz: 11px;
--button-padding-x: 8px;

/* ActionIcon */
--ai-size: 24px;

/* Badge */
--badge-height: 14px;
--badge-fz: 9px;

/* Pill */
--pill-height: 16px;
--pill-fz: 10px;`,
                            }),
                        }),
                    }),
                ],
            }),
        }),
    });
}
function u({ title: r, children: d }) {
    return e.jsxs(s, { mb: "xl", children: [e.jsx(X, { order: 3, size: "h4", mb: "md", children: r }), d] });
}
function f({ children: r }) {
    return e.jsx(s, { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }, children: r });
}
function l({ label: r, children: d, fullWidth: x = !1 }) {
    return e.jsxs(s, {
        style: x ? { gridColumn: "1 / -1" } : void 0,
        children: [e.jsx(a, { size: "xs", c: "dimmed", mb: 4, children: r }), d],
    });
}
export { Fe as CompactComponentsDemo };
//# sourceMappingURL=CompactComponentsDemo-wG2lZ2da.js.map
