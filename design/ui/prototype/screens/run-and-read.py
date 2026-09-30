#!/usr/bin/env python3
"""Writes screens/run-and-read.html (edit this, then run it from anywhere).
State 5a (catalog-transfers) was added to the page by hand: port it before running this script.

Every number comes from kit/fixtures.json: ppi (300 proteins), citations (124,318 patents,
betweennessCost and sampledBetweenness), transactions (the March transfers; money in against
links in from scenarios.runAndReadMoney, written by screens/run-and-read-numbers.mjs) and lesmis
(betweenness on the first filter step, 60 of 77). Catalog band words other than betweenness's
follow screens/results-panel.html, so the two mocks agree.
"""
import json, os

P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX = json.load(open(os.path.join(P, "kit/fixtures.json")))
fx = FX["datasets"]
ppi, cit = fx["ppi"], fx["citations"]
trn, les = fx["transactions"], fx["lesmis"]
MONEY = FX["scenarios"]["runAndReadMoney"]
FS = les["filterSteps"]
SUB_N, LES_N = FS["after"]["step1"], les["nodes"]
SUB = f"on {SUB_N} of {LES_N}"  # the scope every value computed on the first filter step carries
BOS1 = FS["betweennessOnStep1"]
VAL_FULL = next(r for r in les["rows"] if r["label"] == "Valjean")
TN, TE = f'{trn["nodes"]:,}', f'{trn["edges"]:,}'
TP = trn["frame"]["project"]
USD = lambda v: f"${v:,}"
cost, samp = cit["betweennessCost"], cit["sampledBetweenness"]
bc = ppi["encodings"]["betweenness"]
K = samp["k"]  # the proposed default sample size, as screens/option-form-cost.html
kd = next(s for s in cost["sampled"] if s["k"] == K)
k100 = next(s for s in cost["sampled"] if s["k"] == 500)  # the larger re-run that failed
kset = cost["keptSets"][0]
assert cost["exact"]["band"] == "hours" and not cost["exact"]["withinBudget"]
assert kd["withinBudget"] and kset["exact"]["withinBudget"]
assert K == cost["largestKWithinBudget"] and samp["seed"] == 7 and samp["directed"]
CAUSE = f"Not run: would take about {round(cost['exact']['seconds'] / 3600)} hours. The time limit is {cost['budgetSeconds']} seconds."  # as screens/results-panel.html
PROP = '<span class="k-annot-tag rr-prop">proposed</span>'
PN, PE = f'{ppi["nodes"]:,}', f'{ppi["edges"]:,}'
CN, CE = f'{cit["nodes"]:,}', f'{cit["edges"]:,}'
CT = cit["title"]
CAP = cost["budgetSeconds"]
MC = ppi["moduleColors"]
TOPB = ppi["topByBetweenness"]
tp53 = next(r for r in TOPB if r["id"] == "TP53")


SEL = ' aria-selected="true"'
PRESSED = ' aria-pressed="true"'
DISABLED = ' aria-disabled="true"'


def i(name, cls=""):
    return f'<svg class="k-i {cls}"><use href="../kit/icons.svg#{name}"/></svg>'


def rail(pressed="Results"):
    """The rail as kit/template.html draws it: main menu, Graph, Data, Results, Notes, Assistant."""
    b = lambda icon, word: (
        f'<div class="k-rail-btn" role="button" aria-pressed="{"true" if word == pressed else "false"}">'
        f'<span class="k-rail-pill">{i(icon)}</span>{word}</div>'
    )
    return (
        f'<nav class="k-rail" aria-label="Main"><div class="k-rail-btn" role="button" aria-label="Main menu"><span class="k-rail-pill">{i("menu")}</span></div><div class="k-rail-sep"></div>'
        + b("network", "Graph") + b("database", "Data") + b("flask-conical", "Results") + b("sticky-note", "Notes")
        + '<div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div></nav>'
    )


TOOLBAR = (
    '<div class="k-toolbar" role="toolbar">'
    f'<span class="k-tool" aria-pressed="true">{i("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">{i("chevron-down", "k-i-sm")}</span>'
    f'<span class="k-tool">{i("route", "k-i-lg")}</span><span class="k-toolbar-sep"></span>'
    f'<span class="k-tool">{i("zap", "k-i-lg")}</span><span class="k-toolbar-sep"></span>'
    f'<span class="k-tool">{i("square", "k-i-lg")}</span><span class="k-tool-caret">{i("chevron-down", "k-i-sm")}</span></div>'
)

# ---------- the catalog ----------
VARIANT = '<span class="rr-variant">WF-corrected</span>'
PRECOND = '<span class="rr-pre"><span class="k-warn-glyph">!</span>3 components</span>'
CATALOG = [
    ("Centrality", ["Betweenness", "Closeness", "Eigenvector", "Harmonic centrality", "HITS", "Katz", "PageRank"]),
    ("Community", ["Girvan-Newman", "Label propagation", "Leiden", "Louvain"]),
    ("Structure", ["K-core", "Topological sort"]),
]
# Marks on the protein graph (undirected, 3 components); no band word, every entry is under 10 s here.
PPI_MARKS = {"Closeness": VARIANT, "Eigenvector": PRECOND, "Topological sort": '<span class="k-tertiary">needs direction</span>'}
# Band words on the citation graph: betweenness from the fixture's cost model, the rest as screens/results-panel.html.
CIT_BANDS = {
    "Betweenness": cost["exact"]["band"], "Closeness": "hours", "Eigenvector": "under a minute", "Harmonic centrality": "hours",
    "HITS": "under a minute", "Katz": "under a minute", "PageRank": "under a minute", "Girvan-Newman": "over a day",
    "Leiden": "under a minute", "Louvain": "under a minute", "K-core": "under a minute",
}
CIT_MARKS = {k: f'<span class="rr-band-word">{v}</span>' for k, v in CIT_BANDS.items()}
CIT_MARKS_CPU = dict(CIT_MARKS, **{k: '<span class="rr-band-word">a few minutes</span>' for k in ["Eigenvector", "HITS", "Katz", "PageRank"]})


# The Degree family: a link count says "(count)"; weighted degree takes the weight column's words, the
# money words when the column is a currency, "Total <column>" otherwise. None where there is no
# numeric edge column. Weighted degree in the catalog is proposed to graphty-element.
DEG_PPI = ["Links (count)", "Total confidence"]
DEG_CIT = ["Links in (count)", "Links out (count)", "Links (count)"]
DEG_TRN = ["Links in (count)", "Links out (count)", "Links (count)", "Money in", "Money out", "Money in minus out"]
DEG_LES = ["Links (count)", "Total value"]
DEG_ABOUT = {
    "Links in (count)": "How many transfers come in to each account. A count, not dollars.",
    "Money in": "The sum of amount on the transfers into each account, in dollars.",
}


def catalog_menu(marks, hover=None, degree=DEG_PPI, left_px=170, top_px=128):
    """The catalog, as the menu 'Run a measure...' opens (the main menu's Algorithms and Quick actions list the same)."""
    out = ""
    for fam, names in [("Degree", degree)] + CATALOG:
        out += f'<div class="k-menu-label">{fam}</div>'
        for n in names:
            m = marks.get(n, "")
            attrs = (" data-hover" if n == hover else "") + (' aria-disabled="true"' if "needs" in m else "")
            out += f'<div class="k-menu-item"{attrs}><span class="k-check-col"></span>{n}<span class="k-shortcut">{m}</span></div>'
    return f'<div class="k-menu rr-catmenu" role="menu" aria-label="Run a measure" style="left:{left_px}px;top:{top_px}px">{out}</div>'


def row(name, icon="sigma", trail="", sel=False, focus=False, line=""):
    """A run's row; a second line (progress, state) sits inside the row, so selection and focus cover both."""
    a = (' aria-selected="true"' if sel else "")
    cls = "k-item" + (" rr-hasline" if line else "") + (" rr-focus" if focus else "")
    return (
        f'<li class="{cls}"{a}>{i(icon)}<span class="k-ellipsis rr-rowname">{name}</span>'
        f'<span class="k-trail">{trail}</span>' + (f'<span class="rr-rowline">{line}</span>' if line else "") + "</li>"
    )


NOT_RUN = '<span class="k-secondary">Not run</span>'  # a refused or unrun result carries no failure mark


def chip(text="Full graph"):
    return f'<span class="k-chip k-chip-btn" role="button" aria-expanded="false">{i("funnel", "k-i-sm")}{text}{i("chevron-down", "k-i-sm k-caret")}</span>'


def panel_head(project, chip_text="Full graph"):
    return (
        '<div class="k-panel-head"><div class="k-title-line">'
        f'<span class="k-project">{project}</span>{i("chevron-down", "k-i-sm k-secondary")}</div>'
        f'<a class="k-privacy">Nothing has been sent from this project</a>{chip(chip_text)}</div>'
    )


def left(project, rows, strip="", chip_text="Full graph", menu_open=False):
    """The Results rail place, its list: every run of a measure, newest first; 'Run a measure...' starts one."""
    exp = ' aria-expanded="true"' if menu_open else ""
    return (
        f'<aside class="k-panel" aria-label="Results">{panel_head(project, chip_text)}'
        '<div class="rr-placehead"><span class="rr-placename">Results</span><span class="k-grow"></span>'
        f'<span class="k-btn k-btn-ghost rr-runbtn" aria-haspopup="menu"{exp}>{i("plus", "k-i-sm")}Run a measure...</span></div>'
        '<div class="rr-placeline k-secondary">Every run of a measure, with its settings and date.</div>'
        f'<div class="k-scroll">{strip}<section class="k-section"><div class="k-section-head">Runs</div><ul class="k-list">{rows}</ul></section></div></aside>'
    )


def opened(project, name, body, chip_text="Full graph", icon="sigma"):
    """An opened run, in place in the Results place: back to the list, its name, then its record."""
    return (
        f'<aside class="k-panel" aria-label="Results">{panel_head(project, chip_text)}'
        f'<div class="rr-restype"><span class="k-icon-btn" title="All results (Esc)">{i("chevron-left")}</span>{i(icon)}'
        f'<span class="rr-runname k-strong">{name}</span></div><div class="k-scroll">{body}</div></aside>'
    )


def stateline(cmd, text):
    """The state line; the run's one command sits at its head."""
    head = f'<span class="rr-cmd">{cmd}</span>' if cmd else ""
    return f'<div class="rr-stateline">{head}{text}</div>'


def btn(text, kind="", disabled=False, focus=False):
    return f'<span class="k-btn{" " + kind if kind else ""}{" rr-focus" if focus else ""}"{DISABLED if disabled else ""}>{text}</span>'


RERUN_BTN = btn("Re-run (keeps Run 1)", "k-btn-secondary", disabled=True)  # enabled once an option differs from the run shown


def options(rows):
    """The run's options, read here; the sliders button opens the options popover beside the panel."""
    return (
        f'<div class="rr-subhead">Options<span class="k-grow"></span><span class="k-icon-btn" title="Edit options">{i("sliders-horizontal")}</span></div>'
        + "".join(f'<div class="k-data"><span class="k-name">{k}</span><span class="k-value k-num">{v}</span></div>' for k, v in rows)
    )


def runs_of(items, compare=True):
    """items: (label, options that differ and date, state). The run whose values are shown says 'shown'."""
    sec = lambda st: f' <span class="k-secondary">{st}</span>' if st else ""
    r = "".join(
        f'<div class="k-data"><span class="k-name" style="color:var(--cm-text);flex:none">{lab}</span><span class="k-value rr-wrapval">{det}{sec(st)}</span></div>'
        for lab, det, st in items
    )
    n = f'<span class="k-secondary k-num">{len(items)}</span>' if items else '<span class="k-secondary">none yet</span>'
    cmp_ = (
        f'<div class="k-row rr-verb" role="button" aria-haspopup="menu"{"" if compare else DISABLED}>{i("git-compare-arrows", "k-secondary")}'
        '<span class="k-grow">Compare with another run...</span></div>'
    )
    return f'<div class="rr-subhead">Runs of this measure {n}</div>{r}{cmp_}'


def left_graph():
    """The Graph panel on the patents: where the kept set the refusal offers lives."""
    return (
        f'<aside class="k-panel" aria-label="Graph">{panel_head(CT)}<div class="k-scroll">'
        f'<section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn">{i("plus")}</span></div>'
        f'<ul class="k-list"><li class="k-item"{SEL}>{i("network")}<span class="k-grow k-ellipsis">Citations</span><span class="k-trail k-num">{CN} nodes</span></li></ul></section>'
        f'<section class="k-section"><div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn">{i("plus")}</span></div>'
        f'<ul class="k-list"><li class="k-item">{i("group")}<span class="k-ellipsis">{kset["name"]}</span><span class="k-kind">rule</span><span class="k-trail k-num">{kset["nodes"]:,}</span></li></ul></section>'
        f'<section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span><span class="k-icon-btn">{i("plus")}</span></div>'
        '<ul class="k-list"><li class="k-item"><span class="k-chit" style="background:#808080"></span><span class="k-ellipsis">Base style</span></li></ul></section>'
        '<section class="k-section" data-collapsed><div class="k-section-head">Views</div></section></div></aside>'
    )


TOAST_HOURS = (
    f'<div class="k-toast">{i("loader-circle")}Running Betweenness<div class="k-progress"><i style="width:3%"></i></div>'
    '<span style="color:var(--k-menu-ink2)">hours</span><span class="k-toast-action">Cancel</span></div>'
)


# ---------- canvas ----------
def ppi_canvas(drawing, alt, extra="", dock=""):
    top3 = sorted(ppi["attributes"][1]["values"].items(), key=lambda kv: -kv[1])[:3]
    legend = (
        '<div class="k-legend-card"><div class="k-lg-title">Module color <span class="k-secondary">module</span></div>'
        + "".join(f'<div class="k-lg-row"><span class="k-chit" style="background:{MC[m]}"></span>{m}<span class="k-value k-num">{n}</span></div>' for m, n in top3)
        + '<div class="k-lg-row k-secondary">6 more</div></div>'
    )
    return (
        f'<main class="k-main"><div class="k-canvas"><div class="k-stage">'
        f'<img class="k-light-only" src="../kit/canvas/{drawing}-light.svg" alt="{alt}"><img class="k-dark-only" src="../kit/canvas/{drawing}-dark.svg" alt="{alt}"></div>'
        f'{legend}<div class="k-toolbar-dock">{extra}{TOOLBAR}</div><span class="k-help">{i("circle-help")}</span></div>{dock}</main>'
    )


def cit_canvas(dock="", toast=""):
    return (
        '<main class="k-main"><div class="k-canvas"><div class="k-legend-card">'
        f'<div class="k-notdrawn k-num" style="border:0;margin:0;padding:0">{cit["notDrawnLine"]}. <a>Narrow the graph...</a></div></div>'
        f'<div class="k-toolbar-dock">{toast}{TOOLBAR}</div><span class="k-help">{i("circle-help")}</span></div>{dock}</main>'
    )


# ---------- inspector ----------
# One header row: the zoom. No avatar and no Export button (Export... is in the project-name menu and the Data panel).
HEADERS = f'<div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%{i("chevron-down", "k-i-sm")}</span></div>'
EXPORT = ""


def metric(label, value):
    return f'<div class="k-metric"><span class="k-secondary">{label}</span><span class="k-big k-num">{value}</span></div>'


def ppi_right(layout_sel=False):
    st = ppi["stats"]
    lay = (
        f'<div class="k-row"{SEL if layout_sel else ""}>{i("spline", "k-secondary")}<span class="k-grow">Force-directed</span><span class="k-btn k-btn-secondary">Run layout</span></div>'
    )
    if layout_sel:
        lay += '<div class="rr-rowline2 k-secondary k-num">ForceAtlas2 on the full graph, from the current positions, seed 7. 3 pinned. <a class="rr-link">Unpin all</a></div>'
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEADERS}<div class="k-typerow">{i("network")}<span class="k-name">Interactions</span><span class="k-secondary">Graph</span></div>'
        f'<div class="k-scroll"><section class="k-section"><div class="k-section-head">Graph<span class="k-grow"></span><span class="k-icon-btn">{i("palette")}</span></div>'
        f'<div class="k-row">{i("layers", "k-secondary")}<span class="k-grow">Background</span><span class="k-chit" style="background:var(--k-canvas)"></span></div>{lay}</section>'
        '<section class="k-section"><div class="k-section-head">Statistics</div>'
        '<div class="k-row"><span class="k-grow" style="white-space:nowrap">Overview: General</span><span class="k-btn k-btn-ghost" style="padding-inline:4px">Change overview...</span></div>'
        f'<div class="k-metrics">{metric("nodes", PN)}{metric("edges", PE)}{metric("components", st["components"])}{metric("average degree", st["averageDegree"])}</div>'
        '<div class="k-row"><span class="k-grow">Edges</span><span class="k-secondary">undirected; confidence: each run that uses it asks what it means</span></div>'
        f'<div class="k-row k-secondary">4 more</div></section>{EXPORT}</div></aside>'
    )


def cit_right(engine="WebGPU"):
    density = cit["edges"] / (cit["nodes"] * (cit["nodes"] - 1))
    avg = cit["edges"] * 2 / cit["nodes"]
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEADERS}<div class="k-typerow">{i("network")}<span class="k-name">{CT}</span><span class="k-secondary">Graph</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Statistics</div>'
        f'<div class="k-metrics">{metric("nodes", CN)}{metric("edges", CE)}{metric("density", f"{density:.6f}")}{metric("average total degree", f"{avg:.1f}")}</div>'
        '<div class="k-row"><span class="k-grow">Edges</span><span class="k-secondary">directed; no numeric edge column</span></div>'
        f'<div class="k-row"><span class="k-grow">Engine</span><span class="k-secondary">{engine}</span></div>'
        f'<div class="k-row k-secondary">4 more</div></section>{EXPORT}</div></aside>'
    )


def tp53_right():
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEADERS}<div class="k-typerow">{i("circle-dot")}<span class="k-name k-id">TP53</span><span class="k-secondary">Node</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Attributes</div>'
        f'<div class="k-data rr-two"><span class="k-name">betweenness</span><span class="k-value k-num">{tp53["betweenness"]}</span>'
        f'<span class="rr-rank k-secondary k-num">#2 of {PN}, on: full graph</span></div>'
        f'<div class="k-data"><span class="k-name"><span class="k-chit" style="background:{MC["DNA repair"]};vertical-align:-2px;margin-inline-end:6px"></span>module</span><span class="k-value">DNA repair</span></div>'
        f'<div class="k-data"><span class="k-name">degree</span><span class="k-value k-num">{tp53["degree"]}</span></div>'
        f'<div class="k-data"><span class="k-name">log2FoldChange</span><span class="k-value k-num">{tp53["log2FoldChange"]}</span></div>'
        '<div class="k-row k-secondary">1 more</div></section>'
        f'<section class="k-section"><div class="k-section-head">Memberships</div><div class="k-row">{i("group")}<span class="k-grow">Connected components</span><span class="k-secondary">1 of 3</span></div></section>'
        '<section class="k-section"><div class="k-section-head">Appearance</div><div class="k-fieldrow"><span class="k-legend">Color <span class="k-tertiary">-- Module color</span></span>'
        f'<div class="k-fields"><span class="k-field k-span"><span class="k-pill"><span class="k-chit" style="background:{MC["DNA repair"]}"></span>module</span></span></div></div></section>'
        f"{EXPORT}</div></aside>"
    )


# ---------- editor pieces ----------
def hist(counts, on=None, titles=True):
    mx = max(counts)
    bars = "".join(
        f'<i{" data-on" if k == on else ""} style="height:{0 if c == 0 else max(4, round(c / mx * 100))}%"{f" title={chr(34)}{c:,}{chr(34)}" if titles else ""}></i>' for k, c in enumerate(counts)
    )
    return f'<div class="k-hist rr-hist">{bars}</div>'


def data(name, value):
    return f'<div class="k-data"><span class="k-name">{name}</span><span class="k-value k-num">{value}</span></div>'


def top_row(n, ident, value, sel=False):
    return (
        f'<div class="k-data{" rr-topsel" if sel else ""}"><span class="k-num k-tertiary" style="width:14px">{n}</span>'
        f'<span class="k-name k-id" style="color:var(--cm-text)">{ident}</span><span class="k-value k-num">{value}</span></div>'
    )


def field(legend, value, caret=True, extra=""):
    c = i("chevron-down", "k-i-sm k-caret") if caret else ""
    return f'<div class="k-fieldrow"><span class="k-legend">{legend}</span><div class="k-fields"><span class="k-field k-span">{value}{c}</span>{extra}</div></div>'


def popover(head, body, left=306, top=128, width=240):
    return f'<div class="k-popover rr-pop" style="left:{left}px;top:{top}px;width:{width}px"><div class="k-popover-head">{head}</div><div class="k-popover-body">{body}</div></div>'


def head(name, *btns, close=True):
    return f'<span class="k-ellipsis">{name}</span><span class="k-grow"></span>' + "".join(btns) + (f'<span class="k-icon-btn">{i("x")}</span>' if close else "")


APPEAR_OFF = (
    '<div class="rr-subhead">Appearance</div>'
    f'<div class="k-row" data-off><svg class="k-sizechip" viewBox="0 0 16 12"><circle cx="3" cy="8" r="2" fill="#808080"/><circle cx="10" cy="6" r="5" fill="#808080"/></svg><span class="k-grow k-secondary">Betweenness sizes</span>'
    f'<span class="k-icon-btn" title="Show on canvas">{i("eye-off")}</span></div>'
)


def ppi_editor(on_tp53=False):
    h = bc["histogram12"]
    tops = "".join(top_row(n + 1, r["id"], f'{r["betweenness"]:.4f}', sel=on_tp53 and r["id"] == "TP53") for n, r in enumerate(TOPB[:5]))
    on = min(11, int(tp53["betweenness"] / bc["domain"][1] * 12)) if on_tp53 else None
    body = (
        stateline(RERUN_BTN, f'on: full graph, {PN} nodes, {ppi["stats"]["components"]} components<br>'
                  '<span class="k-secondary">Exact. Unweighted, undirected. CPU.</span> <a class="rr-link">Details</a>')
        + '<div class="rr-subhead">Top nodes</div>' + tops
        + f'<div class="k-row rr-link">{ppi["nodes"] - 5} more in the table</div>'
        + f'<div class="rr-subhead">Distribution <span class="k-secondary">{PN} nodes</span></div>'
        + hist(h, on)
        + f'<div class="rr-axis k-num"><span>0</span><span>{bc["domain"][1] / 2:.3f}</span><span>{bc["domain"][1]}</span></div>'
        + data("middle", f'{bc["median"]:.4f}') + data("highest", f'{TOPB[0]["betweenness"]:.4f}') + data("zero", f'{bc["zeros"]} nodes')
        + options([("Scope", "Full graph"), ("Weight", "None for this run")])
        + runs_of([("Run 1", RUN_PPI_DATE, "shown")])
        + APPEAR_OFF
    )
    return opened(PPI_P, RUN_PPI, body)


def approx(v):
    return "~0" if v == 0 else f"~{v:g}"


def sampled_editor():
    tops = "".join(top_row(n + 1, t["id"], approx(t["betweenness"])) for n, t in enumerate(samp["top"][:5]))
    body = (
        stateline(RERUN_BTN, f'on: full graph, {CN} nodes<br><span class="k-secondary">Estimated from {K} sources, seed {samp["seed"]}. '
                  'Directed, unweighted. WebGPU.</span> <a class="rr-link">Details</a>')
        + f'<div class="k-row rr-verb" role="button">{i("play", "k-secondary")}<span class="k-grow">Run exactly</span><span class="rr-band rr-over">{cost["exact"]["band"]}</span></div>'
        + '<div class="rr-subhead">Top nodes <span class="k-secondary">estimated</span></div>' + tops
        + f'<div class="k-row rr-link">{cit["nodes"] - 5:,} more in the table</div>'
        + f'<div class="rr-subhead">Distribution <span class="k-secondary">{CN} nodes, estimated</span></div>'
        + hist(samp["histogram12"])
        + f'<div class="rr-axis k-num"><span>0</span><span>{approx(samp["highest"] / 2)}</span><span>{approx(samp["highest"])}</span></div>'
        + data("middle", approx(samp["middle"])) + data("highest", approx(samp["highest"])) + data("estimated 0", f'{samp["estimatedZero"]:,} nodes')
        + options([("Scope", "Full graph"), ("Sample size", f"{K} of {CN}"), ("Seed", f'{PROP} {samp["seed"]}')])
        + runs_of([("Run 1", f"{K} sources, Sep 29 10:20", "shown")])
    )
    return opened(CT, SAMP_RUN, body)


def choice(title, sub, band, verb, over=False, focus=False):
    return (
        f'<div class="rr-choice{" rr-focus" if focus else ""}"><div class="rr-ch-text"><b>{title}</b><span class="k-secondary">{sub}</span></div>'
        f'<div class="rr-ch-side"><span class="rr-band{" rr-over" if over else ""}">{band}</span><span class="k-btn k-btn-secondary">{verb}</span></div></div>'
    )


def sample_rows(k):
    return (
        f'<div class="k-fieldrow"><span class="k-legend">Sample size {i("info", "k-i-sm k-secondary")}</span><div class="k-fields"><span class="k-field k-num">{k}</span><span class="k-field k-secondary k-num rr-plain">of {CN}</span></div></div>'
        f'<div class="k-fieldrow"><span class="k-legend">Seed {PROP}</span><div class="k-fields"><span class="k-field k-num">{samp["seed"]}</span><span class="k-icon-btn" title="New seed">{i("refresh-cw")}</span></div></div>'
    )


def route(label, band, selected=False, sub=""):
    sub = f'<span class="rr-route-sub k-secondary">{sub}</span>' if sub else ""
    return (
        f'<div class="k-row rr-route{" rr-focus" if selected else ""}"{SEL if selected else ""}><span class="k-grow rr-route-text"><span>{label}</span>{sub}</span>'
        f'<span class="rr-band-word">{band}</span></div>'
    )


def refused_editor():
    body = (
        f'<div class="rr-notrun" role="status"><b>{CAUSE}</b>'
        f'<br><span class="k-secondary">Directed, on the full graph: {CN} nodes.</span> <a class="rr-link">Details</a><br><span class="k-mono k-tertiary">E_CAP_EXCEEDED</span></div>'
        '<div class="rr-group">Fits the time limit</div>'
        + route(f"Sampled, {K} sources", kd["band"], selected=True)
        + route(f'Exact, on the {kset["nodes"]:,} nodes in {kset["name"]}', kset["exact"]["band"], sub="This is a different graph.")
        + '<div class="rr-group">Past the time limit</div>'
        + route("Exact, on the full graph", cost["exact"]["band"])
        + f'<div class="rr-cmdrow">{btn("Run sampled")}</div>'
    )
    return opened(CT, "Betweenness, exact", body)


def failed_editor():
    body = (
        f'<div class="rr-error"><b>Could not run {samp["name"]}, {k100["k"]} sources:</b> WebGPU was lost.'
        '<div class="k-tertiary k-mono" style="margin-top:4px">E_DEVICE_LOST</div></div>'
        + stateline(btn("Try WebGPU again", focus=True), f'Showing Run 1 ({K} sources). Run 2 wrote nothing. <a class="rr-link">Details</a>')
        + '<div class="rr-subhead">Top nodes <span class="k-secondary">Run 1, estimated</span></div>'
        + "".join(top_row(n + 1, t["id"], approx(t["betweenness"])) for n, t in enumerate(samp["top"][:3]))
        + options([("Scope", "Full graph"), ("Sample size", f'{k100["k"]} of {CN}'), ("Seed", f'{PROP} {samp["seed"]}')])
        + runs_of([("Run 2", f'{k100["k"]} sources, Sep 29 10:40', "failed"), ("Run 1", f"{K} sources, Sep 29 10:20", "shown")])
    )
    return opened(CT, SAMP_RUN, body)


def unrun_editor():
    body = (
        stateline(btn("Run", focus=True), f'Not run yet. Run takes <span class="rr-band">a few minutes</span> on the CPU: this browser has no WebGPU.<br>'
                  f'<span class="k-secondary">on: full graph, {CN} nodes. Directed.</span>')
        + options([("Scope", "Full graph"), ("Direction", "Along edges"), ("Damping", "0.85")])
        + runs_of([], compare=False)
        + '<div class="rr-subhead">Appearance</div><div class="rr-prose k-secondary">Show as style layer is available once it has run.</div>'
    )
    return opened(CT, "PageRank", body)


RUN_LAYOUT = '<span class="k-btn">Run layout</span>'


def layout_editor():
    body = (
        '<div class="rr-stateline k-secondary">Edits wait for Run layout</div>'
        + field("Layout", "Force-directed") + field("Method", "ForceAtlas2")
        + f'<div class="k-fieldrow"><span class="k-legend">Scope <span class="k-tertiary">-- 0 hidden</span></span><div class="k-fields"><span class="k-field k-span">Full graph, {PN} nodes</span></div></div>'
        + '<div class="k-fieldrow"><span class="k-legend">Start from</span><div class="k-fields"><span class="k-seg k-seg-fill k-span"><span aria-pressed="true">Current</span><span>Fresh</span></span></div></div>'
        + '<div class="k-fieldrow"><span class="k-caption" style="display:grid;grid-template-columns:88px 88px;column-gap:8px"><span>Scaling ratio</span><span>Gravity</span></span>'
        '<div class="k-fields"><span class="k-field k-num" data-focus>10</span><span class="k-field k-num">1.0</span></div></div>'
        + '<div class="k-row"><span class="k-check" aria-checked="true"></span><span class="k-grow">Dissuade hubs</span></div>'
        + '<div class="k-row"><span class="k-check"></span><span class="k-grow">LinLog mode</span></div>'
        + '<div class="k-row k-secondary">Advanced: 5 more</div>'
    )
    return f'<div class="k-popover rr-pop" style="right:249px;top:137px;width:240px"><div class="k-popover-head">{head("Layout", RUN_LAYOUT)}</div><div class="k-popover-body">{body}</div></div>'


# ---------- tables ----------
def ppi_dock():
    rows = "".join(
        f'<tr{SEL if r["id"] == "TP53" else ""}><td class="k-id">{r["id"]}</td><td><span class="k-chit" style="background:{MC[r["module"]]}"></span>{r["module"]}</td>'
        f'<td class="k-n">{r["degree"]}</td><td class="k-n">{r["betweenness"]:.4f}</td></tr>'
        for r in TOPB[:6]
    )
    return (
        '<section class="k-dock" aria-label="Table" style="flex-basis:34%"><div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Nodes</span><span class="k-tab">Edges</span>'
        f'<span class="k-grow"></span><span class="k-icon-btn">{i("search")}</span><span class="k-icon-btn">{i("ellipsis")}</span></div>'
        f'<div class="k-scope">Full graph: {PN} nodes, 1 selected. Sorted by betweenness, highest first.</div>'
        '<div class="k-table-wrap"><table class="k-table"><thead><tr><th>id</th><th>module <span class="k-profile">9 values</span></th>'
        f'<th class="k-n">degree <span class="k-profile">0 to {ppi["stats"]["maxDegree"]}</span></th><th class="k-n">betweenness &darr; <span class="k-profile">0 to {bc["domain"][1]}</span></th></tr></thead>'
        f"<tbody>{rows}</tbody></table></div></section>"
    )


def cit_dock():
    rows = "".join(
        f'<tr><td class="k-id">{t["id"]}</td><td>{t["category"]}</td><td class="k-n">{t["grantYear"]}</td><td class="k-n">{t["citationsReceived"]}</td><td class="k-n">{approx(t["betweenness"])}</td></tr>'
        for t in samp["top"][:7]
    )
    return (
        '<section class="k-dock" aria-label="Table" style="flex-basis:36%"><div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Nodes</span><span class="k-tab">Edges</span>'
        f'<span class="k-grow"></span><span class="k-icon-btn">{i("search")}</span><span class="k-icon-btn">{i("ellipsis")}</span></div>'
        f'<div class="k-scope">Full graph: {CN} nodes. Sorted by betweenness (sampled), highest first.</div>'
        '<div class="k-table-wrap"><table class="k-table"><thead><tr><th>id</th><th>category <span class="k-profile">6 values</span></th><th class="k-n">grantYear</th>'
        f'<th class="k-n">citationsReceived</th><th class="k-n">betweenness (sampled) &darr; <span class="k-profile">~0 to {approx(samp["highest"])}</span></th></tr></thead>'
        f"<tbody>{rows}</tbody></table></div></section>"
    )


# ---------- quick actions ----------
def quick():
    names = CATALOG[0][1]
    rows = "".join(
        f'<div class="k-result"{SEL if n == "Betweenness" else ""}>{i("flask-conical")}Run {n}<span class="k-grow"></span>{PPI_MARKS.get(n, "")}</div>'
        for n in names
    )
    return (
        f'<div class="k-quick" style="bottom:auto;top:120px"><div class="k-quick-input">{i("search")}centr<span class="k-grow"></span><span class="k-kbd">Esc</span></div>'
        f'<div class="k-quick-list"><div class="k-group-head">Algorithms &middot; Centrality</div>{rows}</div></div>'
    )


# ---------- money on the transfers: Money in against Links in (count) ----------
TRN_ALT = trn["frame"]["alt"]
PICK = next(r for r in MONEY["topMoneyIn"] if r["linksRank"] > 10)  # the account a link count hides


def trn_canvas(dock=""):
    return (
        '<main class="k-main"><div class="k-canvas"><div class="k-stage">'
        f'<img class="k-light-only" src="../kit/canvas/transactions-density-light.svg" alt="{TRN_ALT}"><img class="k-dark-only" src="../kit/canvas/transactions-density-dark.svg" alt="{TRN_ALT}"></div>'
        f'<div class="k-toolbar-dock">{TOOLBAR}</div><span class="k-help">{i("circle-help")}</span></div>{dock}</main>'
    )


def trn_right(edges_line=None):
    st = trn["stats"]
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEADERS}<div class="k-typerow">{i("network")}<span class="k-name">{trn["graphName"]}</span><span class="k-secondary">Graph</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Statistics</div>'
        f'<div class="k-metrics">{metric("nodes", TN)}{metric("edges", TE)}{metric("weak components", st["components"])}{metric("average degree", st["averageDegree"])}</div>'
        f'<div class="k-row"><span class="k-grow">Edges</span><span class="k-secondary">{edges_line or trn["frame"]["edgesLine"]}</span></div>'
        '<div class="k-row k-secondary">4 more</div></section></div></aside>'
    )


def acct_right():
    r = PICK
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEADERS}<div class="k-typerow">{i("circle-dot")}<span class="k-name k-id">{r["id"]}</span><span class="k-secondary">Node</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Attributes</div>'
        f'<div class="k-data rr-two"><span class="k-name">Money in</span><span class="k-value k-num">{USD(r["moneyIn"])}</span>'
        f'<span class="rr-rank k-secondary k-num">#{r["moneyRank"]} of {TN}, on: full graph</span></div>'
        f'<div class="k-data rr-two"><span class="k-name">Links in (count)</span><span class="k-value k-num">{r["linksIn"]}</span>'
        f'<span class="rr-rank k-secondary k-num">#{r["linksRank"]} of {TN}, on: full graph</span></div>'
        f'<div class="k-data"><span class="k-name">kind</span><span class="k-value">{r["kind"]}</span></div>'
        f'<div class="rr-prose k-secondary">kind is from {trn["accountsFile"] if isinstance(trn["accountsFile"], str) else "the accounts file"}, not computed by graphty.</div>'
        "</section></div></aside>"
    )


def quick_money():
    def q(name, desc, sel=False):
        return (
            f'<div class="k-result rr-q2"{SEL if sel else ""}>{i("flask-conical")}<span class="rr-q2-text"><span>Run {name}</span>'
            f'<span class="k-secondary">{desc}</span></span></div>'
        )
    return (
        f'<div class="k-quick" style="bottom:auto;top:120px"><div class="k-quick-input">{i("search")}money<span class="k-grow"></span><span class="k-kbd">Esc</span></div>'
        '<div class="k-quick-list"><div class="k-group-head">Money: sums of amount, in dollars</div>'
        + q("Money in", "Total amount of the transfers into each account", sel=True)
        + q("Money out", "Total amount of the transfers out of each account")
        + q("Money in minus out", "What each account kept: in less out")
        + '<div class="k-group-head">Counts of transfers, not money</div>'
        + q("Links in (count)", "How many transfers come in, whatever their amount")
        + q("Links out (count)", "How many transfers go out, whatever their amount")
        + "</div></div>"
    )


def money_editor():
    tops = "".join(
        f'<div class="k-data rr-mrow{" rr-topsel" if r["id"] == PICK["id"] else ""}"><span class="k-num k-tertiary" style="width:14px">{r["moneyRank"]}</span>'
        f'<span class="k-name k-id" style="color:var(--cm-text)">{r["id"]}</span><span class="k-value k-num">{USD(r["moneyIn"])}</span>'
        f'<span class="rr-mlinks k-secondary k-num">{r["linksIn"]} links in, #{r["linksRank"]}</span></div>'
        for r in MONEY["topMoneyIn"][:5]
    )
    body = (
        stateline(RERUN_BTN, f'on: full graph, {TN} accounts<br>'
                  '<span class="k-secondary">Sum of amount, in dollars, on the transfers into each account. Directed. CPU.</span> <a class="rr-link">Details</a>')
        + '<div class="rr-subhead">Top accounts <span class="k-secondary">with Links in (count)</span></div>'
        + tops
        + f'<div class="rr-prose">{PICK["id"]} is #{PICK["moneyRank"]} by money in and #{PICK["linksRank"]} by Links in (count): {PICK["linksIn"]} transfers, fewer and larger.</div>'
        + f'<div class="k-row rr-link">{MONEY["accounts"] - 5:,} more in the table</div>'
        + options([("Sums", "amount"), ("Direction", "In")])
        + runs_of([("Run 1", MONEY_DATE, "shown")])
    )
    return opened(TP, f"Money in, {MONEY_DATE}", body)


def money_dock():
    rows = "".join(
        f'<tr{SEL if r["id"] == PICK["id"] else ""}><td class="k-id">{r["id"]}</td><td>{r["kind"]}</td>'
        f'<td class="k-n">{USD(r["moneyIn"])}</td><td class="k-n">{r["linksIn"]}</td><td class="k-n">#{r["linksRank"]}</td></tr>'
        for r in MONEY["topMoneyIn"][:6]
    )
    return (
        '<section class="k-dock" aria-label="Table" style="flex-basis:34%"><div class="k-dock-tabs"><span class="k-tab" aria-selected="true">Nodes</span><span class="k-tab">Edges</span>'
        f'<span class="k-grow"></span><span class="k-icon-btn">{i("search")}</span><span class="k-icon-btn">{i("ellipsis")}</span></div>'
        f'<div class="k-scope">Full graph: {TN} accounts, 1 selected. Sorted by Money in, highest first.</div>'
        '<div class="k-table-wrap"><table class="k-table"><thead><tr><th>id</th><th>kind</th>'
        '<th class="k-n">Money in &darr;</th><th class="k-n">Links in (count)</th><th class="k-n">rank by Links in (count)</th></tr></thead>'
        f"<tbody>{rows}</tbody></table></div></section>"
    )


# ---------- a value computed on a subset carries its scope ----------
LES_P = les["title"] if "title" in les else "Les Miserables"
STEP1 = "Filter to degree &gt;= 2"
LES_ALT = f"Les Miserables after {STEP1.replace('&gt;', '>')}: {SUB_N} of {LES_N} characters, colored by group"


def les_canvas():
    return (
        '<main class="k-main"><div class="k-canvas"><div class="k-stage">'
        f'<img class="k-light-only" src="../kit/canvas/lesmis-step1-light.svg" alt="{LES_ALT}"><img class="k-dark-only" src="../kit/canvas/lesmis-step1-dark.svg" alt="{LES_ALT}"></div>'
        f'<div class="k-toolbar-dock">{TOOLBAR}</div><span class="k-help">{i("circle-help")}</span></div></main>'
    )


def subset_editor():
    vals = [r["betweenness"] for r in BOS1]
    hi = max(vals)
    bins = [0] * 12
    for v in vals:
        bins[min(11, int(v / hi * 12))] += 1
    tops = "".join(top_row(n + 1, r["label"], f'{r["betweenness"]:.3f}', sel=n == 0) for n, r in enumerate(BOS1[:5]))
    body = (
        stateline(RERUN_BTN, f'<span class="k-fact">on: filtered graph, {SUB_N} of {LES_N} characters</span><br>'
                  f'<span class="k-secondary">After {STEP1}. Exact. Unweighted, undirected. CPU.</span> <a class="rr-link">Details</a>')
        + f'<div class="rr-subhead">Top nodes <span class="k-fact">{SUB}</span></div>' + tops
        + f'<div class="k-row rr-link">{SUB_N - 5} more in the table</div>'
        + f'<div class="rr-subhead">Distribution <span class="k-fact">{SUB} characters</span></div>'
        + hist(bins, on=11, titles=False)
        + f'<div class="rr-axis k-num"><span>0</span><span>{hi}</span></div>'
        + data("highest", f"{hi}, {SUB}")
        + options([("Scope", f"Filtered graph ({SUB_N} of {LES_N})"), ("Weight", "None for this run")])
        + runs_of([("Run 2", f"{SUB}, Sep 29 10:14", "shown"), ("Run 1", "full graph, Sep 28 16:02", "")])
    )
    return opened(LES_P, f"Betweenness, {SUB}, Sep 29 10:14", body, chip_text=LES_CHIP)


def valjean_right():
    b1 = BOS1[0]
    assert b1["label"] == "Valjean"
    return (
        f'<aside class="k-right" aria-label="Inspector">{HEADERS}<div class="k-typerow">{i("circle-dot")}<span class="k-name k-id">Valjean</span><span class="k-secondary">Node</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Attributes</div>'
        f'<div class="k-data rr-two"><span class="k-name">betweenness</span><span class="k-value k-num">{b1["betweenness"]}, {SUB}</span>'
        f'<span class="rr-rank k-secondary k-num">#1 of {SUB_N}</span></div>'
        f'<div class="k-data rr-two"><span class="k-name">betweenness</span><span class="k-value k-num">{VAL_FULL["betweenness"]}, on: full graph</span>'
        f'<span class="rr-rank k-secondary k-num">#1 of {LES_N}</span></div>'
        f'<div class="k-data"><span class="k-name">degree</span><span class="k-value k-num">{VAL_FULL["degree"]}, on: full graph</span></div>'
        f'<div class="k-data"><span class="k-name">group</span><span class="k-value k-num">{VAL_FULL["group"]}</span></div>'
        "</section></div></aside>"
    )


# ---------- states ----------
PPI_P = "Human protein interactions"
RUN_PPI_DATE = "Sep 29 10:14"
RUN_PPI = f"Betweenness, {RUN_PPI_DATE}"  # a run is named by the options that differ, plus its date
SAMP_RUN = f'{samp["name"]}, Sep 29 10:20'
MONEY_DATE = "Sep 29 10:31"
LES_CHIP = f"Filtered: {SUB_N} of {LES_N} characters"
IN_PPI_BASE = row("Connected components, Sep 28 09:30", "group")
IN_CIT_BASE = row("Weakly connected components, Sep 28 09:30", "group")
TIP = (
    '<div class="k-tooltip" style="left:418px;top:274px;max-width:260px;white-space:normal"><b>Betweenness</b><br>'
    '<span class="k-secondary">How often a node lies on the shortest paths between other nodes: the brokers and bottlenecks. Click to run.</span></div>'
)
EXACT_NOT_RUN = row("Betweenness", trail=NOT_RUN)
SAMPLED_DONE = row(f'{samp["name"]}, Sep 29 10:20')


def running_line(pct, text):
    return f'<div class="k-progress"><i style="width:{pct}%"></i></div><span class="k-secondary">{text}</span>'


CANCEL = lambda focus=False: f'<span class="k-icon-btn{" rr-focus" if focus else ""}" title="Cancel">{i("x")}</span>'

STATES = [
    dict(
        sid="catalog", label="Choose from the catalog: Run a measure...", group="Main path: 300 proteins, runs at once",
        app=rail() + left(PPI_P, IN_PPI_BASE, menu_open=True) + ppi_canvas("ppi-modules-rest", f"{PN} proteins colored by module, nothing selected") + ppi_right(),
        over=catalog_menu(PPI_MARKS, hover="Betweenness") + TIP,
        spoken='"Betweenness. How often a node lies on the shortest paths between other nodes. Button, 3 of 15."',
        notes=[
            "<b>Run a measure... opens the catalog as a menu</b> from the head of the Results place: one list under the element's family names as plain headings, Degree first. The main menu's Algorithms and Quick actions list the same entries, read from graphty-element. The catalog is not a section of the place: the place holds runs, the menu offers what can run. compact-mantine <b>Menu</b> with labels and a right section.",
            "<b>Hover and keyboard focus show the description</b> beside the menu, and past 10 s the band word (a rough duration such as &quot;under a minute&quot;). Nothing runs. On 300 proteins every entry is under 10 s, so no band word shows. principles 2; interaction-patterns 3.3. <b>Tooltip</b>.",
            "<b>Two kinds of mark look different.</b> Closeness shows its variant as a dotted word, WF-corrected (a control that offers Harmonic centrality). Eigenvector shows a violated precondition: the warning mark and &quot;3 components&quot;, offering PageRank. graph-conventions 2. The declared precondition waits on graphty-element.",
            "<b>One click runs it and opens the run in the Results place.</b> A run that already exists and is current is opened, not run again. interaction-patterns 3.3.",
        ],
    ),
    dict(
        sid="quick", label="Or type it: Quick actions", group="Main path: 300 proteins, runs at once",
        app=rail() + left(PPI_P, IN_PPI_BASE) + ppi_canvas("ppi-modules-rest", f"{PN} proteins colored by module, nothing selected") + ppi_right(),
        over=quick(),
        spoken='"Run Betweenness, 1 of 7."',
        notes=[
            "<b>A family word finds every entry in it; a name finds one.</b> Searching by a question word (&quot;brokers&quot;) waits on catalog aliases in graphty-element. output-homes 3. compact-mantine <b>Spotlight</b>-style list.",
            "<b>Each row's trailing slot carries what the catalog menu's entry carries</b>: the band word past 10 s, a variant word or a precondition mark. The keyboard route passes the same check before the run. Figma's actions menu shows only a name and a source; this is the stated departure, proposed in framework-changes.md.",
            "<b>Enter runs the highlighted row</b>, exactly as a click in the catalog menu; the run opens in the Results place.",
        ],
        notes_at=(1010, 130, 190),
    ),
    dict(
        sid="done", label="Finished: the run opens in place", group="Main path: 300 proteins, runs at once",
        app=rail() + ppi_editor() + ppi_canvas("ppi-modules-rest", f"{PN} proteins colored by module, nothing selected") + ppi_right(),
        over="",
        spoken='"Betweenness finished. On full graph, 300 nodes, 3 components. Exact." (polite)',
        notes=[
            "<b>The finished run opens in place</b>: the back arrow (or Esc) returns to the list of runs, the heading is the run's name (the measure and its date), and the right panel stays the inspector of whatever is selected. Nothing was selected or moved by the run. compact-mantine <b>ControlSection</b>.",
            "<b>The trust check: the state line names scope, exact or estimated, edge reading and engine</b> before any number. task-flows 3; content-design 3. Named on the full graph too (a proposed change). Its one command, Re-run (keeps Run 1), is disabled until an option differs from the run shown.",
            "<b>Appearance: the run's layer, turned off.</b> The eye-off glyph, as Figma's hidden layer. Whether a finished run paints on its own is the owner's open decision (one-way-doors 26), so the canvas stays as Module color painted it. Clicking the eye shows it.",
            f"<b>Top nodes first, then the distribution</b>, then the options (read here, edited in the options popover), the runs of this measure with Compare with another run..., and Appearance. {bc['histogram12'][0]} of {PN} proteins sit in the lowest twelfth. No bar is marked: nothing is selected. <b>ChartRow</b>, <b>DataRow</b>. A bar selects the nodes it counts (entries 4.3).",
            f"<b>&quot;{ppi['nodes'] - 5} more&quot; opens the Nodes table sorted by this column.</b> Waits on the element's ranking read.",
        ],
    ),
    dict(
        sid="rank", label="Read one node: its rank", group="Main path: 300 proteins, runs at once",
        app=rail() + ppi_editor(on_tp53=True) + ppi_canvas("ppi-modules", f"{PN} proteins colored by module, TP53 selected", dock=ppi_dock()) + tp53_right(),
        over="",
        spoken=f'"TP53, node. Betweenness {tp53["betweenness"]}, rank 2 of 300, full graph."',
        notes=[
            "<b>Choosing TP53 in Top nodes selects it</b> on the canvas, in the table and in the inspector. The run stays open in the Results place, as selection in Figma drives only the right-hand panel. entries 4.3.",
            "<b>Its bar in the distribution is marked</b>, so the one number is read against all 300.",
            "<b>The rank is the metric row's second line</b>, with its denominator and scope. output-homes 1; interface-specification 3, Attributes. <b>DataRow</b> with a second line.",
            "<b>The table sorted by the result's column</b> is where the more link lands, TP53 selected in it. Rank ties wait on the element's ranking read.",
        ],
    ),
    dict(
        sid="money", label="Money words find weighted degree", group=f"Money on the transfers: {TN} accounts",
        app=rail() + left(TP, row("Weakly connected components, Sep 28 09:30", "group")) + trn_canvas() + trn_right(),
        over=quick_money(),
        spoken='"Run Money in. Total amount of the transfers into each account. 1 of 5."',
        notes=[
            "<b>Typing a money word finds weighted degree under its money names</b>: Money in, Money out and Money in minus out, because the weight column, amount, is a currency. On any other numeric column the same measure reads &quot;Total &lt;column&gt;&quot; (&quot;Total confidence&quot; on the proteins). Weighted degree in the catalog and Quick actions is proposed to graphty-element.",
            "<b>Link counts are named as counts</b>: Links in (count), Links out (count) and Links (count), under their own heading, &quot;Counts of transfers, not money&quot;. A ranking by link count can no longer be read as a ranking by money.",
            "<b>Each row says what it adds up</b> in one plain line, in Quick actions and beside the catalog menu on hover.",
            "<b>The Degree family heads the catalog</b>: counts first, then the money measures. The table's New column menu offers the same three money names.",
        ],
        notes_at=(1010, 130, 190),
    ),
    dict(
        sid="money-read", label="Money in: read against the link count", group=f"Money on the transfers: {TN} accounts",
        app=rail() + money_editor() + trn_canvas(dock=money_dock()) + acct_right(),
        over="",
        spoken=f'"{PICK["id"]}, node. Money in {USD(PICK["moneyIn"])}, rank {PICK["moneyRank"]} of {TN}. Links in (count) {PICK["linksIn"]}, rank {PICK["linksRank"]}."',
        notes=[
            f"<b>Each top account shows both numbers</b>: its money in and its Links in (count) with that count's rank. {PICK['id']} is #{PICK['moneyRank']} by money and #{PICK['linksRank']} by count: {PICK['linksIn']} transfers, fewer and larger. A ranking by count would have hidden it.",
            "<b>The state line says what was summed</b>: amount, in dollars, on the transfers in. A sum needs no answer to &quot;what does a higher amount mean&quot;: nothing is converted, so the run does not ask.",
            "<b>The table sorts by the run that opened it</b>, with the count and its rank beside, so the two orders are read side by side. The inspector gives each value its rank and its scope.",
        ],
        notes_at=(600, 128, 300),
    ),
    dict(
        sid="subset", label="On a filtered graph: every value names its scope", group="A value on part of the graph",
        app=rail() + subset_editor() + les_canvas() + valjean_right(),
        over="",
        spoken=f'"Valjean, node. Betweenness {BOS1[0]["betweenness"]}, {SUB}, rank 1 of {SUB_N}. Betweenness {VAL_FULL["betweenness"]}, on full graph."',
        notes=[
            f"<b>A value computed on part of the graph carries its scope wherever it is read</b>: &quot;{BOS1[0]['betweenness']}, {SUB}&quot; in the inspector, the distribution and the Top nodes heading, in the run's name and in its line under Runs of this measure. content-design 5, &quot;A number names its set only when the set departs&quot;.",
            f"<b>The same measure over two sets names both</b>: the earlier full-graph run gives Valjean {VAL_FULL['betweenness']}, and that line says &quot;on: full graph&quot;. Neither number is read as the other.",
            f"<b>The run is named by the option that differs</b>, its scope, plus its date. The filter chip reads &quot;Filtered: {SUB_N} of {LES_N} characters&quot;, and the state line names the step.",
        ],
        notes_at=(600, 128, 300),
    ),
    dict(
        sid="refused", label="Too costly exactly: choose how", group=f"When exact is too costly: {CN} patents",
        app=rail() + refused_editor() + cit_canvas() + cit_right(),
        over="",
        spoken=f'"Betweenness. {CAUSE} Directed, on the full graph. Fits the time limit: Sampled, {K} sources, under a minute, 1 of 3."',
        notes=[
            f"<b>Past the cost gate's cap the click creates the run and refuses it</b>, opening it in place; nothing asks and nothing runs. The cap is {CAP} s by default, a default the owner has not settled (one-way-doors 42). state-matrix 4.10, row 1. It opens with &quot;Not run:&quot; and carries no failure mark: nothing failed, the run was priced and declined. interaction-pattern-entries 8.1.",
            "<b>The routes, cheapest first, grouped by the gate's verdict</b>: the sampled method, then the kept set that fits, then exact on the full graph. Focus lands on the first, so the reflex Enter is the safe one. Each is an <b>ActionRow</b> with its band word as trailing state. The gate never swaps a method.",
            "<b>One commit, under the routes</b>, naming the chosen route: Run sampled, Run on set or Run exactly. Run sampled creates the sibling run and runs it at once: one step, one undo step. No option rows while the gate refuses, so no edit is ever held without its command beside it. As screens/results-panel.html and screens/option-form-cost.html.",
            f"<b>The kept set comes from the project</b>: &quot;{kset['name']}&quot; is in the Graph panel's Sets and paths (see the state &quot;Keep working&quot;). Only a set whose exact run fits the cap is offered.",
            "<b>Nothing is drawn past the drawing limit</b>, so this result is read in the panel and the table. scale-levels 1.",
        ],
    ),
    dict(
        sid="running", label="Running: keep working, or cancel", group=f"When exact is too costly: {CN} patents",
        app=rail() + left(CT, row(samp["name"], trail=CANCEL(True), sel=True, line=running_line(38, f"Running, {kd['band']}. WebGPU")) + EXACT_NOT_RUN + IN_CIT_BASE) + cit_canvas() + cit_right(),
        over="",
        spoken='"Running Betweenness sampled, under a minute." Spoken when it starts, then at most every 10 s.',
        notes=[
            "<b>The sampled run is a sibling result</b> with its variant in its name; the exact one stays Not run beside it, one click from Run exactly. glossary 5.",
            "<b>The row carries the run</b>: progress, band word and engine on its second line, with Cancel in its trailing slot the whole time. state-matrix 3, Result row, Running. <b>ActionRow</b> state slot.",
            "<b>No running notice while the Results place is open.</b> The notice is Figma's plugin toast kept only while the panel is closed (figma-crosswalk, &quot;A toast is transient&quot;), so two Cancels never show at once. See the queued state.",
            "<b>Nothing is blocked:</b> the analyst can style, filter or read while it runs.",
        ],
    ),
    dict(
        sid="sampled", label="Finished estimate: every value carries ~", group=f"When exact is too costly: {CN} patents",
        app=rail() + sampled_editor() + cit_canvas(dock=cit_dock()) + cit_right(),
        over="",
        spoken=f'"Betweenness sampled finished. On full graph, {CN} nodes. Estimated from {K} sources, seed 7." (polite)',
        notes=[
            "<b>The variant word is part of the name</b> everywhere the number is read: the row, the opened run, Top nodes and the column header. principles 2.",
            "<b>&quot;~&quot; on every estimated value</b>: middle, highest, the axis, Top nodes and the table column. This is the guard against the first failure, reading an estimate as exact. glossary 10, marks.",
            "<b>The state line names scope and method</b>: estimated, from how many sources, with which seed, so it can be reproduced. options-and-encodings 9.4. A recorded seed waits on graphty-element (tagged proposed).",
            "<b>Run exactly stays one click away</b> with its band. Sample size and Seed are read under Options and edited in the options popover; an edit waits for Re-run and passes the cost gate again (screens/option-form-cost.html, state 3).",
            f"<b>{samp['estimatedZero']:,} patents are estimated at 0</b>: no sampled path ran through them. The model behind these values is in kit/fixtures.json.",
        ],
        notes_at=(560, 110, 330),
    ),
    dict(
        sid="canceled", label="Canceled: Not run again, focus on the row", group="Other endings",
        app=rail() + left(CT, row(samp["name"], trail='<span class="k-btn k-btn-secondary">Run</span>', sel=True, focus=True, line=f'<span class="k-secondary">Not run, {kd["band"]}</span>') + EXACT_NOT_RUN + IN_CIT_BASE) + cit_canvas() + cit_right(),
        over="",
        spoken='"Betweenness sampled canceled. Not run. Run, button." (polite)',
        notes=[
            "<b>Cancel of the only run leaves the result Not run</b>, with Run as the row's command and its band. No undo step, no notice: the row shows it. glossary 10; Canceled is a log word, never a row state.",
            "<b>Focus returns to the row</b>, never to the page: the Cancel button is gone, so the row takes focus (its second line included) and Run is one key away. interaction-patterns 3.6 item 7.",
            "<b>Run from here is a new commit</b>: one undo step, and it passes the cost gate again.",
        ],
    ),
    dict(
        sid="failed", label="Failed: WebGPU lost, Run 1 still shown", group="Other endings",
        app=rail() + failed_editor() + cit_canvas() + cit_right("CPU; WebGPU lost"),
        over="",
        spoken=f'"Could not run {samp["name"]}: WebGPU lost. Run 2 wrote nothing. Showing Run 1, {K} sources." (assertive, once)',
        notes=[
            f"<b>A re-run with a sample of {k100['k']} lost WebGPU part way.</b> It is never finished quietly on the CPU: the row says Failed, the element's sentence and code sit in the error slot. interaction-pattern-entries 8.1; state-matrix 3, GpuLost.",
            f"<b>The run before is kept and marked</b> ({K} sources, seed {samp['seed']}), so no number reads as this run's. The failed-run proposal in framework-changes.md.",
            "<b>&quot;Try WebGPU again&quot; is the one command, focused</b>: an explicit retry owned by graphty-element, one undo step, passing the cost gate again. There is no &quot;Re-run on CPU&quot;: the sampled run of 500 sources on the CPU is past the time limit, and nothing ever switches engines for the reader. The state line reads &quot;Showing Run 1 (101 sources). Run 2 wrote nothing.&quot;, the wording the Results place uses.",
            "<b>Back in the list</b>, the Needs action strip pins the failed run above the others (screens/results-panel.html). Runs of this measure lists Run 2 as failed and Run 1 as shown. Engine line in Statistics: &quot;CPU; WebGPU lost&quot;.",
        ],
        notes_at=(560, 150, 330),
    ),
    dict(
        sid="queued", label="Run exactly: hours, and what waits", group="Other endings",
        app=rail() + left(
            CT,
            row("Betweenness", trail=CANCEL(), sel=True, line=running_line(3, "Running, hours. WebGPU"))
            + row("PageRank", trail=CANCEL(), line=running_line(55, "Running, under a minute. WebGPU. Started beside Betweenness"))
            + row("Closeness", trail=CANCEL(), line='<span class="k-secondary">Queued, 1st in line: hours</span>')
            + SAMPLED_DONE + IN_CIT_BASE,
        ) + cit_canvas() + cit_right(),
        over="",
        spoken='"PageRank running, under a minute. Started beside Betweenness." (polite)',
        notes=[
            "<b>Run exactly runs in the background, for hours</b>, cancellable the whole time. The exact result keeps its own row; the sampled one stays beside it, finished.",
            "<b>A second run of hours waits</b>: Closeness, chosen with Run exactly from its own refusal, is Queued with its place in line and Cancel. state-matrix 3, Result row, Queued; element-contract 3, the run queue.",
            "<b>A run under a minute never waits behind one of hours</b>: PageRank starts at once beside it. principles 2; figma-crosswalk, &quot;One plugin runs at a time&quot;.",
            "<b>The running notice</b> appears when the Results place closes, for the earliest run (Betweenness), with its progress and Cancel.",
        ],
    ),
    dict(
        sid="elsewhere", label="Keep working: the notice carries the run", group="Other endings",
        app=rail("Graph") + left_graph() + cit_canvas(toast=TOAST_HOURS) + cit_right(),
        over="",
        spoken='"Running Betweenness, hours." Spoken when it starts, then at most every 10 s; nothing more while it runs.',
        notes=[
            "<b>With the Results place closed, the running notice carries the earliest run</b>, exact Betweenness, with its progress, band and Cancel. It is Figma's plugin toast, kept for as long as the run lasts (figma-crosswalk, &quot;A toast is transient&quot;). One notice, however many runs: the queue is on the rows.",
            f"<b>The kept set the refusal offered</b>, &quot;{kset['name']}&quot; ({kset['nodes']:,} patents), is here in Sets and paths. The refusal offers only sets the project holds whose exact run fits the cap.",
            "<b>Cancel here</b> removes the notice, so focus goes back to the control that held it before (a proposed rule); the row shows Not run when the panel opens.",
        ],
        notes_at=(560, 128, 330),
    ),
    dict(
        sid="unrun", label="Arrives unrun: minutes on this machine", group="Other endings",
        app=rail() + unrun_editor() + cit_canvas() + cit_right("CPU; no WebGPU"),
        over="",
        spoken='"PageRank, not run, a few minutes. Run, button."',
        notes=[
            "<b>In a browser without WebGPU, PageRank on these patents is &quot;a few minutes&quot;.</b> A click on an entry of a few minutes or more, one that needs an argument, or one with no cost model creates the result Not run with Run focused and its band. state-matrix 4.10, row 2; task-flows 3, &quot;Needs an argument, or a few minutes or more?&quot;.",
            "<b>PageRank is iterative, so the cost gate does not refuse it</b>: the gate covers exact computations. Proposed wording in framework-changes.md.",
            "<b>An option edit on a run that has never run applies at once and runs nothing.</b> interaction-patterns 3.3. Run at the head of the state line is the one commit: one undo step, &quot;Run PageRank&quot;. Compare with another run... and Show as style layer wait for a value.",
            "<b>Every band word follows the engine in effect</b>: in the catalog menu and Quick actions, the iterative entries read &quot;a few minutes&quot; here.",
        ],
        notes_at=(560, 150, 330),
    ),
    dict(
        sid="layout", label="Side branch: make the layout readable", group="Side branch, from rest",
        app=rail() + left(PPI_P, row(RUN_PPI) + IN_PPI_BASE) + ppi_canvas("ppi-modules-rest", f"{PN} proteins colored by module, nothing selected") + ppi_right(layout_sel=True),
        over=layout_editor(),
        spoken='"Layout, Force-directed. Edits wait for Run layout."',
        notes=[
            "<b>Entered from rest</b> (Esc clears the selection) or with a set selected, at any point: laying out is its own task, not a step after reading a rank. task-flows 3.1.",
            "<b>Layout options live on the graph's Layout row</b>, never in a result. information-architecture 2, rule 6. The editor opens left of the inspector. <b>Popout</b>, <b>FieldRow</b>.",
            "<b>Start from the current positions is the default</b>, so the picture already learned is kept; Fresh is one choice away. Waits on graphty-element.",
            "<b>The row names method, scope, start, seed and pins.</b> 3 pinned nodes hold their places; Unpin all clears them in one undo step.",
            "<b>Past the drawing limit</b> (the patents) nothing is drawn, so this branch applies only once a filter step brings the graph under it.",
        ],
        notes_at=(640, 140, 300),
    ),
]


def section(n, st, prev, nxt):
    x, y, w = st.get("notes_at", (560, 128, 330))
    nav = (f'<a href="#{prev}">&lsaquo;</a>' if prev else "") + (f'<a href="#{nxt}">&rsaquo;</a>' if nxt else "")
    notes = "".join(f'<div class="k-annot-note">{t}</div>' for t in st["notes"])
    return (
        f'<section class="rr-state" id="{st["sid"]}" aria-label="{st["label"]}"><div class="k-app">{st["app"]}</div>{st["over"]}'
        f'<div class="rr-label"><span class="k-step">{n}</span>{st["label"]}<label for="annot" class="rr-toggle">Notes</label>{nav}</div>'
        f'<div class="rr-spoken"><b>Screen reader hears:</b> {st["spoken"]}</div>'
        f'<div class="rr-note rr-notes" style="left:{x}px;top:{y}px;width:{w}px">{notes}</div></section>'
    )


body = ""
toc = ""
last = None
for n, st in enumerate(STATES, 1):
    prev = STATES[n - 2]["sid"] if n > 1 else None
    nxt = STATES[n]["sid"] if n < len(STATES) else None
    if st["group"] != last:
        toc += f'{"</ol>" if last else ""}<h2>{st["group"]}</h2><ol start="{n}">'
        last = st["group"]
    toc += f'<li><a href="#{st["sid"]}">{st["label"]}</a></li>'
    body += section(n, st, prev, nxt)
toc += "</ol>"

HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440">
<title>Run a measure and read it: every state</title>
<!-- Written by screens/run-and-read.py from kit/fixtures.json. Edit the script and run it. -->
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  /* States stacked, each exactly 1440 x 900, so #anchors land on one state. */
  body {{ min-width: 1440px; }}
  .rr-head {{ max-width: 1100px; padding: 24px 24px 16px; font-size: 13px; line-height: 20px; }}
  .rr-head h1 {{ font-size: 24px; line-height: 32px; font-weight: 600; margin: 0 0 4px; }}
  .rr-head h2 {{ font-size: 13px; margin: 12px 0 2px; }}
  .rr-head p {{ margin: 0 0 8px; color: var(--cm-text-secondary); }}
  .rr-head ol {{ margin: 0; padding-left: 24px; }}
  .rr-head a {{ color: var(--cm-text-brand); text-decoration: none; }}
  body:has(.rr-state:target) .rr-head {{ display: none; }}
  body:has(.rr-state:target) .rr-state:not(:target) {{ display: none; }}
  .rr-state {{ position: relative; width: 1440px; height: 900px; overflow: hidden; border-bottom: 4px solid var(--k-annot); }}
  .rr-state .k-app {{ width: 1440px; height: 900px; }}
  .rr-label {{ position: absolute; z-index: 95; top: 8px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
    height: 28px; padding: 0 6px 0 4px; border-radius: 14px; background: var(--k-annot-bg); color: var(--cm-text); font-size: 12px; font-weight: 550;
    box-shadow: 0 0 0 1px var(--k-annot); white-space: nowrap; }}
  .rr-label a, .rr-toggle {{ display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; color: var(--k-annot-ink); text-decoration: none; font-weight: 600; cursor: pointer; }}
  .rr-toggle {{ border: 1px solid var(--k-annot); }}
  #annot:checked ~ .rr-state .rr-toggle {{ background: var(--k-annot); color: #fff; }}
  .rr-note, .rr-spoken {{ display: none; }}
  #annot:checked ~ .rr-state .rr-spoken {{ display: block; }}
  #annot:checked ~ .rr-state .rr-notes {{ display: flex; }}
  .rr-notes {{ position: absolute; z-index: 91; flex-direction: column; gap: 8px; }}
  .rr-notes .k-annot-note {{ position: static; max-width: none; }}
  .rr-spoken {{ position: absolute; z-index: 95; left: 50%; top: 44px; transform: translateX(-50%); max-width: 600px; padding: 6px 10px; border-radius: 6px;
    background: var(--k-annot-bg); border: 1px dashed var(--k-annot); font-size: 12px; line-height: 17px; }}
  .rr-pop {{ z-index: 80; }}
  .rr-pop .k-popover-body {{ max-height: none; }}
  .rr-focus {{ outline: 2px solid var(--cm-border-selected-strong); outline-offset: 1px; border-radius: 5px; }}
  .rr-variant {{ color: inherit; text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer; white-space: nowrap; }}
  .rr-pre {{ display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; color: var(--cm-text-secondary); }}
  .rr-band-word {{ color: var(--cm-text-secondary); white-space: nowrap; }}
  .rr-stateline {{ padding: 4px 8px 8px 16px; line-height: 16px; }}
  .rr-link {{ color: var(--cm-text-brand); cursor: pointer; }}
  .rr-subhead {{ display: flex; gap: 6px; align-items: center; height: 32px; padding: 0 8px 0 16px; font-weight: 550; border-top: 1px solid var(--cm-border); margin-top: 4px; }}
  .rr-hist {{ height: 48px; }}
  .rr-axis {{ display: flex; justify-content: space-between; margin: 0 8px 4px 16px; color: var(--cm-text-tertiary); font-size: var(--k-caption-fs); }}
  .rr-state .k-project, .rr-state .k-typerow .k-name {{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }}
  .rr-state .k-title-line {{ min-width: 0; max-width: 200px; }}
  .rr-cmdrow {{ display: flex; justify-content: flex-end; padding: 8px 8px 4px 16px; }}
  .rr-two {{ flex-wrap: wrap; }}
  .rr-rank {{ flex-basis: 100%; text-align: end; margin-top: -4px; font-size: var(--k-caption-fs); }}
  .rr-topsel {{ background: var(--cm-bg-selected); border-radius: 4px; }}
  .rr-runline {{ padding: 6px 16px 4px; }}
  .rr-rowline {{ display: flex; flex-flow: row wrap; align-items: center; gap: 4px 6px; line-height: 16px; }}
  .rr-rowline .k-progress {{ flex-basis: 100%; }}
  .rr-rowline2 {{ padding: 0 8px 6px 40px; line-height: 16px; }}
  .rr-err {{ display: flex; gap: 6px; align-items: flex-start; padding: 2px 8px 6px 16px; line-height: 16px; }}
  .rr-err .k-warn-glyph {{ flex: none; margin-top: 1px; }}
  .rr-group {{ display: flex; align-items: flex-end; height: 28px; padding: 0 8px 4px 16px; color: var(--cm-text-secondary); font-size: 11px; border-top: 1px solid var(--cm-border); margin-top: 4px; }}
  .rr-route {{ margin: 0 8px; padding-left: 8px; border-radius: 5px; }}
  .rr-route[aria-selected="true"] {{ background: var(--cm-bg-selected); }}
  .rr-choice {{ display: grid; gap: 6px; margin: 0 8px 6px 8px; padding: 6px 8px; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--cm-border); line-height: 15px; }}
  .rr-choice.rr-focus {{ outline-offset: 0; background: var(--cm-bg-selected); }}
  .rr-ch-text {{ display: flex; flex-direction: column; gap: 2px; }}
  .rr-ch-side {{ display: flex; align-items: center; justify-content: space-between; gap: 8px; }}
  .rr-band {{ flex: none; padding: 0 6px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); white-space: nowrap; line-height: 18px; }}
  .rr-band.rr-over {{ background: var(--cm-bg-warning); color: #000; }}
  .rr-prose {{ padding: 2px 8px 8px 16px; line-height: 16px; }}
  .rr-plain {{ background: transparent; box-shadow: none; }}
  .rr-strip {{ background: var(--cm-bg-secondary); }}
  .rr-error {{ margin: 8px 8px 4px 16px; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); box-shadow: inset 3px 0 0 var(--cm-text-danger); line-height: 16px; }}
  .rr-placehead {{ display: flex; align-items: center; gap: 4px; height: 40px; padding: 0 8px 0 16px; flex: none; }}
  .rr-placename {{ font-size: 13px; line-height: 22px; font-weight: 550; }}
  .rr-runbtn {{ gap: 4px; padding: 0 6px; }}
  .rr-runbtn[aria-expanded="true"] {{ background: var(--cm-bg-selected); }}
  .rr-placeline {{ padding: 0 8px 8px 16px; line-height: 16px; border-bottom: 1px solid var(--cm-border); flex: none; }}
  .rr-restype {{ display: flex; align-items: flex-start; gap: 6px; min-height: 48px; padding: 12px 8px 10px 8px; border-bottom: 1px solid var(--cm-border); flex: none; }}
  .rr-restype > .k-i {{ margin-top: 4px; flex: none; }}
  .rr-restype > .k-icon-btn {{ flex: none; }}
  .rr-runname {{ flex: 1 1 auto; min-width: 0; padding-top: 4px; line-height: 16px; overflow-wrap: anywhere; }}
  .rr-cmd {{ float: right; margin: 0 0 4px 8px; }}
  .rr-verb {{ color: var(--cm-text); }}
  .rr-verb[aria-disabled="true"] {{ color: var(--cm-text-tertiary); }}
  .rr-wrapval {{ white-space: normal; text-align: end; }}
  .rr-notrun {{ margin: 8px 8px 4px 16px; padding: 8px 10px; border-radius: 5px; background: var(--cm-bg-secondary); line-height: 16px; }}
  .rr-hasline {{ flex-wrap: wrap; height: auto; min-height: 32px; padding-block: 6px; }}
  .rr-hasline::before {{ inset: 2px 0; }}
  .rr-hasline .rr-rowname {{ flex: 1 1 0; }}
  .rr-hasline .rr-rowline {{ flex-basis: 100%; padding: 2px 0 0 24px; }}
  .rr-catmenu {{ width: 250px; padding: 4px 0; }}
  .rr-catmenu .k-menu-label {{ height: 20px; margin-top: 2px; }}
  .rr-catmenu .k-menu-item {{ height: 22px; }}
  .rr-catmenu .rr-pre, .rr-catmenu .rr-variant {{ color: inherit; }}
  .rr-route {{ height: auto; min-height: 32px; padding-block: 4px; align-items: flex-start; }}
  .rr-route-text {{ display: flex; flex-direction: column; line-height: 16px; min-width: 0; }}
  .rr-route .rr-band-word {{ line-height: 16px; }}
  .rr-q2 {{ height: auto; min-height: 44px; padding-block: 6px; }}
  .rr-q2-text {{ display: flex; flex-direction: column; line-height: 16px; }}
  .rr-mrow {{ flex-wrap: wrap; }}
  .rr-mlinks {{ flex-basis: 100%; padding-left: 22px; margin-top: -6px; font-size: var(--k-caption-fs); }}
  .rr-kept {{ display: inline-block; padding: 0 4px; margin-right: 4px; border-radius: 3px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); color: var(--cm-text-secondary); font-size: 11px; }}
</style>
</head>
<body>
<!-- The Notes toggle is a checkbox, so the annotation layer needs no script. -->
<input type="checkbox" id="annot" hidden>
<script>
  // ?notes shows the annotation layer; ?theme=dark or ?theme=light forces a theme (for links and screenshots).
  var q = new URLSearchParams(location.search);
  if (q.has("notes")) document.getElementById("annot").checked = true;
  if (q.get("theme")) document.documentElement.setAttribute("data-theme", q.get("theme"));
</script>
<div class="rr-head">
  <h1>Run a measure and read it: every state</h1>
  <p>Runs live in the Results place on the rail: every run of a measure, with its settings and date. A run starts from Run a measure... at the top of that place, from the main menu's Algorithms, or from Quick actions (Ctrl+K), and it opens in place: its record replaces the list, and the back arrow or Esc returns to it. Betweenness on two real sizes: 300 human proteins, where it finishes at once, and {CN} patents, where the exact run would take hours. Money on the March transfers: link counts are named as counts, and weighted degree answers to the money words. A value computed on a filtered graph names its scope (&quot;0.419, on 60 of 77&quot;). Each state is 1440 x 900 at its own link; the Notes button on each shows which part of the design framework and which compact-mantine component is behind each element, and what a screen reader hears. Pages follow your system theme; add ?theme=dark to force dark.</p>
  <p><a href="../flows/run-and-read.html">The flow these states belong to</a> <label for="annot" class="rr-toggle" style="display:inline-grid">Show notes</label></p>
  {toc}
</div>
{body}
</body>
</html>
"""
assert all(ord(ch) < 128 for ch in HTML), "non-ASCII in output"
open(os.path.join(P, "screens/run-and-read.html"), "w").write(HTML)
# The current frame (rail, header, Styles and Results in the inspector): kit/shell.mjs
import subprocess
subprocess.run(["node", os.path.join(P, "kit/shell.mjs"), os.path.join(P, "screens/run-and-read.html")], check=True)
print(f"ok: {len(STATES)} states")
