#!/usr/bin/env python3
"""Writes screens/results-panel.html (edit this, then run it from anywhere).

The Results rail place: every run of a measure, with its settings and date, newest first. A run is
named by the options that differ plus its date, never by how long it took. Opening a run shows its
record in the place itself (state line, Top nodes, options, its runs, Re-run, Compare with...); the
right panel stays the inspector of the selection, and a node's own values stay there. Runs start from
Results' "Run a measure...", the main menu's Algorithms, Quick actions and Ctrl+K.

Every number comes from kit/fixtures.json: ppi (300 proteins: betweenness in encodings.betweenness
and topByBetweenness, closeness and harmonic centrality in closeness, TP53 in inspector.tp53) and
citations (124,318 patents; the exact betweenness band, the sampled method and the kept set in
betweennessCost). The citation graph's other catalog bands follow screens/run-and-read.py.
"""
import json, math, os, re, subprocess

P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = json.load(open(os.path.join(P, "kit/fixtures.json")))
fx = FIX["datasets"]
ppi, cit = fx["ppi"], fx["citations"]
BC = ppi["encodings"]["betweenness"]
CL = ppi["closeness"]
COST = cit["betweennessCost"]
SAMPLED = next(s for s in COST["sampled"] if s["k"] == COST["largestKWithinBudget"])  # the run the options form offers
KSET = COST["keptSets"][0]
assert COST["exact"]["band"] == "hours" and not COST["exact"]["withinBudget"] and SAMPLED["withinBudget"]
assert ppi["stats"]["components"] == 3 and ppi["stats"]["isolated"] == 2 and CL["zeros"] == 2
CN = f'{cit["nodes"]:,}'
PN = f'{ppi["nodes"]:,}'
CAP = COST["budgetSeconds"]


def i(name, cls=""):
    return f'<svg class="k-i {cls}"><use href="../kit/icons.svg#{name}"/></svg>'


DIS, SELA, LCLOSED = ' aria-disabled="true"', ' aria-selected="true"', ' data-left="closed"'


def tipmark(tip, label, open_=False):
    """A small (i) in running text: its words are the tooltip (kit.js), drawn open with open_."""
    o = ' id="a-tipopen" aria-expanded="true"' if open_ else ""
    return f'<span class="rp-i" role="button" tabindex="0" aria-label="{label}" data-tip="{tip}"{o}>{i("info", "k-i-sm")}</span>'


EXACT_TIP = "Computed on every node, not estimated. It does not say the ranking is meaningful."
exact = lambda open_=False: "Exact" + tipmark(EXACT_TIP, "What Exact means", open_)
EXACT = exact()
FUNNEL = f'<span class="rp-fm" role="img" aria-label="on: filtered graph" data-tip="on: filtered graph">{i("funnel", "k-i-sm")}</span>'
sec = lambda s: f'<span class="k-secondary">{s}</span>'
band = lambda w: f'<span class="rp-band">{w}</span>'
CARET = i("chevron-down", "k-i-sm k-caret")

# The weight, in the three states the round-3 wording decided (content-design; message-catalog, proposed keys).
W_NOT_YET = lambda col: f"Weight: {col}, not used yet. <a class=\"rp-link\">Change...</a>"
W_USED = lambda col, meaning: f"Weight: {col}, used as {meaning}. <a class=\"rp-link\">Change...</a>"
W_NONE = "Weight: no numeric edge column"


# ---------------------------------------------------------------- the frame: rail and Graph panel
def rail(menu_open=False, on="Results"):
    b = lambda icon, word, attrs="": (
        f'<div class="k-rail-btn" role="button"{attrs}><span class="k-rail-pill">{i(icon)}</span>{word}</div>'
    )
    p = lambda w: f' aria-pressed="{str(w == on).lower()}"'
    return (
        '<nav class="k-rail" aria-label="Main">'
        + b("menu", "", ' aria-label="Main menu"' + (' aria-expanded="true" aria-pressed="true"' if menu_open else ""))
        + '<div class="k-rail-sep"></div>'
        + b("network", "Graph", p("Graph")) + b("database", "Data", p("Data"))
        + b("flask-conical", "Results", p("Results") + ' title="Results: every run of a measure, with its settings and date"')
        + b("sticky-note", "Notes", p("Notes"))
        + '<div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>'
        + "</nav>"
    )


def panel_head(project, chip="Full graph"):
    return (
        '<div class="k-panel-head"><div class="k-title-line">'
        f'<span class="k-project">{project}</span>{i("chevron-down", "k-i-sm k-secondary")}</div>'
        f'<a class="k-privacy">Nothing has been sent from this project</a>'
        f'<span class="k-chip k-chip-btn" role="button" aria-expanded="false"><span class="k-num">{chip}</span>{CARET}</span></div>'
    )


# ---------------------------------------------------------------- the catalog (main menu > Algorithms, Quick actions)
FAMILIES = [
    ("Centrality", ["Betweenness", "Closeness", "Eigenvector", "Harmonic centrality", "HITS", "Katz", "PageRank"]),
    ("Community", ["Girvan-Newman", "Label propagation", "Leiden", "Louvain"]),
    ("Path", ["All-pairs distance", "Breadth-first search", "Depth-first search", "Shortest path"]),
    ("Structure", ["K-core", "Maximum bipartite matching", "Minimum spanning tree", "Topological sort"]),
    ("Flow", ["Maximum flow", "Minimum cut"]),
    ("Prediction", ["Link prediction"]),
]
VARIANT = '<span class="rp-variant" data-tip="Wasserman-Faust corrected: scores are scaled by how much of the graph each node reaches">WF-corrected</span>'
PRECOND = '<span class="rp-pre"><span class="k-warn-glyph">!</span>3 components</span>'
PPI_MARKS = {"Closeness": VARIANT, "Eigenvector": PRECOND, "Topological sort": "needs direction"}
CIT_BANDS = {
    "Betweenness": COST["exact"]["band"], "Closeness": "hours", "Eigenvector": "under a minute", "Harmonic centrality": "hours",
    "HITS": "under a minute", "Katz": "under a minute", "PageRank": "under a minute", "Girvan-Newman": "over a day",
    "Leiden": "under a minute", "Louvain": "under a minute", "All-pairs distance": "over a day", "K-core": "under a minute",
    "Minimum spanning tree": "under a minute", "Link prediction": "a few minutes",
}
ARGS = {"Shortest path": "two nodes...", "Maximum flow": "source and sink...", "Minimum cut": "source and sink..."}


HOVER_ALG = ' data-hover id="a-alg"'


def main_menu():
    items = [("Quick actions...", "Ctrl+K"), ("File", ">"), ("Edit", ">"), ("View", ">"), ("Selection", ">"), ("Algorithms", ">"), ("Recipes", ">"), ("Preferences", ">"), ("Help", ">")]
    m = "".join(
        f'<div class="k-menu-item"{HOVER_ALG if n == "Algorithms" else ""}><span class="k-check-col"></span>{n}'
        + (f'<span class="k-shortcut">{i("chevron-right", "k-i-sm")}</span>' if k == ">" else f'<span class="k-shortcut">{k}</span>') + "</div>"
        + ('<div class="k-menu-sep"></div>' if n == "Quick actions..." else "")
        for n, k in items
    )
    sub = ""
    for fam, names in FAMILIES:
        sub += f'<div class="k-menu-label">{fam}</div>'
        for n in names:
            mark = PPI_MARKS.get(n, "") or (f'<span class="rp-arg">{ARGS[n]}</span>' if n in ARGS else "")
            off = ' aria-disabled="true"' if n == "Topological sort" else ""
            hover = " data-hover" if n == "Betweenness" else ""
            sub += f'<div class="k-menu-item"{off}{hover}><span class="k-check-col"></span>{n}<span class="k-shortcut">{mark}</span></div>'
    return (
        f'<div class="k-menu rp-mainmenu" role="menu" aria-label="Main menu">{m}</div>'
        f'<div class="k-menu rp-algmenu" role="menu" aria-label="Algorithms">{sub}</div>'
    )


def quick(query, rows, head):
    r = "".join(
        f'<div class="k-result"{SELA if k == 0 else ""}>{i("flask-conical")}<span class="k-grow">{n}</span>{band(b)}</div>'
        for k, (n, b) in enumerate(rows)
    )
    return (
        f'<div class="k-quick rp-quick" role="dialog" aria-label="Quick actions"><div class="k-quick-input">{i("search")}{query}<span class="k-grow"></span><span class="k-kbd">Esc</span></div>'
        f'<div class="k-quick-list" role="listbox" aria-label="Quick actions results"><div class="k-group-head">{head}</div>{r}</div>'
        '<div class="rp-qkeys"><span><span class="k-kbd">Enter</span>Run</span><span><span class="k-kbd">Esc</span>Close</span></div></div>'
    )


# ---------------------------------------------------------------- canvas
TOOLBAR = (
    '<div class="k-toolbar" role="toolbar">'
    f'<span class="k-tool" aria-pressed="true" aria-label="Select">{i("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">{i("chevron-down", "k-i-sm")}</span>'
    f'<span class="k-tool" aria-label="Path">{i("route", "k-i-lg")}</span><span class="k-toolbar-sep"></span>'
    f'<span class="k-tool" aria-label="Quick actions">{i("zap", "k-i-lg")}</span><span class="k-toolbar-sep"></span>'
    f'<span class="k-tool" aria-label="View mode">{i("square", "k-i-lg")}</span><span class="k-tool-caret">{i("chevron-down", "k-i-sm")}</span></div>'
)
HELP = f'<span class="k-help">{i("circle-help")}</span>'


def canvas_cit(extra=""):
    card = (
        '<div class="k-legend-card"><div class="k-notdrawn" style="border:0;margin:0;padding:0">'
        f'<span class="k-num">{CN}</span> nodes not drawn: more than this browser draws at once (<span class="k-num">{cit["drawingLimit"]:,}</span>). <a>Narrow the graph...</a></div></div>'
    )
    return f'<div class="k-canvas">{card}{extra}<div class="k-toolbar-dock">{TOOLBAR}</div>{HELP}</div>'


def ramp_legend(title, attr, ticks, note):
    grad = ", ".join(BC["palette"])
    t = "".join(f'<span style="left:{at:.1f}%">{v}</span>' for v, at in ticks)
    marks = "".join(
        f'<div><b style="width:{w}px;height:{w}px"></b>{b["from"]} to {b["to"]}</div>'
        for b, w in zip(ppi["encodings"]["sizeByDegree"]["bins"], [6, 9, 12, 16, 21])
    )
    return (
        f'<div class="k-legend-card" style="width:236px"><div class="k-lg-title">{title} <span class="k-secondary">{attr}</span></div>'
        f'<span class="k-ramp k-ramp-wide" style="margin-top:4px;background:linear-gradient(90deg,{grad})"></span>'
        f'<div class="rp-ticks k-num">{t}</div><div class="k-secondary">{note}</div>'
        f'<div class="k-lg-title" style="margin-top:8px">Size: degree <span class="k-secondary">degree</span></div>'
        f'<div class="k-size-marks rp-size">{marks}</div></div>'
    )


BC_LEGEND = ramp_legend(
    "Betweenness color", "betweenness",
    [(0, 0)] + [(t["value"], t["at"] * 100) for t in BC["ticks"]],
    f'Log scale; the {BC["zeros"]} proteins at 0 take the lightest color.',
)
CL_LEGEND = ramp_legend(
    "Closeness (WF-corrected) color", "closeness",
    [(0, 0), (round(CL["domain"][1] / 2, 3), 50), (CL["domain"][1], 100)],
    f'Linear; the {CL["zeros"]} isolated proteins at 0 take the lightest color.',
)


def canvas_ppi(drawing="plain", alt="300 proteins, unstyled", legend="", extra=""):
    return (
        f'<div class="k-canvas"><div class="k-stage"><img class="k-light-only" src="../kit/canvas/ppi-{drawing}-light.svg" alt="{alt}">'
        f'<img class="k-dark-only" src="../kit/canvas/ppi-{drawing}-dark.svg" alt="{alt}">{extra}</div>{legend}'
        f'<div class="k-toolbar-dock">{TOOLBAR}</div>{HELP}</div>'
    )


# ---------------------------------------------------------------- the inspector
HEAD2 = f'<div class="k-header2"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%{i("chevron-down", "k-i-sm")}</span></div>'
RAMP_CHIP = f'<span class="k-ramp" style="width:16px;background:linear-gradient(90deg,{", ".join(BC["palette"])})"></span>'
SIZE_CHIP = '<svg class="k-sizechip" viewBox="0 0 16 12" aria-hidden="true"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg>'
STACK = lambda cols: '<span class="k-stack">' + "".join(f'<span class="k-chit" style="background:{c}"></span>' for c in cols) + "</span>"


def overview(metrics, rows):
    m = "".join(f'<div class="k-metric"><span class="k-secondary">{k}</span><span class="k-big k-num">{v}</span></div>' for k, v in metrics)
    r = "".join(f'<div class="rp-prose"><span class="k-secondary">{k}</span> {v}</div>' for k, v in rows)
    return f'<section class="k-section"><div class="k-section-head">Overview</div><div class="k-metrics">{m}</div>{r}</section>'


def style_stack(layers, wins=None, off=()):
    """layers: (chip, name) top first. wins: {name: property} marks the rows that paint the selection (Appearance)."""
    title = "Appearance" if wins is not None else "Style stack"
    head = (
        f'<div class="k-section-head">{title}<span class="k-grow"></span>'
        + ("" if wins is not None else f'<span class="k-secondary rp-looklbl">Look</span><span class="k-btn k-btn-ghost rp-look">Screen{i("chevron-down", "k-i-sm")}</span>')
        + f'<span class="k-icon-btn" aria-label="Add a style layer">{i("plus")}</span></div>'
    )
    if not layers:
        return f'<section class="k-section" data-empty>{head}</section>'
    rows = ""
    for chip, name in layers:
        w = (wins or {}).get(name)
        rows += (
            f'<li class="k-item rp-layer" role="treeitem"{" data-member" if w else ""}{" data-off" if name in off else ""}>{i("grip-vertical", "k-i-sm k-tertiary rp-grip")}{chip}'
            f'<span class="k-ellipsis">{name}</span><span class="k-trail">{f"<span class=k-kind>{w}</span>" if w else ""}'
            f'<span class="k-icon-btn" aria-label="{"Show" if name in off else "Hide"} {name}">{i("eye-off" if name in off else "eye")}</span></span></li>'
        )
    return f'<section class="k-section">{head}<ul class="k-list" role="tree" aria-label="{title}">{rows}</ul><div class="rp-topwins k-secondary">Top wins</div></section>'


RN = lambda *parts: ", ".join(p for p in parts if p)  # a run's name: the measure, the options that differ, the date


def row(name, icon="sigma", trail="", sel=False, focus=False, line="", rid="", hover=False):
    a = (' aria-selected="true"' if sel else "") + (f' id="{rid}"' if rid else "") + (" data-hover" if hover else "")
    return (
        f'<li class="k-item rp-runitem{" rp-focus" if focus else ""}" role="treeitem"{a}>{i(icon)}<span class="rp-runname">{name}</span>'
        f'<span class="k-trail">{trail}</span></li>' + (f'<li class="rp-line" role="none">{line}</li>' if line else "")
    )


def needs(rows, hid="", review=False):
    rv = '<span class="k-grow"></span><span class="k-btn k-btn-ghost rp-focus">Review out of date</span>' if review else ""
    return (
        f'<div class="rp-strip"><div class="rp-striphead"{f" id={chr(34)}{hid}{chr(34)}" if hid else ""}>Needs action <span class="k-count k-num">{len(rows)}</span>{rv}</div>'
        f'<ul class="k-list" role="tree" aria-label="Needs action">{"".join(rows)}</ul></div>'
    )


PLACE_TITLE = (
    f'<div class="rp-placehead"><span class="rp-placename">Results</span><span class="k-grow"></span>'
    f'<span class="k-btn k-btn-ghost rp-runbtn">{i("plus", "k-i-sm")}Run a measure...</span></div>'
    '<div class="rp-placeline k-secondary">Every run of a measure, with its settings and date.</div>'
)


def place(project, rows, strip="", chip="Full graph"):
    """The Results rail place, its list: every run, newest first, anything failed or out of date pinned on top."""
    n = sum(r.count('role="treeitem"') for r in rows)
    return (
        f'<aside class="k-panel" aria-label="Results">{panel_head(project, chip)}{PLACE_TITLE}<div class="k-scroll">{strip}'
        f'<section class="k-section"><div class="k-section-head">Runs <span class="k-count k-num">{n}</span><span class="k-grow"></span>'
        f'<span class="k-secondary rp-order">newest first</span></div>'
        f'<ul class="k-list" role="tree" aria-label="Runs">{"".join(rows)}</ul></section></div></aside>'
    )


def gi(graph, metrics, rows, layers, off=()):
    """The graph inspector with nothing selected: Overview and Style stack (runs live on the Results place)."""
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEAD2}'
        f'<div class="k-typerow">{i("network")}<span class="k-name k-ellipsis">{graph}</span><span class="k-secondary">Graph</span></div>'
        f'<div class="k-scroll">{overview(metrics, rows)}{style_stack(layers, off=off)}</div></aside>'
    )


CIT_METRICS = [("nodes", CN), ("edges", f'{cit["edges"]:,}'), ("density", "0.000096"), ("average degree", cit["stats"]["averageDegree"])]
CIT_ROWS = [("edges", "directed; no numeric edge column")]
PPI_METRICS = [("nodes", PN), ("edges", f'{ppi["edges"]:,}'), ("components", ppi["stats"]["components"]), ("average degree", ppi["stats"]["averageDegree"])]
PPI_ROWS = lambda w="confidence, not used yet": [("edges", f"undirected; {w}")]
BC_LAYERS = [(RAMP_CHIP, "Betweenness color"), (SIZE_CHIP, "Size: degree")]
GI_CIT = gi("Citations 1999 to 2001", CIT_METRICS, CIT_ROWS, [])
GI_PPI = lambda layers=(), w="confidence, not used yet": gi("Interactions", PPI_METRICS, PPI_ROWS(w), list(layers))
PLACE_CIT = lambda rows, strip="": place("Patent citations", rows, strip)
PLACE_PPI = lambda rows, strip="": place("Human protein interactions", rows, strip)


def ri(name, btn="", body="", icon="sigma", project="Patent citations", chip="Full graph"):
    """An opened run, in the Results place: back to the list, its name, the one run command, then its record."""
    return (
        f'<aside class="k-panel" aria-label="Results">{panel_head(project, chip)}'
        f'<div class="rp-restype"><span class="k-icon-btn" aria-label="All results (Esc)">{i("chevron-left")}</span>{i(icon)}'
        f'<span class="rp-runname k-strong" title="{name}">{name}</span></div>'
        f'<div class="k-scroll">{with_cmd(body, btn)}</div></aside>'
    )


RI_PPI = lambda name, btn="", body="", icon="sigma": ri(name, btn, body, icon, "Human protein interactions")


def with_cmd(body, btn):
    """The run command sits at the head of the state line; a body with no state line (a refusal) puts it under the routes."""
    if not btn:
        return body
    if '<div class="rp-stateline">' in body:
        return body.replace('<div class="rp-stateline">', f'<div class="rp-stateline"><span class="rp-cmd">{btn}</span>', 1)
    return body.replace('<div class="rp-subhead rp-empty">Notes', f'<div class="rp-cmdrow">{btn}</div><div class="rp-subhead rp-empty">Notes', 1)


BTN = lambda t, kind="", disabled=False, focus=False: (
    f'<span class="k-btn{" " + kind if kind else ""}{" rp-focus" if focus else ""}"{DIS if disabled else ""}>{t}</span>'
)
stateline = lambda *lines: '<div class="rp-stateline">' + "<br>".join(lines) + "</div>"
subhead = lambda t, extra="", sid="": f'<div class="rp-subhead"{f" id={chr(34)}{sid}{chr(34)}" if sid else ""}>{t}{extra}</div>'


def datarow(name, value):
    return f'<div class="k-data"><span class="k-name">{name}</span><span class="k-value k-num">{value}</span></div>'


EXPANDED = ' aria-expanded="true"'


def options(rows, oid="a-opt", open_=False):
    """The run's options, read-only in the inspector; the sliders button opens the result editor popover."""
    btn = f'<span class="k-grow"></span><span class="k-icon-btn{" rp-focus" if open_ else ""}" aria-label="Edit options"{EXPANDED if open_ else ""}>{i("sliders-horizontal")}</span>'
    return subhead("Options", btn, oid) + "".join(datarow(k, v) for k, v in rows)


def runs(items):
    """items: (label, options-and-date, state). A run is named by the options that differ and its date, never
    by how long it took; the run whose values are shown says 'shown'."""
    r = "".join(
        f'<div class="k-data rp-run"><span class="k-name" style="color:var(--cm-text);flex:none">{lab}</span><span class="k-value rp-wrapval">{det}{" " + sec(st) if st else ""}</span></div>'
        for lab, det, st in items
    )
    return subhead("Runs of this measure", f' <span class="k-secondary k-num">{len(items)}</span>') + r


CMP_VERB = f'<div class="k-row rp-verb" role="button" aria-haspopup="menu">{i("git-compare-arrows", "k-secondary")}<span class="k-grow">Compare with...</span></div>'


def appearance(layer="", chip="", mode="shown"):
    """mode: shown (the layer paints), offer (nothing painted yet: Show as style layer), pending (not run), off (layer kept, eye closed)."""
    if mode == "pending":
        return subhead("Appearance") + f'<div class="rp-prose k-secondary">Show as style layer is available once it has run.</div>'
    if mode == "offer":
        return subhead("Appearance") + f'<div class="k-row rp-verb rp-focus" role="button">{i("layers", "k-secondary")}<span class="k-grow">Show as style layer</span></div>'
    chip = chip or RAMP_CHIP
    off = mode == "off"
    return (
        subhead("Appearance")
        + f'<div class="k-row{" rp-off" if off else ""}">{chip}<span class="k-grow k-ellipsis">{layer}</span>{"<span class=k-kind>not shown</span>" if off else ""}'
        f'<span class="k-icon-btn" aria-label="{"Show" if off else "Hide"} {layer}">{i("eye-off" if off else "eye")}</span></div>'
    )


def tail(used="", compare=None):
    u = f'<div class="k-row">{i("layers", "k-secondary")}<span class="k-grow k-ellipsis">{used}</span></div>' if used else '<div class="rp-prose k-secondary">Nothing uses it yet.</div>'
    return (
        f'<div class="rp-subhead rp-empty">Notes<span class="k-grow"></span><span class="k-icon-btn" aria-label="Add note...">{i("plus")}</span></div>'
        + subhead("Used by") + u
    )


# ---------------------------------------------------------------- the result editor popover (options only)
RUNLINE = lambda: f'<div class="rp-runline">{i("clock", "k-i-sm")}Options wait for Run</div>'


def field(label, value, select=True, placeholder=False, changed=False, error="", fid=""):
    mark = '<span class="rp-changed" title="Changed; waits for Run"></span>' if changed else ""
    attrs = (" data-placeholder" if placeholder else "") + (" data-error data-focus" if error else "")
    cls = "k-field k-span" if select else "k-field k-num"
    under = f'<div class="rp-under k-danger">{error}</div>' if error else ""
    f_id = f' id="{fid}"' if fid else ""
    return (
        f'<div class="k-fieldrow"{f_id}><span class="k-legend">{mark}{label}</span><div class="k-fields">'
        f'<span class="{cls}"{attrs}>{value}{CARET if select else ""}</span></div>{under}</div>'
    )


def editor(anchor, title, body):
    return (
        f'<div class="k-popover rp-pop" data-anchor="#{anchor}" role="dialog" aria-label="{title} options"><div class="k-popover-head"><span class="k-ellipsis">{title} options</span><span class="k-grow"></span>'
        f'<span class="k-icon-btn" aria-label="Close options">{i("x")}</span></div><div class="k-popover-body">{RUNLINE()}{body}</div></div>'
    )


# ---------------------------------------------------------------- readings
def hist(counts, on, axis):
    # Square-root heights, so a bin of 1 and a bin of 4 differ; empty bins draw nothing.
    top = math.sqrt(max(counts))
    bars = "".join(
        f'<i{" data-on" if k == on else ""} style="height:{max(6, round(math.sqrt(c) / top * 100)) if c else 0}%{";min-height:0" if not c else ""}" title="{c}"></i>'
        for k, c in enumerate(counts)
    )
    a = "".join(f"<span>{x}</span>" for x in axis)
    return f'<div class="k-hist rp-hist">{bars}</div><div class="rp-axis k-num">{a}</div><div class="rp-axis-note">bar height: square root of the count</div>'


def shared_ranks(values):
    """Competition ranks: equal values share a rank and carry '=' ('3=', '3=', then 5)."""
    return [f'{1 + sum(w > v for w in values)}{"=" if values.count(v) > 1 else ""}' for v in values]


def rank_ranges(values, eps):
    """A sampled run's rank range from its own error bound: every rank the value could hold."""
    out = []
    for v in values:
        lo = 1 + sum(round(w - eps, 9) > round(v + eps, 9) for w in values)
        hi = sum(round(w + eps, 9) >= round(v - eps, 9) for w in values)
        out.append(f"#{lo}" if lo == hi else f"#{lo}-#{hi}")
    return out


# ponytail: the near-tie line needs the element to report it; 1% is this mock's stand-in for the element's rule
# (proposed in framework-changes.md, not decided here).
TIE_REL = 0.01


def near_ties(vals):
    """An exact run's near-ties in words, with the threshold stated (round 3: "no near-ties" is retired)."""
    up = lambda g: (lambda e: math.ceil(round(g / 10 ** e, 6)) * 10 ** e)(math.floor(math.log10(g)))
    pct = lambda x: f"{round(x, 6):g}%"
    gaps = [((a - b) / a * 100, k + 1) for k, (a, b) in enumerate(zip(vals, vals[1:])) if a > 0 and a != b]
    close = [f"Ranks {r} and {r + 1} differ by less than {pct(up(g))}, under the {pct(TIE_REL * 100)} tie line; treat them as tied." for g, r in gaps if g < TIE_REL * 100]
    if close:
        return " ".join(close)
    g, r = min(gaps)
    return f"Every step in the top {len(vals)} is over the {pct(TIE_REL * 100)} tie line; the smallest, ranks {r} and {r + 1}, is {pct(round(g, 1))}."


assert near_ties([0.4463, 0.4257, 0.4086, 0.408, 0.403]) == "Ranks 3 and 4 differ by less than 0.2%, under the 1% tie line; treat them as tied."
assert near_ties([0.1379, 0.1139, 0.0695, 0.0687, 0.0642]).startswith("Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%")


def top_nodes(items, more, measure, ranks=None, fmt=lambda v: f"{v:.4f}", after="", focus=False, rank_w=16, head=""):
    if ranks is None:  # exact: equal values share a rank, and near-ties are said in words
        after = f'<div class="rp-prose rp-stable" data-tie>{near_ties([x["value"] for x in items])}</div>' + after
    ranks = ranks or shared_ranks([x["value"] for x in items])
    rows = "".join(
        f'<div class="k-data"><span class="k-num" style="width:{rank_w}px;flex:none;color:var(--cm-text)">{r}</span><span class="k-name k-id" style="color:var(--cm-text)">{x["id"]}</span><span class="k-value k-num">{fmt(x["value"])}</span></div>'
        for r, x in zip(ranks, items)
    )
    link = (f'<div class="k-row rp-verb{" rp-focus" if focus else ""}" role="link" data-tip="Opens the Nodes tab, sorted by {measure}">'
            f'{i("table", "k-secondary")}<span class="k-grow rp-link">{more:,} more in the table</span></div>')
    return subhead("Top nodes") + head + rows + after + link


def bin_of(v, hi, n=12):
    return min(n - 1, int(v / hi * n))


BC_TOP = [{"id": r["id"], "value": r["betweenness"]} for r in ppi["topByBetweenness"][:5]]
TP = ppi["inspector"]["tp53"]
TP53_BC = next(r["betweenness"] for r in ppi["topByBetweenness"] if r["id"] == "TP53")
bc_readings = lambda focus=False: (
    top_nodes(BC_TOP, ppi["nodes"] - 5, "betweenness", focus=focus)
    + subhead("Distribution", f' <span class="k-secondary">{PN} nodes</span>')
    + hist(BC["histogram12"], bin_of(TP53_BC, BC["domain"][1]), [0, round(BC["domain"][1] / 2, 3), BC["domain"][1]])
    + datarow("middle", f'{BC["median"]:.4f}') + datarow("highest", f'{BC["domain"][1]:.3f}') + datarow("zero", f'{BC["zeros"]} nodes, all {ppi["nodes"] - BC["zeros"] + 1}=')
)
BC_READINGS = bc_readings()
CL_READINGS = (
    top_nodes(CL["top"], ppi["nodes"] - 5, "closeness (WF-corrected)")
    + subhead("Distribution", f' <span class="k-secondary">{PN} nodes</span>')
    + hist(CL["histogram12"], bin_of(CL["tp53"]["closeness"], CL["domain"][1]), [0, round(CL["domain"][1] / 2, 3), CL["domain"][1]])
    + datarow("middle", f'{CL["median"]:.4f}') + datarow("highest", f'{CL["domain"][1]:.4f}') + datarow("zero", f'{CL["zeros"]} isolated, both {ppi["nodes"] - CL["zeros"] + 1}=')
)


def record(anchor, title, rows):
    """The Details record: a light popover beside the inspector, anchored to the Details link."""
    dl = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in rows)
    return (
        f'<div class="rp-info rp-rec" data-anchor="#{anchor}" role="dialog" aria-label="Run record: {title}">'
        f'<div class="rp-rec-head"><b>Run record</b><span class="k-secondary k-ellipsis">{title}</span><span class="k-grow"></span>'
        f'<span class="k-btn k-btn-ghost">Copy</span><span class="k-icon-btn" aria-label="Close the run record">{i("x")}</span></div>'
        f"<dl>{dl}</dl></div>"
    )


NO_DAMP = '<span class="k-secondary">Does not apply</span>'
DETAILS = lambda rid="", focus=False: f' <a class="rp-link{" rp-focus" if focus else ""}"{f" id={chr(34)}{rid}{chr(34)}" if rid else ""}>Details</a>'


# ---------------------------------------------------------------- shared rows (the Results place)
# When each run happened, in the story every state shares (one working day). A run's name carries its
# date, never how long it took; the duration is in its run record.
NB = lambda d: d.replace(" ", "&nbsp;")  # a date never breaks across lines
T = dict(
    wcc="Sep 28 09:40", sb="Sep 28 09:52", pr1="Sep 28 10:14", pr2="Sep 28 10:21",
    cc="Sep 28 09:05", bt="Sep 28 09:12", cl="Sep 28 09:20", lv="Sep 28 09:31", sp="Sep 28 09:40", lm="Sep 28 11:02",
)
T = {k: NB(v) for k, v in T.items()}
SB_NAME = RN("Betweenness (sampled)", f'{cit["sampledBetweenness"]["k"]} sources', T["sb"])
PR1_NAME, PR2_NAME = RN("PageRank", "damping 0.85", T["pr1"]), RN("PageRank", "damping 0.5", T["pr2"])
BT_NAME, CL_NAME = RN("Betweenness", T["bt"]), RN("Closeness (WF-corrected)", T["cl"])
LV_NAME, SP_NAME = RN("Louvain", T["lv"]), RN(f'Shortest path TP53 to {ppi["encodings"]["path"]["to"]}', T["sp"])
WCC = row(RN("Weakly connected components", T["wcc"]), "group", f'<span class="k-num k-secondary">{cit["stats"]["components"]:,}</span>')
CC = row(RN("Connected components", T["cc"]), "group", '<span class="k-num k-secondary">3</span>')
SAMPLED_ROW = row(SB_NAME)
PR1_ROW = row(PR1_NAME)
CANCEL_X = lambda n: f'<span class="k-icon-btn" aria-label="Cancel {n}">{i("x")}</span>'
PROG = lambda pct, text: f'<div class="k-progress"><i style="width:{pct}%"></i></div><span class="k-secondary">{text}</span>'
RERUN = lambda n=1, disabled=False, kind="k-btn-secondary": BTN(f"Re-run (keeps Run {n})", kind, disabled=disabled)
PR_SCOPE = f"on: full graph, {CN} nodes. {EXACT}. Directed."
PR_FIELDS = lambda damping="0.85", changed=False, error="": (
    field("Scope", "Full graph") + field("Direction", "Along edges") + field("Weight", "No numeric edge column", placeholder=True)
    + field("Damping", damping, select=False, changed=changed, error=error)
)
PR_OPTS = lambda damping="0.85", open_=False: options([("Scope", "Full graph"), ("Direction", "Along edges"), ("Damping", damping)], open_=open_)
HELD = (
    '<div class="rp-held"><div>Damping 0.7 has not run. Run queues it after this run, and keeps Run 1.</div>'
    f'<div class="rp-held-cmds"><span class="k-btn">Run</span>{band("under a minute")}<span class="k-grow"></span><span class="k-btn k-btn-ghost">Reset</span></div></div>'
)
TOAST_RUNNING = (
    f'<div class="k-toast">{i("loader-circle")}Running PageRank<div class="k-progress"><i style="width:62%"></i></div>'
    '<span style="color:var(--k-menu-ink2)">under a minute</span><span class="k-toast-action">Cancel</span></div>'
)


# ---------------------------------------------------------------- the frames
F = []


def frame(fid, title, app, overlays, spoken, notes, alias=""):
    F.append(dict(id=fid, title=title, app=app, overlays=overlays, spoken=spoken, notes=notes, alias=alias))


def cm(s):
    return f' <span class="rp-cm">compact-mantine: {s}</span>'


MAIN = lambda canvas: f'<main class="k-main">{canvas}</main>'
ONE_HOME = ("<b>One home for runs.</b> Results is a rail place between Data and Notes: every run of a measure, with its settings and date. "
            "In the two-arm tree test the rail won: people found a run's setup directly when the run opened in its own place. A node's values stay on the node, in the inspector and the table.")

# 1. The catalog, from the main menu
frame(
    "catalog", "The catalog: main menu, Algorithms, with its marks before any run",
    rail(menu_open=True) + PLACE_PPI([CC]) + MAIN(canvas_ppi()) + GI_PPI(),
    main_menu(),
    '"Algorithms, menu. Centrality. Betweenness." Arrow keys move; Enter starts the run and opens it in Results. On Closeness: "Closeness, WF-corrected." On Eigenvector: "Eigenvector, warning, 3 components." On Topological sort: "Topological sort, unavailable, needs direction."',
    [
        "<b>Three ways in, one list</b>: Results' own 'Run a measure...', the main menu's Algorithms (drawn here) and Quick actions (Ctrl+K) open the same catalog, read from graphty-element. A run started anywhere lands in the Results place, newest first." + cm("Menu (dark) with a submenu"),
        "<b>The catalog keeps its marks</b>: the element's six families as labels, names alphabetical; the variant word on Closeness, the precondition on Eigenvector ('3 components'), Topological sort disabled with its reason, and the argument an entry needs ('two nodes...'). No cost word here: everything on 300 proteins is under 10 s." + cm("Menu.Item with a right section"),
        "<b>Before anything runs</b>, Results holds only the standing partition the element computes when the file opens, named like every run: 'Connected components, Sep 28 09:05'. The inspector with nothing selected has Overview and Style stack, and no Results section.",
        ONE_HOME,
    ],
    alias="new-project",
)

# 2. Quick actions, with cost words
CENT = ["Betweenness", "Closeness", "Eigenvector", "Harmonic centrality", "HITS", "Katz", "PageRank"]
frame(
    "quick-actions", "Quick actions: the same catalog, each entry with its cost word",
    rail() + PLACE_CIT([SAMPLED_ROW, WCC]) + MAIN(canvas_cit(quick("centrality", [(n, CIT_BANDS[n]) for n in CENT], "Algorithms &middot; Centrality"))) + GI_CIT,
    "",
    f'"Quick actions. centrality. 7 results. Betweenness, hours." Enter on Betweenness asks the element to run it; past its {CAP}-second limit the element does not run it and offers routes (state 8).',
    [
        "<b>Cost words on the entry, before the click</b>: on 124,318 patents the element's estimate puts Betweenness, Closeness and Harmonic centrality at hours; the rest are under a minute. The words are the element's bands, read from its cost model, never computed by the app." + cm("QuickActions with ResultRow"),
        "<b>Quick actions is the keyboard route and Ctrl+K opens it</b>; the toolbar's lightning tool opens the same list. Catalog entries follow commands and recents in one list.",
        f"<b>What already ran stays in view</b> on the left, each run named by its setting and date: '{SB_NAME}'. The reader can see it before starting another.",
    ],
)

# 3. Running, seen from the list
PR_RUN_ROW = row(PR2_NAME, trail=CANCEL_X("PageRank"), rid="a-pr", line=PROG(62, "Running on WebGPU, under a minute. Keeps Run 1."))
frame(
    "running", "Running: the new run heads the list, with its progress and Cancel",
    rail() + PLACE_CIT([PR_RUN_ROW, PR1_ROW, SAMPLED_ROW, WCC]) + MAIN(canvas_cit()) + GI_CIT,
    "",
    '"Running PageRank, damping 0.5, on WebGPU, under a minute." Spoken when it starts, then at most every 10 s. Cancel PageRank is the row\'s trailing button.',
    [
        "<b>The row carries the run</b>: progress, engine and band on its second line, Cancel in its trailing slot the whole time. Newest first." + cm("ActionRow with busy and a determinate progress variant to file"),
        "<b>A second run is a new row, never an overwrite</b>: Run 1 ('PageRank, damping 0.85') stays listed and readable under it, and the running line says so. Both are named by the one option that differs.",
        "<b>No running notice while this row is in view.</b> The notice shows only when Results is closed or scrolled away, and carries the same progress and Cancel." + cm("Toast"),
        "<b>Nothing is drawn</b>: the patents are past the drawing limit, so the Style stack is empty and the legend corner says why.",
    ],
    alias="running-closed",
)

# 4. Running, the run opened
frame(
    "running-result", "Running, opened: Cancel beside its state line, an edit held for the next run",
    rail() + ri(PR1_NAME, BTN("Cancel", "k-btn-secondary"),
        stateline("Run 2 running on WebGPU, under a minute" + '<div class="k-progress" style="margin:6px 0 4px"><i style="width:62%"></i></div>', sec(PR_SCOPE), W_NONE)
        + PR_OPTS("0.85", open_=True) + runs([("Run 2", f'damping 0.5, {T["pr2"]}', "running, 62%"), ("Run 1", f'damping 0.85, {T["pr1"]}', "shown")])
        + CMP_VERB + tail("")) + MAIN(canvas_cit()) + GI_CIT,
    editor("a-opt", "PageRank", PR_FIELDS("0.7", changed=True) + HELD),
    '"PageRank, damping 0.85, Sep 28 10:14. Run 2 running on WebGPU, under a minute. Cancel, button." In the options popover, on Damping: "Damping, 0.7, changed, waits for Run."',
    [
        "<b>An opened run shows its record in the place</b>: the back arrow (or Esc) returns to the list; the heading is the run's name, the state line holds its one run command (Cancel while it runs), then the weight used, its options, the runs of this measure, Compare with... and Show as style layer. The right panel stays the inspector of whatever is selected." + cm("ControlSection; Button beside the state line"),
        "<b>Options are read here and edited in a popover</b> beside the panel, as every definition is. It keeps the Run line: 'Options wait for Run'." + cm("PopoutPanel anchored to the panel"),
        "<b>The held edit is marked</b>, and the box under the options offers Run (queued after this run, with its band) or Reset. Run 1's values stay the ones shown until Run 2 lands: the runs list says which run is shown.",
        "<b>The weight in its third state</b>: the patents have no numeric edge column, and the state line says so.",
    ],
)

# 5. After Cancel
frame(
    "canceled", "After Cancel: Run 1 is shown again; the edit is still held",
    rail() + ri(PR1_NAME, RERUN(1),
        stateline(PR_SCOPE + " WebGPU.", W_NONE)
        + PR_OPTS("0.85", open_=True) + runs([("Run 1", f'damping 0.85, {T["pr1"]}', "shown")]) + CMP_VERB + tail("")) + MAIN(canvas_cit()) + GI_CIT,
    editor("a-opt", "PageRank", PR_FIELDS("0.7", changed=True)),
    '"PageRank canceled. Showing Run 1, damping 0.85. Re-run, keeps Run 1, is available." (polite). Focus stays on Cancel\'s place, now Re-run.',
    [
        "<b>Canceled is a word of the log, never a state</b>: the place shows the run before it, with no state word, and the runs list holds Run 1 only. No notice: the change is on screen.",
        "<b>'Re-run (keeps Run 1)'</b>: the command says what happens to the run on screen, because in the study 'Re-run' alone read as an overwrite while the list appended. It is enabled because Damping differs from the run shown (0.7 held)." + cm("Button"),
        "Focus stays where Cancel was; the polite region names the new command.",
    ],
)

# 6. Queued
LOUVAIN_Q = row("Louvain", "group", CANCEL_X("Louvain"), rid="a-lv", line='<span class="k-secondary">Queued behind PageRank, damping 0.5</span>')
frame(
    "queued", "Queued: its place in line, and Cancel",
    rail() + PLACE_CIT([LOUVAIN_Q, PR_RUN_ROW.replace(' id="a-pr"', ""), PR1_ROW, SAMPLED_ROW, WCC]) + MAIN(canvas_cit()) + GI_CIT,
    "",
    '"Louvain queued, behind PageRank, damping 0.5." (polite)',
    [
        "<b>One run at a time</b>: a second start queues. The row names its place in line by the run ahead of it, with Cancel in its trailing slot. Queueing is the element's policy.",
        "<b>A queued run has no date yet</b>: its name gains one when it starts. Newest first, so Louvain sits above PageRank.",
        "<b>The citation graph is directed</b>; when Louvain is opened its state line says it reads the edges as undirected.",
    ],
)

# 7. Not run (Blank): Redo brings a result back unrun
frame(
    "not-run", "Not run: Redo brings the run back unrun, Run focused with its band",
    rail() + ri(RN("Betweenness (sampled)", f'{SAMPLED["k"]} sources'), BTN("Run", focus=True),
        stateline(f'Not run yet. Run takes {SAMPLED["band"]}.', sec(f'on: full graph, {CN} nodes. Directed. Sampled, {SAMPLED["k"]} sources.'), W_NONE)
        + options([("Scope", "Full graph"), ("Direction", "Directed"), ("Sample size", str(SAMPLED["k"])), ("Seed", str(cit["sampledBetweenness"]["seed"]))])
        + runs([]).replace('<span class="k-secondary k-num">0</span>', '<span class="k-secondary">none yet</span>')
        + CMP_VERB.replace('role="button"', 'role="button" aria-disabled="true"') + appearance(mode="pending") + tail("")) + MAIN(canvas_cit()) + GI_CIT,
    "",
    f'"Redone: Betweenness (sampled), {SAMPLED["k"]} sources. Not run yet. Run takes {SAMPLED["band"]}." (polite). Run is the first stop.',
    [
        "<b>Not run, with Run and its band</b>: the analyst undid the sampled run while it ran, which canceled it, then pressed Redo. Redo brings the run back unrun and never starts work by itself. With no date yet, its name is its measure and settings.",
        f"<b>The band shows before Run</b>, because the estimate ({SAMPLED['seconds']} s in the element's model) is past the 10 s background line. The seed is recorded so the sample can be reproduced.",
        "<b>Options apply at once and run nothing</b> on a run that has never run. Compare with... and Show as style layer wait for a value.",
    ],
)

# 8. Not run: the cost gate would not start it
EST_H = round(COST["exact"]["seconds"] / 3600)
route = lambda name, b, focus=False, extra="": f'<div class="k-row rp-route{" rp-focus" if focus else ""}"{SELA if focus else ""} role="option">{i("play", "k-secondary")}<span class="k-grow">{name}{extra}<br>{band(b)}</span></div>'
frame(
    "refused", "Not run: it would take about %d hours, and three routes that fit" % EST_H,
    rail() + ri(RN("Betweenness", "exact"), BTN("Run sampled"),
        f'<div class="rp-notrun"><b>Not run: would take about {EST_H} hours.</b> The time limit is {CAP} seconds.<br><span class="k-secondary">On the full graph, {CN} nodes; the directed citations read as undirected.</span> <a class="rp-link">Details</a></div>'
        + '<div class="rp-subhead">Fits the time limit</div>' + route(f'Sampled, {SAMPLED["k"]} sources', SAMPLED["band"], True)
        + route(f'Exact, on the {KSET["nodes"]:,} nodes in {KSET["name"]}.', KSET["exact"]["band"], extra=' <span class="rp-diff">This is a different graph.</span>')
        + '<div class="rp-subhead">Past the time limit</div>' + route("Exact, on the full graph", COST["exact"]["band"])
        + tail("", compare=False)) + MAIN(canvas_cit()) + GI_CIT,
    "",
    f'"Betweenness, exact. Not run: would take about {EST_H} hours. The time limit is {CAP} seconds. Fits the time limit: Sampled, {SAMPLED["k"]} sources, under a minute, 1 of 3."',
    [
        f"<b>Not run is not a failure</b>: nothing went wrong, so there is no error mark, no red and no error sound. The row in the list reads 'Betweenness, exact. Not run: would take about {EST_H} hours' in secondary ink, and it does not join the needs-action strip. The estimate is the element's cost model, rounded to hours.",
        f"<b>Three routes, cheapest first, grouped by the gate's verdict</b>: the sampled method; the exact run on a kept set that fits, which names the set and says 'This is a different graph.', because in the study everyone who saw 'Exact, on 5,318 nodes' asked which ones; then exactly on the full graph. Focus lands on the first; the one button names the chosen route." + cm("ActionRow routes; TrailingSlot Button"),
        "<b>No options and no runs while not run</b>: the routes are the scope choice. The element's code is under Details, never on screen.",
    ],
)

# 9. Finished, sampled
SBV = cit["sampledBetweenness"]
# ponytail: the error bound is modeled here because the fixture has none; move it into gen-canvas.mjs once the element reports one.
SB_EPS = 0.00035
SB_SECS = next(s["seconds"] for s in COST["sampled"] if s["k"] == SBV["k"])
SB_VALUES = [t["betweenness"] for t in SBV["top"]]
SB_RANGES = rank_ranges(SB_VALUES, SB_EPS)
SB_FIRST_LOOSE = next(k for k, r in enumerate(SB_RANGES) if "-" in r)
SB_STABLE = f"Ranks below #{SB_FIRST_LOOSE} may swap between runs."
SB_TIP = (f"Estimated from {SBV['k']} randomly chosen sources, seed {SBV['seed']}, not from every node. "
          f"Each value is within &plusmn; {SB_EPS} of the exact value in 95 runs out of 100.")
SB_READINGS = (
    top_nodes([{"id": t["id"], "value": t["betweenness"]} for t in SBV["top"][:5]], cit["nodes"] - 5, "betweenness (sampled)",
              ranks=SB_RANGES[:5], fmt=lambda v: f"~{v:.4f}", rank_w=72,
              head='<div class="k-data rp-colhead"><span style="width:72px;flex:none;white-space:nowrap">rank, low-high</span><span class="k-name">patent</span><span class="k-value">estimated</span></div>',
              after=f'<div class="rp-prose rp-stable">{SB_STABLE}</div>')
    + subhead("Distribution", f' <span class="k-secondary">{CN} nodes, estimated</span>')
    + datarow("middle", f'~{SBV["middle"]}') + datarow("highest", f'~{SBV["highest"]}') + datarow("zero", f'~{SBV["estimatedZero"]:,} nodes')
)
frame(
    "finished-sampled", "Finished, sampled: rank ranges from the run's own error bound",
    rail() + ri(SB_NAME, RERUN(1, disabled=True),
        stateline(f"on: full graph, {CN} nodes", sec(f'Sampled, {SBV["k"]} sources{tipmark(SB_TIP, "What Sampled means")}. Directed. WebGPU.') + DETAILS("rec-sb", True), W_NONE)
        + SB_READINGS
        + options([("Scope", "Full graph"), ("Direction", "Directed"), ("Sample size", str(SBV["k"])), ("Seed", str(SBV["seed"]))])
        + runs([("Run 1", f'{SBV["k"]} sources, {T["sb"]}', "shown")]) + CMP_VERB + tail("")) + MAIN(canvas_cit()) + GI_CIT,
    record("rec-sb", "Betweenness (sampled)", [
        ("Method", f"Brandes betweenness from {SBV['k']} random sources, scaled up by {CN} / {SBV['k']}"),
        ("Seed", str(SBV["seed"])),
        ("Damping", NO_DAMP),
        ("Normalization", f"Divided by (n-1)(n-2)/2, the node pairs of an undirected graph; n = {CN}"),
        ("Weight conversion", "None: no numeric edge column"),
        ("Error bound", f"&plusmn; {SB_EPS} on each value, 95 runs out of 100"),
        ("Direction", "Citations read as undirected"),
        ("Engine", "WebGPU"),
        ("Took", f'{SB_SECS} s'),
    ]),
    f'"Betweenness (sampled) finished. On full graph, {CN} nodes. Estimated from {SBV["k"]} sources." In Top nodes: "5879702, rank 1, about 0.0160." "5964536, rank 3 to 7, about 0.0029." Then: "{SB_STABLE}"',
    [
        "<b>How sure, in the run's own terms</b>: each top node shows the ranks its value could hold under the run's error bound ('#3-#7'), under a column header that says so, and one sentence says where the order stops being firm. The bound is the run's own; no tolerance is invented by the app (kept from round 2, which it worked for)." + cm("DataRow; ProseBlock"),
        "<b>Top nodes first</b>, then the distribution, then the options: round 3 found the how-sure sentence below the fold and read 'middle' as the answer (a proposed order for interface-templates 10).",
        "<b>Details opens the run record</b> beside the inspector: method, seed, damping, normalization and weight conversion always, in that order, then what this method adds (the error bound). Copy puts it on the clipboard as text for a methods section." + cm("Popover (light), DataRow, Button"),
        "<b>No Appearance here</b>: nothing is drawn past the drawing limit, so Show as style layer would paint nothing. How long the run took is a line of its record ('Took'), never its name: a run is found again by its settings and date.",
    ],
)

# 10. Finished, painted (option A)
BT_BODY = lambda mode, tip=False, back="": (
    stateline("on: full graph, 300 nodes, 3 components", sec(f"{exact(tip)}. Undirected. WebGPU.") + DETAILS(), W_NOT_YET("confidence"))
    + bc_readings() + options([("Scope", "Full graph"), ("Weight", "None for this run")])
    + runs([("Run 1", T["bt"], "shown")]) + CMP_VERB + appearance("Betweenness color", mode=mode) + tail("Betweenness color" if mode == "shown" else "")
)
EXACT_OPEN = f'<div class="rp-info" data-anchor="#a-tipopen" data-dy="-8"><b>Exact</b><br>{EXACT_TIP}</div>'
frame(
    "finished", "Finished: the ranking to read, and the graph painted by it",
    rail() + RI_PPI(BT_NAME, RERUN(1, disabled=True), BT_BODY("shown", tip=True))
    + MAIN(canvas_ppi("betweenness", "Proteins colored by betweenness, sized by degree, 12 hubs labeled", BC_LEGEND)) + GI_PPI(BC_LAYERS),
    EXACT_OPEN,
    f'"Betweenness, {T["bt"]}, finished. On full graph, 300 nodes." (polite). The first button in the heading: "All results, Esc."',
    [
        f"<b>The run opens in its place</b>: its heading is its name, '{BT_NAME}', and the back arrow or Esc returns to the list. The inspector on the right keeps reading the selection (here the graph, with the run's new layer in its Style stack)." + cm("ActionIcon in the heading"),
        "<b>The canvas is the feedback</b>: the run's style layer paints every protein, because every protein has a betweenness value (option A of the open decision; CLAUDE.md, Algorithm Styles). State 11 draws option B.",
        "<b>The trust check, before any number</b>: scope with counts, 'Exact' with its (i) drawn open, edge reading, engine, then the weight in the words decided after round 3: 'Weight: confidence, not used yet. Change...'. Round 1 praised this line more than any other." + cm("InfoCircle, Tooltip"),
        "<b>Top nodes first, with the tie line stated</b>: 'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' The element reports it and the app prints it; the 1% is the owner's call. Equal values share a rank (the 10 at zero, '291=').",
        "<b>'Re-run (keeps Run 1)' is quiet until an option changes</b>: the run is current. Its label says the earlier run stays, so a second run never reads as an overwrite.",
    ],
)

# 11. Finished, not painted (option B)
frame(
    "finished-unpainted", "The other answer: a finished run paints nothing until Show as style layer",
    rail() + RI_PPI(BT_NAME, RERUN(1, disabled=True), BT_BODY("offer")) + MAIN(canvas_ppi()) + GI_PPI(),
    "",
    '"Betweenness finished. On full graph, 300 nodes." Later, on Appearance: "Show as style layer, button."',
    [
        "<b>Open decision, drawn both ways</b>: under option B a finished run adds no layer, the canvas stays as it was, and Appearance offers Show as style layer. It replaces the earlier form of B, a layer added with its eye closed, which drew an off layer nobody asked for. See framework-changes.md.",
        "<b>What this answer costs</b>: nothing on the canvas changes when the run lands, so the only feedback is the run's row in Results and the notice when Results is closed.",
        "<b>What it buys</b>: several runs in a row do not repaint over each other; the Style stack holds only what the reader chose (CLAUDE.md, Algorithm Styles: stacking is the point of layers).",
    ],
)

PR2_DONE = row(PR2_NAME, trail=f'<span class="k-icon-btn rp-focus" aria-label="Compare with..." aria-haspopup="menu" aria-expanded="true" id="a-cmp">{i("git-compare-arrows")}</span>', hover=True)
CMP_MENU = (
    '<div class="k-menu rp-cmpmenu" data-anchor="#a-cmp" data-dy="-8" role="menu" aria-label="Compare PageRank, damping 0.5 with">'
    '<div class="k-menu-label">Earlier runs of PageRank</div>'
    f'<div class="k-menu-item" data-hover><span class="k-check-col"></span>{PR1_NAME}</div>'
    '<div class="k-menu-sep"></div><div class="k-menu-label">Other runs on this graph</div>'
    f'<div class="k-menu-item"><span class="k-check-col"></span>{SB_NAME}</div>'
    '<div class="k-menu-sep"></div>'
    '<div class="k-menu-item"><span class="k-check-col"></span>The same run on another data version...</div></div>'
)
frame(
    "compare-with", "Compare with...: earlier runs of the same measure come first",
    rail() + PLACE_CIT([PR2_DONE, PR1_ROW, SAMPLED_ROW, WCC]) + MAIN(canvas_cit()) + GI_CIT,
    CMP_MENU,
    f'"Compare PageRank, damping 0.5, with, menu. Earlier runs of PageRank. {PR1_NAME}, 1 of 3."',
    [
        "<b>The run you most likely mean is first</b>: Compare with... on a run lists earlier runs of the same measure, newest first, then the other runs on this graph, then another data version. In the study it listed only other measures, and everyone comparing two PageRank settings looked for the first run and could not find it." + cm("Menu with labels"),
        "<b>Each entry is a run's full name</b>, so two PageRank runs are told apart by the option that differs, and the comparison names its two sides the same way ('damping 0.5' against 'damping 0.85'), never 'PageRank' against 'PageRank'.",
        "<b>The same menu opens from the opened run</b>, under its runs list. A row's Compare button shows on hover and on keyboard focus; Shift+F10 opens the row's menu too.",
    ],
)

# 12. A node selected: its value and rank per run
PATH = ppi["encodings"]["path"]
LV = ppi["louvain"]
TP_LV = LV["community"]["TP53"]
TP_LV_SIZE = next(g["size"] for g in LV["groups"] if g["community"] == TP_LV)
TP_CL_RANK = 1 + sum(x["value"] > CL["tp53"]["closeness"] for x in CL["top"])
RANK = lambda r: f'<span class="k-secondary k-num rp-rank">{r}</span>'
nres = lambda icon, name, value, rank="", hover=False, mark="": (
    f'<li class="k-item rp-nres" role="treeitem"{" data-hover" if hover else ""}>{i(icon)}<span class="k-ellipsis">{name}</span>'
    f'<span class="k-trail">{mark}</span></li>'
    f'<li class="rp-line rp-nval" role="none"><span class="k-num">{value}</span>{RANK(rank) if rank else ""}</li>'
)
TP_RESULTS = (
    '<section class="k-section"><div class="k-section-head">Results <span class="k-count k-num">4</span></div>'
    '<ul class="k-list" role="tree" aria-label="Results for TP53">'
    + nres("waypoints", f'Shortest path TP53 to {PATH["to"]}', "start", f'of {PATH["hops"]} hops', mark='<span class="k-warn-glyph">!</span>')
    + nres("group", "Louvain", f"Community {TP_LV}", f"{TP_LV_SIZE} proteins")
    + nres("sigma", "Closeness (WF-corrected)", f'{CL["tp53"]["closeness"]:.4f}', f"#{TP_CL_RANK} of {PN}")
    + nres("sigma", "Betweenness", f'{TP["betweenness"]:.4f}', f'#{TP["betweennessRank"]["from"]} of {PN}', hover=True)
    + "</ul></section>"
)
TP_ATTR = (
    '<section class="k-section"><div class="k-section-head">Attributes</div>'
    + datarow("module", f'{TP["module"]} <span class="k-secondary">from the file</span>') + datarow("degree", f'{TP["degree"]} <span class="k-secondary">#{TP["degreeRank"]["from"]} of {PN}</span>')
    + datarow("log2FoldChange", f'{TP["log2FoldChange"]:.2f}') + "</section>"
)
NODE_INSPECTOR = (
    f'<aside class="k-right" aria-label="Inspector">{HEAD2}'
    f'<div class="k-typerow">{i("circle-dot")}<span class="k-name k-id">TP53</span><span class="k-secondary">Node</span></div>'
    f'<div class="k-scroll">{TP_ATTR}'
    + style_stack([(f'<span class="rp-pathchip"></span>', f'Shortest path TP53 to {PATH["to"]}'), (RAMP_CHIP, "Betweenness color"), (SIZE_CHIP, "Size: degree")],
                  wins={f'Shortest path TP53 to {PATH["to"]}': "outline", "Betweenness color": "color", "Size: degree": "size"})
    + TP_RESULTS + "</div></aside>"
)
TP_TIP = f'<div class="k-tooltip rp-rowtip" data-anchor="#a-tpres" data-dy="0">Opens {BT_NAME} in Results. TP53 stays selected.</div>'
SP_STALE = row(SP_NAME, "waypoints", '<span class="k-warn-glyph">!</span>', line='<span class="k-secondary">Out of date</span> <a class="rp-link">Re-run (keeps Run 1)</a>')
PPI_RUNS = [row(LV_NAME, "group"), row(CL_NAME), row(BT_NAME, rid="a-btrow", hover=True), CC]
frame(
    "node-selected", "A node selected: its value and rank in each run",
    rail() + PLACE_PPI(PPI_RUNS, needs([SP_STALE])) + MAIN(canvas_ppi("stacked-tp53", "Betweenness colors and degree sizes, the shortest path TP53 to SMAD3 highlighted, TP53 selected", BC_LEGEND))
    + NODE_INSPECTOR.replace('<li class="k-item rp-nres" role="treeitem" data-hover>', '<li class="k-item rp-nres" role="treeitem" data-hover id="a-tpres">'),
    TP_TIP,
    f'"TP53, node. Results, 4. Betweenness, {TP["betweenness"]:.4f}, rank {TP["betweennessRank"]["from"]} of {PN}." On the path row: "Shortest path TP53 to SMAD3, out of date, start, of 3 hops."',
    [
        "<b>A node's results sit with its appearance</b>, in the one inspector: Attributes, Appearance (the whole stack, the rows that paint TP53 marked with the property each wins), then Results, one row per run with TP53's value and its rank 'of 300'. These are facts about the node, so they stay on it; the list of runs is the Results place on the left." + cm("ActionRow with value and rank in the right section"),
        "<b>Each kind of result says what it has for this node</b>: a measure its value and rank, a partition the node's group and its size, a path where the node sits on it. The rank cue 'of 300' is kept: every round-1 participant trusted it.",
        "<b>The out-of-date mark follows the value</b> wherever it is read: the path used confidence as a distance before the answer changed, so its row carries the same mark as in the needs-action strip (state 17; interaction-pattern-entries 7.2).",
        "<b>A row opens its run in Results</b>: the Results place opens on that run (the finished state reads it), and TP53 stays selected in the inspector. The runs themselves are listed once, on the left; the right panel only reads what they say about TP53.",
    ],
)

# 13. "295 more in the table" opens the Nodes tab sorted by that measure
def dock(tabs, scope, head, body, basis=46, on=0):
    t = "".join(f'<span class="k-tab" role="tab" aria-selected="{str(k == on).lower()}">{n}</span>' for k, n in enumerate(tabs))
    return (
        f'<section class="k-dock" aria-label="Table" style="flex-basis:{basis}%"><div class="k-dock-tabs"><span role="tablist" aria-label="Table" style="display:contents">{t}</span>'
        f'<span class="k-grow"></span><span class="k-icon-btn" aria-label="Find in table">{i("search")}</span><span class="k-btn k-btn-ghost">Export table...</span></div>'
        f'<div class="k-scope">{scope}</div><div class="k-table-wrap"><table class="k-table" role="grid"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div></section>'
    )


def th(label, profile="", n=False, sort=""):
    s = f' aria-sort="{sort}"' if sort else ""
    caret = i("chevron-down", "k-i-sm k-secondary") if sort else ""
    c = ' class="k-n"' if n else ""
    return f'<th{c}{s}>{label}{caret}<span class="k-profile">{profile or "&nbsp;"}</span></th>'


# All 300 proteins, unrounded, so each rank column ranks what the element ranks (kit fixtures, scenarios.tableDock.ppi).
P300 = FIX["scenarios"]["tableDock"]["ppi"]["rows"]
assert len(P300) == ppi["nodes"]
rank_of = lambda col: {r[0]: shared_ranks([x[col] for x in P300])[k] for k, r in enumerate(P300)}
BC_RANK, PR_RANK = rank_of(3), rank_of(4)
assert BC_RANK["TP53"] == str(TP["betweennessRank"]["from"])
BT_TABLE_ROWS = "".join(
    f'<tr{" data-focus-ring" if k == 0 else ""}><td class="k-id">{r[0]}</td><td>{r[1]}</td><td class="k-n">{r[2]}</td>'
    f'<td class="k-n">{r[3]:.4f}</td><td class="k-n">#{BC_RANK[r[0]]}</td><td class="k-n">{r[4]:.5f}</td><td class="k-n">#{PR_RANK[r[0]]}</td></tr>'
    for k, r in enumerate(sorted(P300, key=lambda x: -x[3])[:14])
)
BT_DOCK = dock(
    ["Nodes", "Edges"], f"Full graph: {PN} nodes. Sorted by betweenness, highest first; PageRank's columns beside it.",
    th("id") + th("module", "from the file") + th("degree", "1 to 34", n=True) + th("betweenness", "exact, full graph", n=True, sort="descending")
    + th("betweenness rank", f"of {PN}, ties share", n=True) + th("PageRank", "exact, full graph", n=True) + th("PageRank rank", f"of {PN}, ties share", n=True),
    BT_TABLE_ROWS,
)
frame(
    "in-the-table", "295 more in the table: the Nodes tab, sorted by that measure, the other measures beside it",
    rail() + RI_PPI(BT_NAME, RERUN(1, disabled=True), BT_BODY("shown").replace('<div class="k-row rp-verb" role="link"', '<div class="k-row rp-verb rp-focus" role="link"', 1))
    + '<main class="k-main">' + canvas_ppi("betweenness", "Proteins colored by betweenness, sized by degree, 12 hubs labeled", BC_LEGEND) + BT_DOCK + "</main>" + GI_PPI(BC_LAYERS),
    "",
    '"Table, Nodes, sorted by betweenness, descending. 300 rows. MAPK1, rank 1 of 300." Focus moves to the first row; the run stays open in Results.',
    [
        "<b>The link says where it goes and goes there</b>: '295 more in the table', under Top nodes, opens the dock on the Nodes tab, sorted by the result's column, highest first, and moves focus to the first row. The run stays open in Results beside it." + cm("Anchor; Table sort state"),
        "<b>The run adds two columns</b>, its score and its rank, each headed with scope and method ('exact, full graph'), and the rank header keeps 'of 300'. Equal values share a rank." + cm("Table header with a profile line"),
        f"<b>This is the top-N view</b>: every other finished measure's score and rank beside it, so 'is it in the top 10 on both?' is read across a row (UBC is #{BC_RANK['UBC']} by betweenness, #{PR_RANK['UBC']} by PageRank). No separate ranking table (round 2's decision).",
        "<b>One exit</b>: 'Export table...' opens the one export dialog with Table chosen, which writes every row with these headers and its methods file (output-homes, as proposed after round 3).",
    ],
)

# 14. A finished Louvain result
CATS = FIX["canvas"]["categorical"]
LV_SLOTS = [c if c.upper() != "#000000" else "#6929C4" for c in CATS]
lv_color = lambda c: LV_SLOTS[c - 1] if c <= len(LV_SLOTS) else "#505050"
LV_NAMES = list(LV["community"])
for theme in ("light", "dark"):
    src = open(os.path.join(P, f"kit/canvas/ppi-modules-rest-{theme}.svg")).read()
    k = [0]

    def recolor(m):
        c = lv_color(LV["community"][LV_NAMES[k[0]]])
        k[0] += 1
        return m.group(1) + c + '"'

    out = re.sub(r'(<circle [^>]*?fill=")(#[0-9A-Fa-f]{6})"', recolor, src)
    assert k[0] == ppi["nodes"], k[0]
    out = re.sub(r'aria-label="[^"]*"', 'aria-label="Proteins colored by Louvain community, sized by degree"', out, count=1)
    os.makedirs(os.path.join(P, "screens/img"), exist_ok=True)
    open(os.path.join(P, f"screens/img/results-panel-louvain-{theme}.svg"), "w").write(out)

G = LV["groups"]
LV_LEGEND = (
    '<div class="k-legend-card" style="width:236px"><div class="k-lg-title">Louvain color <span class="k-secondary">community</span></div>'
    + "".join(f'<div class="k-lg-row"><span class="k-chit" style="background:{lv_color(g["community"])}"></span>Community {g["community"]}<span class="k-value k-num">{g["size"]}</span></div>' for g in G[:4])
    + f'<div class="k-lg-row k-secondary">{len(G) - 4} more</div></div>'
)
dens = lambda d: "not defined" if d is None else f"{d:.3f}"
fmt_lfc = lambda v: f"{v:+.2f}".replace("+0.00", "0.00")
LV_ROWS = "".join(
    f'<tr><td><span class="k-chit" style="background:{lv_color(g["community"])}"></span> Community {g["community"]}</td><td class="k-n">{g["size"]}</td>'
    f'<td class="k-n">{g["edgesInside"]}</td><td class="k-n">{g["edgesOut"]}</td>'
    f'<td class="k-n">{dens(g["density"])}</td>'
    f'<td class="k-n">{fmt_lfc(g["meanLog2FoldChange"])} <span class="k-secondary">vs {fmt_lfc(g["meanLog2FoldChangeRest"])}</span></td>'
    f'<td class="k-id">{g["hub"]}</td><td>{g["mostFromModule"]}'
    f' <span class="k-secondary">{g["fromThatModule"]} of {g["size"]}</span></td></tr>'
    for g in G
)
LV_DOCK = dock(
    ["Nodes", "Edges", "Communities: Louvain"], f'Full graph: {LV["communities"]} communities, {LV["singletons"]} of them a single protein. Sorted by size.',
    th("community") + th("size", "proteins", n=True, sort="descending") + th("edges inside", n=True) + th("edges out", n=True) + th("density", "inside", n=True)
    + th("log2FoldChange", "mean, vs the rest", n=True) + th("hub", "highest degree") + th("module", "from the file; most members"),
    LV_ROWS, basis=48, on=2,
)
LV_TIP = "The grouping depends on the seed. The same seed gives the same groups; another seed can place some proteins differently."
LV_CANVAS = (
    '<div class="k-canvas"><div class="k-stage"><img class="k-light-only" src="img/results-panel-louvain-light.svg" alt="Proteins colored by Louvain community, sized by degree">'
    '<img class="k-dark-only" src="img/results-panel-louvain-dark.svg" alt="Proteins colored by Louvain community, sized by degree"></div>'
    + LV_LEGEND + f'<div class="k-toolbar-dock">{TOOLBAR}</div>{HELP}</div>'
)
LV_CHIP = STACK([lv_color(c) for c in (4, 3, 2, 1)])
LV_BODY = lambda focus_link=False: (
    stateline("on: full graph, 300 nodes, 3 components", sec(f"Seeded{tipmark(LV_TIP, 'What Seeded means')}. Undirected. CPU.") + DETAILS("rec-lv", not focus_link), W_USED("confidence", "similarity"))
    + subhead("Groups", f' <span class="k-secondary">{LV["communities"]} communities</span>')
    + datarow("modularity", f'{LV["modularity"]:.3f}') + datarow("the file's modules", f'{LV["modularityOfFileModules"]:.3f}')
    + datarow("largest", f'{LV["largest"]} proteins') + datarow("single proteins", f'{LV["singletons"]}, no interaction')
    + f'<div class="k-row rp-verb{" rp-focus" if focus_link else ""}" role="link" data-tip="Opens the Communities: Louvain tab of the table">{i("table", "k-secondary")}<span class="k-grow rp-link">Communities table</span></div>'
    + options([("Scope", "Full graph"), ("Weight", "confidence"), ("Resolution", str(LV["resolution"])), ("Seed", str(LV["seed"]))])
    + runs([("Run 1", T["lv"], "shown")]) + CMP_VERB + appearance("Louvain color", chip=LV_CHIP) + tail("Louvain color")
)
LV_GI = GI_PPI([(LV_CHIP, "Louvain color"), (SIZE_CHIP, "Size: degree")], w="confidence, used as similarity")
frame(
    "louvain", "A finished Louvain result: its groups, modularity and seed",
    rail() + RI_PPI(LV_NAME, RERUN(1, disabled=True), LV_BODY(), icon="group") + MAIN(LV_CANVAS) + LV_GI,
    record("rec-lv", "Louvain", [
        ("Method", f"Louvain, weighted modularity, resolution {LV['resolution']}"),
        ("Seed", str(LV["seed"])),
        ("Damping", NO_DAMP),
        ("Normalization", "Modularity divided by twice the total confidence of all edges"),
        ("Weight conversion", "confidence used as given, 0.40 to 0.99, as similarity: higher = stronger link"),
        ("Numbering", "By size, largest first; a protein with no interaction is a community of its own"),
        ("Engine", "CPU: Louvain has no WebGPU version"),
        ("Took", "0.4 s"),
    ]),
    f'"Louvain finished. On full graph, 300 nodes. {LV["communities"]} communities, modularity {LV["modularity"]}."',
    [
        "<b>What the run found, first</b>: modularity with the file's own modules' beside it (0.663 against 0.716, so a detected grouping is never read as the imported one), the largest group and the single proteins; 'Communities table' opens its items (the next state)." + cm("DataRow, Anchor"),
        "<b>The weight used, in the decided words</b>: 'Weight: confidence, used as similarity. Change...'. It replaces round 2's '(your answer)', which round 3 readers who had never seen the question could not place (proposed key <code>graphty.weight.used</code>). 'Seeded' with its (i) takes the place of 'Exact'." + cm("InfoCircle"),
        "<b>The engine is named honestly</b>: Louvain has no WebGPU kernel in the element today, so the state line names the CPU, and the record says why.",
        "<b>The run record</b>: method, seed, damping, normalization and weight conversion, then Louvain's numbering rule, then how long it took, which is kept here and never used as the run's name.",
    ],
)

# 15. Louvain's groups as a tab in the table dock
frame(
    "louvain-table", "A result's items open as a tab in the table: one row per community",
    rail() + RI_PPI(LV_NAME, RERUN(1, disabled=True), LV_BODY(focus_link=True), icon="group")
    + '<main class="k-main">' + LV_CANVAS + LV_DOCK + "</main>" + LV_GI,
    "",
    '"Table, Communities: Louvain, sorted by size, descending. 10 rows. Community 1, 62 proteins." Focus lands on the first row.',
    [
        "<b>Items open in the dock, never in Results or the inspector</b>: the result's own tab, named by its kind and result, one row per community with size, edges inside and out, density, a data column's mean against the rest, the hub and the file's module most members carry (information-architecture 3, Items and Table tabs). Opening another result's items replaces this tab." + cm("Table, Tabs"),
        "<b>Detected is never read as imported</b>: the module column is headed 'from the file' and counts how many members carry it ('56 of 62').",
        "<b>A density a group cannot have is written out</b> ('not defined' for a single protein).",
        "Selecting a row selects that community's proteins on the canvas, and the inspector then reads that selection.",
    ],
)

# 16. Results after a filter
LM = fx["lesmis"]
LM_ROWS = LM["filterSteps"]["betweennessOnStep1"]
LM_STEP = LM["filterSteps"]["byStep"][0]
LM_STEP_NAME = LM["filterSteps"]["steps"][0].replace(">", "&gt;")
assert len(LM_ROWS) == LM_STEP["nodes"] == LM["filterSteps"]["after"]["step1"]
LM_N, LM_ALL = LM_STEP["nodes"], LM["nodes"]
LM_BC = sorted((r["betweenness"] for r in LM_ROWS), reverse=True)
LM_HI = LM_BC[0]
LM_ZERO = LM_BC.count(0)
LM_HIST = [0] * 12
for v in LM_BC:
    LM_HIST[bin_of(v, LM_HI)] += 1
LM_TOP = [{"id": r["label"], "value": r["betweenness"]} for r in sorted(LM_ROWS, key=lambda r: -r["betweenness"])[:5]]
LM_READ = (
    top_nodes(LM_TOP, LM_N - 5, "betweenness", fmt=lambda v: f"{v:.3f}", head=f'<div class="rp-prose k-secondary rp-scopeline">Values on {LM_N} of {LM_ALL} nodes: the filtered graph</div>')
    + subhead("Distribution", f' <span class="k-secondary">{LM_N} nodes</span>')
    + hist(LM_HIST, 11, [0, round(LM_HI / 2, 3), LM_HI])
    + datarow("middle", f'{sorted(LM_BC)[LM_N // 2]:.3f}') + datarow("highest", f"{LM_HI:.3f}")
    + datarow("zero", f"{LM_ZERO} nodes, all {LM_N - LM_ZERO + 1}=")
)
LM_CHIP = f"Filtered: {LM_N} of {LM_ALL} nodes &middot; 1 step"
LM_NAME = RN("Betweenness", f"on {LM_N} of {LM_ALL} nodes", T["lm"])
LM_GROUP_LEGEND = (
    '<div class="k-legend-card"><div class="k-lg-title">Group color <span class="k-secondary">group</span></div><div class="k-lg-row"><span class="k-chit" style="background:#E69F00"></span>2<span class="k-value k-num">14</span></div>'
    '<div class="k-lg-row"><span class="k-chit" style="background:#56B4E9"></span>8<span class="k-value k-num">13</span></div><div class="k-lg-row"><span class="k-chit" style="background:#009E73"></span>4<span class="k-value k-num">11</span></div>'
    '<div class="k-lg-row"><span class="k-chit" style="background:#D55E00"></span>3<span class="k-value k-num">10</span></div><div class="k-lg-row k-secondary">6 more</div></div>'
)
frame(
    "filtered", f"Results after a filter: Scope reads Filtered graph, {LM_N} of {LM_ALL}",
    rail() + ri(LM_NAME, RERUN(1, disabled=True),
         stateline(f"on {LM_N} of {LM_ALL} nodes: the filtered graph, 1 component", sec(f"{EXACT}. Undirected. WebGPU.") + DETAILS("rec-lm", True), W_NOT_YET("value"))
         + LM_READ + options([("Scope", f"Filtered graph, {LM_N} of {LM_ALL}"), ("Weight", "None for this run")])
         + runs([("Run 1", f"on {LM_N} of {LM_ALL}, {T['lm']}", "shown")]) + CMP_VERB + appearance("Betweenness color", mode="off") + tail(""),
         project=LM["frame"]["project"], chip=LM_CHIP)
    + MAIN('<div class="k-canvas"><div class="k-stage"><img class="k-light-only" src="../kit/canvas/lesmis-step1-light.svg" alt="Les Miserables filtered to degree 2 or more">'
           '<img class="k-dark-only" src="../kit/canvas/lesmis-step1-dark.svg" alt="Les Miserables filtered to degree 2 or more"></div>'
           + LM_GROUP_LEGEND + f'<div class="k-toolbar-dock">{TOOLBAR}</div>{HELP}</div>')
    + gi(LM["frame"]["graphRow"], [("nodes", f"{LM_N} of {LM_ALL}"), ("edges", f'{LM_STEP["edges"]} of {LM["edges"]}'), ("components", LM_STEP["components"]), ("density", LM_STEP["density"])],
         [("edges", "undirected; value, not used yet")], [(STACK(["#D55E00", "#009E73", "#56B4E9", "#E69F00"]), "Group color"), (RAMP_CHIP, "Betweenness color")], off=("Betweenness color",)),
    record("rec-lm", "Betweenness", [
        ("Method", "Brandes betweenness, exact: every node is a source"),
        ("Seed", '<span class="k-secondary">None: nothing is sampled</span>'),
        ("Damping", NO_DAMP),
        ("Normalization", f"Divided by (n-1)(n-2)/2 = {(LM_N - 1) * (LM_N - 2) // 2:,} node pairs; n = {LM_N}, the filtered graph"),
        ("Weight conversion", "None: value not used"),
        ("Scope", f"Filtered graph, {LM_N} of {LM_ALL}: after {LM_STEP_NAME}"),
        ("Engine", "WebGPU"),
        ("Took", "0.1 s"),
    ]),
    f'"Betweenness finished. On filtered graph, {LM_N} of {LM_ALL} nodes." Scope is read as "Scope, Filtered graph, {LM_N} of {LM_ALL}".',
    [
        f"<b>Scope says which graph, with both counts, in the run's own name</b>: '{LM_NAME}'. The scope is the option that differs from a run on the whole graph, so it names the run, and it heads Top nodes ('Values on {LM_N} of {LM_ALL} nodes'), because in the study the same word, betweenness, showed 0.57 in the table and 0.419 here, and only the scope on the value's own line told them apart.",
        f"<b>The record keeps the scope</b>: the normalization's n is the filtered graph's {LM_N}, and the record names the step that made it. Turning the step off later does not make this result out of date; it keeps its scope (glossary 10, Out of date).",
        "<b>The analyst kept Group color on the canvas</b>, so the run's layer is kept with its eye closed and reads 'not shown'; the ranking is read here and in the table.",
        f"<b>Ties share a rank</b>: the {LM_ZERO} characters with no betweenness all rank {LM_N - LM_ZERO + 1}=.",
    ],
)

# 17. Out of date: the needs-action strip on top of Results
LV_STALE = row(LV_NAME, "group", '<span class="k-warn-glyph">!</span>', line='<span class="k-secondary">Out of date</span> <a class="rp-link">Re-run (keeps Run 1)</a>')
frame(
    "outofdate", "Out of date: pinned on top of Results, one verb per row, one command for all",
    rail() + PLACE_PPI([row(CL_NAME), row(BT_NAME), CC], needs([LV_STALE, SP_STALE], hid="a-na", review=True)) + MAIN(canvas_ppi("stacked", "Betweenness colors and degree sizes, with the shortest path TP53 to SMAD3 highlighted",
                                           BC_LEGEND.replace('<div class="k-lg-title" style="margin-top:8px">Size: degree', '<div class="k-lg-title" style="margin-top:8px">Shortest path TP53 to SMAD3 <span class="k-warn-glyph">!</span></div><div class="k-lg-title" style="margin-top:8px">Size: degree')))
    + GI_PPI([(f'<span class="rp-pathchip"></span>', f"Shortest path TP53 to {PATH['to']}")] + BC_LAYERS, w="confidence, used as similarity"),
    '<div class="k-popover rp-pop" data-anchor="#a-na" role="dialog" aria-label="Review out of date"><div class="k-popover-head">Review out of date<span class="k-grow"></span>'
    f'<span class="k-icon-btn" aria-label="Close">{i("x")}</span></div><div class="k-popover-body">'
    + "".join(
        f'<div class="k-row">{i(ic)}<span class="k-grow k-ellipsis k-strong">{n}</span></div>'
        f'<div class="rp-prose">{n.split(" TP53")[0]} used confidence as a distance. It is now used as similarity. Re-run to update.</div>'
        for ic, n in [("group", "Louvain"), ("waypoints", f"Shortest path TP53 to {PATH['to']}")]
    )
    + '<div class="rp-prose k-secondary">Betweenness and Closeness did not use the weight, so they stay current.</div>'
    + '<div class="rp-prose k-secondary">Each re-run is added as Run 2; Run 1 of each stays.</div>'
    + '<div class="rp-foot"><span class="k-grow"></span><span class="k-btn">Re-run all</span></div></div></div>',
    '"Results, 5 runs. Needs action, 2. Louvain, out of date. Shortest path TP53 to SMAD3, out of date. Review out of date, button."',
    [
        "<b>The needs-action strip heads the Results place</b>: what the element reports failed or not current, pinned once and not repeated below, never reordering the list." + cm("ControlSection on a secondary background"),
        "<b>One cause, told in the past tense per result</b>: the analyst changed what confidence means. Each result says what it used, what is true now and what to do; only the two runs that read it go out of date (interaction-pattern-entries 7.2; glossary 10, Out of date).",
        "<b>One verb per row, one command for all</b>: each pinned row reads 'Re-run (keeps Run 1)'; the review lists what changed and offers Re-run all, one undo step, and says each earlier run stays. It opens beside the Results place." + cm("PopoutPanel"),
        "<b>The canvas keeps the out-of-date paint, marked</b>: the path still draws, and its legend block and its Style stack row carry the same mark. When Results is closed, the rail's Results button carries the count.",
    ],
)

# 18. Failed: WebGPU lost; the row keeps Run 1 and offers an explicit retry
FAIL_LINE = "Showing Run 1 (damping 0.85). Run 2 wrote nothing."
TRY = lambda tag="a": (f'<a class="rp-link">Try WebGPU again</a>' if tag == "a" else BTN("Try WebGPU again"))
PR_FAILED = row(PR2_NAME, trail='<span class="k-warn-glyph k-err-glyph">!</span>', rid="a-fail",
                line=f'<span>{FAIL_LINE}</span> {TRY()}')
frame(
    "failed", "Failed: the row says which run is shown, and offers Try WebGPU again",
    rail() + PLACE_CIT([PR1_ROW, SAMPLED_ROW, WCC], needs([PR_FAILED])) + MAIN(canvas_cit()) + GI_CIT,
    "",
    f'"PageRank, damping 0.5, failed. {FAIL_LINE} Try WebGPU again, link." The failure is announced once (assertive): "Could not run PageRank, damping 0.5: WebGPU was lost."',
    [
        f"<b>The row says what is on screen and what is not</b>: '{FAIL_LINE}' In the study a row that said only 'Failed' while the table still held Run 1's values read as 'the numbers are wrong'. The row carries the error mark, because this one did go wrong, and heads the list in the needs-action strip." + cm("ActionRow; Anchor"),
        "<b>'Try WebGPU again' is an explicit retry, owned by graphty-element</b>: the element gets a new WebGPU device and runs Run 2's options once more, at the reader's word. It never falls back to the CPU on its own; a GPU error is never quietly finished on the CPU. If the element cannot get a device, the row says so and the retry stays available.",
        "<b>Run 1 is untouched</b>: its row below, its values in the table and its layer on the canvas are the ones shown before Run 2 started.",
    ],
)
frame(
    "failed-run", "Failed, opened: Run 1 shown, its own options, and the same retry",
    rail() + ri(PR1_NAME, TRY("btn"),
        f'<div class="rp-error"><b>Run 2 could not finish:</b> WebGPU was lost. {FAIL_LINE} <a class="rp-link">Details</a></div>'
        + stateline(sec(f"Showing Run 1: {PR_SCOPE} WebGPU."), W_NONE, f'Try WebGPU again runs damping 0.5, {band("under a minute")}.')
        + PR_OPTS("0.85") + runs([("Run 2", f'damping 0.5, {T["pr2"]}', '<span class="k-danger">wrote nothing</span>'), ("Run 1", f'damping 0.85, {T["pr1"]}', "shown")])
        + CMP_VERB + tail("")) + MAIN(canvas_cit()) + GI_CIT,
    "",
    f'"PageRank, damping 0.85, {T["pr1"]}. Run 2 could not finish: WebGPU was lost. {FAIL_LINE} Try WebGPU again, button."',
    [
        "<b>Never a quiet CPU finish</b>: the run fails where it lives, with the element's sentence in the error slot, Run 1 kept and named, and one command that says what it will do.",
        "<b>The options are the shown run's</b>: Damping reads 0.85, the value of Run 1 on screen, not the 0.5 that failed; Run 2's damping is in its own row and in the line under the state line. In the study a field showing 0.5 above a small 'showing 0.85' misled every reader who noticed it." + cm("DataRow"),
        "<b>No 'Re-run on CPU'</b>: at the element's 30-second limit an exact PageRank of a few minutes on the CPU would itself not run. Nothing switches engines for the reader.",
    ],
)

# 19. No WebGPU: the CPU path ran
frame(
    "cpu-path", "No WebGPU: the CPU path ran, and the result says so",
    rail() + RI_PPI(BT_NAME, RERUN(1, disabled=True),
         stateline("on: full graph, 300 nodes, 3 components", sec(f"{EXACT}. Undirected. CPU: WebGPU not available.") + DETAILS(), W_NOT_YET("confidence"))
         + BC_READINGS + options([("Scope", "Full graph"), ("Weight", "None for this run")]) + runs([("Run 1", f'{T["bt"]}, CPU', "shown")])
         + CMP_VERB + appearance("Betweenness color") + tail("Betweenness color"))
    + MAIN(canvas_ppi("betweenness", "Proteins colored by betweenness, sized by degree, 12 hubs labeled", BC_LEGEND)) + GI_PPI(BC_LAYERS),
    "",
    '"Betweenness finished on the CPU. On full graph, 300 nodes." (polite)',
    [
        "<b>The CPU path is correct behavior, not a failure</b>: without WebGPU the element runs the CPU implementation and says so in the state line and in the runs list (state-matrix 3, Result row, Ideal, no WebGPU; CLAUDE.md, WebGPU). No notice, no warning color." + cm("Badge"),
        "The values are the same as on WebGPU; only the engine differs, which the run record keeps for the methods text (message-catalog <code>graphty.record.methods</code>).",
    ],
)

# 20. Editor error
frame(
    "editor-error", "Options error: a field that would change the meaning keeps the text, and Run waits",
    rail() + RI_PPI(BT_NAME, RERUN(1, disabled=True, kind=""),
         stateline("on: full graph, 300 nodes, 3 components", sec(f"{EXACT}. Undirected. WebGPU.") + DETAILS(), W_NOT_YET("confidence"))
         + options([("Scope", "Full graph"), ("Weight", "None for this run")], open_=True) + BC_READINGS + runs([("Run 1", T["bt"], "shown")]) + CMP_VERB + appearance("Betweenness color") + tail("Betweenness color"))
    + MAIN(canvas_ppi("betweenness", "Proteins colored by betweenness, sized by degree, 12 hubs labeled", BC_LEGEND)) + GI_PPI(BC_LAYERS),
    editor("a-opt", "Betweenness", field("Scope", "Full graph") + field("Weight", "confidnce", error="unknown attribute confidnce; Closest: confidence")),
    '"Weight, confidnce, invalid. Unknown attribute confidnce; Closest: confidence." (assertive, on leaving the field)',
    [
        "<b>A field that changes meaning keeps what was typed</b>, with one line under it, and 'Re-run (keeps Run 1)' beside the state line is disabled until it is corrected; Closest is the one-click fix (state-matrix 3, Result editor, Error; message-catalog <code>graphty.cause.E_UNKNOWN_ATTRIBUTE</code>)." + cm("FieldRow error slot; ComboInput"),
        "<b>Nothing else moves</b>: the run shown, its layer and the canvas are the last good run's, and the place still reads them. The Run line says options wait for Run, so the typo ran nothing.",
        "<b>Options sit above the readings here</b> only because the popover is open on them; the opened run keeps its order (Top nodes first) and scrolls the Options row into view when its popover opens.",
    ],
)

# 21. Closeness names its variant, and says which ranks are tied
CL_BODY = (
    stateline("on: full graph, 300 nodes, 3 components", sec(f'{EXACT}. Undirected. WebGPU. {CL["zeros"]} isolated proteins score 0.') + DETAILS(), W_NOT_YET("confidence"))
    + f'<div class="k-fieldrow" id="a-var"><span class="k-legend">Variant <span class="rp-i" role="button" tabindex="0" aria-label="What Wasserman-Faust corrected means" aria-expanded="true">{i("info", "k-i-sm")}</span></span><div class="k-fields"><span class="k-span rp-varval">Wasserman-Faust corrected</span></div></div>'
    + f'<div class="k-row rp-verb" role="button">{i("play", "k-secondary")}<span class="k-grow">Run harmonic centrality</span></div>'
    + CL_READINGS + options([("Scope", "Full graph"), ("Weight", "None for this run")]) + runs([("Run 1", T["cl"], "shown")])
    + CMP_VERB + appearance("Closeness (WF-corrected) color") + tail("Closeness (WF-corrected) color")
)
INFO = (
    '<div class="rp-info" data-anchor="#a-var" data-dx="0">'
    "<b>Wasserman-Faust corrected</b><br>Each score is multiplied by the share of the other proteins the node can reach. "
    f'On this network the main component reaches {CL["mainComponentReach"]} of {CL["others"]} others, so scores drop by under 1% and no rank changes; '
    f'the {CL["zeros"]} isolated proteins score 0 either way. Without it, a node in a small piece can outscore a hub.</div>'
)
frame(
    "variant", "Closeness names its variant on a graph in 3 pieces, and says which ranks are tied",
    rail() + RI_PPI(CL_NAME, RERUN(1, disabled=True), CL_BODY)
    + MAIN(canvas_ppi("closeness", "Proteins colored by closeness, sized by degree, 12 hubs labeled", CL_LEGEND)) + GI_PPI([(RAMP_CHIP, "Closeness (WF-corrected) color"), (SIZE_CHIP, "Size: degree")]),
    INFO,
    '"Closeness, WF-corrected, Sep 28 09:20. Variant: Wasserman-Faust corrected." Under Top nodes: "Ranks 3 and 4 differ by less than 0.2%, under the 1% tie line; treat them as tied."',
    [
        "<b>The variant is part of the name</b> wherever the value is read: the run's row and heading in Results, the table column, the legend, the catalog (principles 1, 'The variant is part of the name'; graph-conventions 2, Closeness). Not a warning, and nothing asks before the run: it is a corrected default. The run's name wraps in the heading rather than truncating.",
        f"<b>What the correction does here, honestly</b>: each score is multiplied by the share of the other proteins its node reaches. The main component reaches {CL['mainComponentReach']} of {CL['others']}, so its scores drop by under 1% (MAPK1 {CL['topUncorrected'][0]['value']:.4f} uncorrected, {CL['top'][0]['value']:.4f} corrected) and no rank changes; GSK3B and NOTCH1 score 0 either way.",
        "<b>The definition is an (i), not a menu</b>, drawn open. The alternative is a plain command, 'Run harmonic centrality' (a sibling result, glossary 9), which would give MAPK1 " + f"{CL['harmonicTop'][0]['value']:.4f}." + cm("InfoCircle; ActionRow"),
        "<b>A near-tie said in words, with its line stated</b>: AKT1 (0.4086) and UBC (0.4080) differ by 0.15%, so 'Ranks 3 and 4 differ by less than 0.2%, under the 1% tie line; treat them as tied.' With Top nodes first it is in view without scrolling (round 3 found it below the fold). The element reports it; the threshold is the owner's call." + cm("ProseBlock"),
    ],
    alias="variant-ties",
)


# ---------------------------------------------------------------- the page
CSS = """
  body { min-width: 1440px; }
  .rp-bar { position: relative; z-index: 200; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-height: 40px; padding: 6px 16px; background: var(--cm-bg); border-bottom: 1px solid var(--cm-border); font-size: 12px; }
  .rp-bar a { display: inline-flex; align-items: center; min-height: 24px; color: var(--cm-text-brand); text-decoration: none; }
  .rp-bar .rp-title { font-weight: 600; }
  .rp-toggle { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--k-annot); color: var(--k-annot-ink); font-weight: 600; cursor: pointer; }
  #annot:checked ~ .rp-bar .rp-toggle, #annot:checked ~ .rp-state .rp-toggle { background: var(--k-annot); color: #fff; }
  .rp-state { position: relative; width: 1440px; height: 900px; overflow: hidden; border-bottom: 4px solid var(--k-annot); scroll-margin-top: 0; }
  .rp-state .k-app { width: 1440px; height: 900px; }
  .rp-label { position: absolute; z-index: 95; top: 8px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
    height: 28px; padding: 0 6px 0 4px; border-radius: 14px; background: var(--k-annot-bg); color: var(--cm-text); font-size: 12px; font-weight: 550; box-shadow: 0 0 0 1px var(--k-annot); white-space: nowrap; }
  .rp-label a { display: inline-grid; place-items: center; min-width: 20px; height: 20px; border-radius: 10px; color: var(--k-annot-ink); text-decoration: none; font-weight: 600; }
  .rp-label .rp-toggle { height: 20px; padding: 0 6px; border-radius: 10px; }
  .rp-notes, .rp-spoken { display: none; }
  #annot:checked ~ .rp-state .rp-notes { display: flex; }
  .rp-spoken { position: absolute; z-index: 95; left: 600px; top: 44px; width: 592px; padding: 6px 10px; border-radius: 6px;
    background: var(--k-annot-bg); border: 1px dashed var(--k-annot); font-size: 12px; line-height: 17px; }
  #annot:checked ~ .rp-state .rp-spoken { display: block; }
  .rp-notes { position: absolute; z-index: 94; top: 120px; flex-direction: column; gap: 8px; width: 296px; }
  .rp-notes .k-annot-note { position: static; max-width: none; }
  .rp-cm { color: var(--cm-text-secondary); }
  .rp-focus { outline: 2px solid var(--cm-border-selected-strong); outline-offset: -2px; border-radius: 5px; }
  .k-btn.rp-focus, .k-icon-btn.rp-focus { outline-offset: 2px; }
  .rp-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 0 4px 6px 40px; line-height: 16px; list-style: none; }
  .rp-line .k-progress { width: 100%; }
  .rp-link { color: var(--cm-text-brand); cursor: pointer; }
  .rp-band { color: var(--cm-text-secondary); white-space: nowrap; }
  .k-menu .rp-band, .k-menu .rp-arg { color: var(--k-menu-ink2); }
  .rp-pre { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .rp-variant { text-decoration: underline dotted; text-underline-offset: 3px; }
  .rp-mainmenu { left: 8px; top: 44px; width: 208px; }
  .rp-algmenu { left: 212px; top: 60px; width: 260px; padding: 4px 0; }
  .rp-algmenu .k-menu-label { height: 20px; margin-top: 2px; }
  .rp-algmenu .k-menu-item { height: 22px; }
  .rp-quick { bottom: 80px; }
  .rp-quick .k-quick-list { max-height: 360px; }
  .rp-qkeys { display: flex; gap: 16px; padding: 6px 16px; border-top: 1px solid var(--cm-border); color: var(--cm-text-secondary); }
  .rp-qkeys .k-kbd { margin-right: 4px; }
  .rp-strip { background: var(--cm-bg-secondary); margin: 0 0 4px; padding-bottom: 4px; }
  .rp-striphead { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 8px 0 16px; font-weight: 550; }
  .rp-pop { left: 306px; right: auto; top: 120px; }
  .rp-placehead { display: flex; align-items: center; gap: 4px; height: 40px; padding: 0 8px 0 16px; flex: none; }
  .rp-placename { font-size: 13px; line-height: 22px; font-weight: 550; }
  .rp-runbtn { gap: 4px; padding: 0 6px; }
  .rp-placeline { padding: 0 8px 8px 16px; line-height: 16px; border-bottom: 1px solid var(--cm-border); flex: none; }
  .rp-order { font-weight: 400; font-size: var(--k-caption-fs); }
  .rp-runitem { height: auto; min-height: 32px; align-items: flex-start; padding-top: 8px; padding-bottom: 8px; }
  .rp-runitem > .k-i { margin-top: 0; }
  .rp-runname { flex: 1 1 auto; min-width: 0; white-space: normal; line-height: 16px; overflow-wrap: anywhere; }
  .rp-restype { display: flex; align-items: flex-start; gap: 6px; min-height: 48px; padding: 12px 8px 10px 8px; border-bottom: 1px solid var(--cm-border); flex: none; }
  .rp-restype > .k-i { margin-top: 4px; flex: none; }
  .rp-restype > .k-icon-btn { flex: none; margin-top: 0; }
  .rp-restype .rp-runname { padding-top: 4px; }
  .rp-notrun { margin: 8px 8px 4px 16px; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); line-height: 16px; }
  .rp-diff { color: var(--cm-text); font-weight: 550; }
  .rp-cmpmenu { left: 306px; width: 300px; }
  .rp-scopeline { padding-bottom: 2px; }
  .rp-cmd { float: right; margin: 0 0 4px 8px; }
  .rp-cmdrow { display: flex; justify-content: flex-end; padding: 8px 8px 4px 16px; }
  .rp-runline { display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 16px; color: var(--cm-text-secondary); font-size: 11px; border-bottom: 1px solid var(--cm-border); margin: -8px 0 4px; background: var(--cm-bg-secondary); }
  .rp-stateline { padding: 8px 8px 8px 16px; line-height: 16px; }
  .rp-subhead { display: flex; gap: 6px; align-items: center; height: 32px; padding: 0 8px 0 16px; font-weight: 550; border-top: 1px solid var(--cm-border); margin-top: 4px; }
  .rp-subhead.rp-empty { color: var(--cm-text-secondary); }
  .rp-changed { display: inline-block; width: 6px; height: 6px; border-radius: 3px; background: var(--cm-bg-brand); margin-right: 4px; vertical-align: 1px; }
  .rp-under { padding: 2px 8px 0 16px; font-size: 11px; line-height: 15px; grid-column: 1 / -1; }
  .rp-held { margin: 4px 8px 4px 16px; padding: 6px 8px; border-radius: 5px; background: var(--cm-bg-secondary); line-height: 16px; }
  .rp-held-cmds { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
  .rp-verb { color: var(--cm-text); }
  .rp-verb[aria-disabled="true"] { color: var(--cm-text-disabled, var(--cm-text-tertiary)); }
  .rp-off .k-ellipsis { color: var(--cm-text-secondary); }
  .rp-hist { height: 48px; }
  .rp-axis { display: flex; justify-content: space-between; margin: 0 8px 0 16px; color: var(--cm-text-tertiary); font-size: var(--k-caption-fs); }
  .rp-axis-note { margin: 0 8px 4px 16px; color: var(--cm-text-tertiary); font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); }
  .rp-prose { padding: 2px 8px 8px 16px; line-height: 16px; }
  .rp-foot { display: flex; align-items: center; gap: 8px; padding: 8px 8px 0 16px; border-top: 1px solid var(--cm-border); margin-top: 4px; }
  .rp-error { margin: 8px 8px 4px 16px; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); box-shadow: inset 3px 0 0 var(--cm-text-danger); line-height: 16px; }
  .rp-route { gap: 8px; height: auto; min-height: 40px; align-items: flex-start; padding-top: 4px; padding-bottom: 4px; line-height: 16px; }
  .rp-route > .k-i { margin-top: 1px; }
  .rp-varval { display: flex; align-items: center; height: 24px; line-height: 16px; }
  .rp-info { position: absolute; z-index: 35; left: 306px; right: auto; width: 260px; padding: 8px 12px; border-radius: 8px; background: var(--cm-bg); color: var(--cm-text); box-shadow: var(--cm-elevation-300); line-height: 16px; font-size: 11px; }
  .rp-rowtip { left: auto !important; right: 249px; }
  .rp-ticks { position: relative; height: 16px; font-size: var(--k-caption-fs); line-height: var(--k-caption-lh); color: var(--cm-text-secondary); }
  .rp-ticks span { position: absolute; transform: translateX(-50%); }
  .rp-ticks span:first-child { transform: none; }
  .rp-ticks span:last-child { transform: translateX(-100%); }
  .rp-size b { display: block; border-radius: 50%; background: #808080; margin: 0 auto 2px; }
  .rp-size { font-size: var(--k-caption-fs); color: var(--cm-text-secondary); }
  .k-annot-note code { font-size: 11px; }
  .rp-state .k-legend-card { left: auto; right: 56px; }
  .rp-i { display: inline-grid; place-items: center; width: 16px; height: 16px; margin: 0 1px 0 2px; vertical-align: -3px; color: var(--cm-text-secondary); cursor: help; }
  .rp-fm { display: inline-grid; place-items: center; margin-left: 3px; color: var(--cm-text); vertical-align: -1px; }
  .rp-stable { padding-top: 4px; }
  .rp-colhead { color: var(--cm-text-secondary); font-size: 11px; }
  .rp-colhead .k-name, .rp-colhead .k-value { color: var(--cm-text-secondary); }
  .rp-rec { width: 280px; padding: 8px 12px 10px; }
  .rp-rec-head { display: flex; align-items: center; gap: 6px; height: 28px; margin-bottom: 4px; }
  .rp-rec-head b { font-weight: 550; flex: none; }
  .rp-rec dl { display: grid; grid-template-columns: 92px 1fr; gap: 4px 8px; margin: 0; font-size: 11px; line-height: 16px; }
  .rp-rec dt { color: var(--cm-text-secondary); }
  .rp-rec dd { margin: 0; color: var(--cm-text); }
  .rp-state .k-dock .k-table td .k-chit { display: inline-block; vertical-align: -1px; margin-right: 4px; }
  .rp-state .k-dock .k-table th .k-i { vertical-align: -2px; margin-left: 2px; }
  .rp-wrapval { white-space: normal; text-align: end; }
  .rp-looklbl { font-weight: 450; }
  .rp-look { padding: 0 4px; font-weight: 450; }
  .rp-layer { gap: 6px; }
  .rp-grip { margin-left: -12px; }
  .rp-topwins { padding: 2px 8px 0 16px; font-size: 11px; }
  .rp-pathchip { display: inline-block; width: 16px; height: 4px; border-radius: 2px; background: var(--cm-text); flex: none; }
  .rp-nval { padding-top: 0; margin-top: -6px; }
  .rp-rank { min-width: 0; }
  .rp-run .k-value { color: var(--cm-text); }
  .k-data.rp-run .k-value { flex: 1 1 auto; min-width: 0; white-space: normal; text-align: end; }
"""

SCRIPT = """
  var q = new URLSearchParams(location.search);
  if (q.has("notes")) document.getElementById("annot").checked = true;
  if (q.get("theme")) document.documentElement.setAttribute("data-theme", q.get("theme"));
  // Open the options popover's row into view, then top-align every popover to what it belongs to,
  // clamped so it never runs off the bottom of the 900 px frame.
  document.querySelectorAll(".rp-state").forEach(function (st) {
    var o = st.querySelector('.k-panel [aria-label="Edit options"][aria-expanded="true"]');
    if (o) { var s = o.closest(".k-scroll"); s.scrollTop = o.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - 120; }
  });
  function place() { document.querySelectorAll("[data-anchor]").forEach(function (p) {
    var st = p.closest(".rp-state"), a = st.querySelector(p.dataset.anchor);
    if (!a) return;
    var top = Math.round(a.getBoundingClientRect().top - st.getBoundingClientRect().top) + (+p.dataset.dy || 0);
    p.style.top = Math.max(8, Math.min(top, 892 - p.offsetHeight)) + "px";
  }); }
  place();
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
"""


def render():
    toc = "".join(f'<a href="#{f["id"]}">{k}. {f["title"].split(":")[0]}</a>' for k, f in enumerate(F, 1))
    out = [
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=1440">',
        f"<title>Results place: {len(F)} states</title>",
        '<link rel="stylesheet" href="../kit/cm.css">\n<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>',
        f"<style>{CSS}</style>\n</head>\n<body>",
        "<!-- Written by screens/results-panel.py: edit that and run it. The Notes toggle is a checkbox, so the annotation layer needs no script. ?notes turns it on, ?theme=dark|light forces a theme. -->",
        '<input type="checkbox" id="annot" hidden>',
        f'<div class="rp-bar"><a href="../index.html">Gallery</a><span class="rp-title">Results: the rail place for runs</span>'
        f'<span class="k-secondary">{len(F)} states, each 1440 x 900</span>{toc}<span class="k-grow"></span>'
        '<label for="annot" class="rp-toggle">Notes: framework section and compact-mantine component</label></div>',
    ]
    for k, f in enumerate(F, 1):
        prev = F[k - 2]["id"]
        nxt = F[k % len(F)]["id"]
        half = (len(f["notes"]) + 1) // 2
        col = lambda notes, x: (
            f'<div class="rp-notes" style="left:{x}px">' + "".join(f'<div class="k-annot-note">{n}</div>' for n in notes) + "</div>" if notes else ""
        )
        alias = f'<span id="{f["alias"]}"></span>' if f["alias"] else ""
        out.append(
            f'<section class="rp-state" id="{f["id"]}" aria-label="{f["title"]}">{alias}'
            f'<div class="k-app">{f["app"]}</div>{f["overlays"]}'
            f'<div class="rp-label"><span class="k-step">{k}</span>{f["title"]}<label for="annot" class="rp-toggle">Notes</label>'
            f'<a href="#{prev}">&lsaquo;</a><a href="#{nxt}">&rsaquo;</a></div>'
            f'<div class="rp-spoken"><b>Screen reader hears:</b> {f["spoken"]}</div>'
            + col(f["notes"][:half], 600) + col(f["notes"][half:], 900) + "</section>"
        )
    out.append(f"<script>{SCRIPT}</script>\n</body>\n</html>\n")
    html = "\n".join(out)
    assert all(ord(c) < 128 for c in html), "non-ASCII in output"
    open(os.path.join(P, "screens/results-panel.html"), "w").write(html)
    # The current frame (the rail with Results, one right panel): kit/shell.mjs
    subprocess.run(["node", os.path.join(P, "kit/shell.mjs"), os.path.join(P, "screens/results-panel.html")], check=True)
    print(f"wrote screens/results-panel.html: {len(F)} states")


render()
