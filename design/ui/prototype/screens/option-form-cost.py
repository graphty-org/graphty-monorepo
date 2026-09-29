#!/usr/bin/env python3
"""Writes screens/option-form-cost.html (edit this, then run it).
Numbers come from kit/fixtures.json: citations.betweennessCost for the cost gate, ppi for the weight question."""
import json, os

P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fx = json.load(open(os.path.join(P, "kit/fixtures.json")))
c = fx["datasets"]["citations"]
ppi = fx["datasets"]["ppi"]
cost = c["betweennessCost"]
K = cost["largestKWithinBudget"]  # the default is the largest sample that fits the time limit
kd = next(s for s in cost["sampled"] if s["k"] == K)
k500 = next(s for s in cost["sampled"] if s["k"] == 500)
ks = cost["keptSets"][0]
CAP = cost["budgetSeconds"]
SEED = c["sampledBetweenness"]["seed"]
N = f'{c["nodes"]:,}'
M = f'{c["edges"]:,}'
KSN = f'{ks["nodes"]:,}'
EX = cost["exact"]["band"]
assert c["directed"] and not ppi["directed"]
assert EX == "hours" and not cost["exact"]["withinBudget"]
assert kd["band"] == "under a minute" and kd["withinBudget"]
assert k500["band"] == "a few minutes" and not k500["withinBudget"]
assert ks["exact"]["withinBudget"] and ks["exact"]["band"] == "under a minute"
CAUSE = f"Takes {EX}. The time limit is {CAP} seconds."
LIMIT = f"{CAP}-second time limit"

# The weight question's examples: the confidence column's largest, a middle and its smallest value.
NB = ppi["tp53Slice"]["neighborsOf"]["TP53"]
CONF = next(a for a in ppi["attributes"] if a["name"] == "confidence (edge)")
CI = ppi["attributes"].index(CONF)
MID = next(n for n, r in enumerate(NB) if r["confidence"] == 0.79)
EXAMPLES = [
    (f"datasets.ppi.attributes.{CI}.range.1", CONF["range"][1]),
    (f"datasets.ppi.tp53Slice.neighborsOf.TP53.{MID}.confidence", NB[MID]["confidence"]),
    (f"datasets.ppi.attributes.{CI}.range.0", CONF["range"][0]),
]


def i(name, cls=""):
    return f'<svg class="k-i {cls}"><use href="../kit/icons.svg#{name}"/></svg>'


def fxn(key, value, digits=None):
    d = f' data-fx-digits="{digits}"' if digits is not None else ""
    text = f"{value:.{digits}f}" if digits is not None else (f"{value:,}" if isinstance(value, int) else str(value))
    return f'<span class="k-num" data-fx="{key}"{d}>{text}</span>'


RAIL = (
    '<nav class="k-rail" aria-label="Main">'
    f'<div class="k-rail-btn" role="button" aria-label="Main menu"><span class="k-rail-pill">{i("menu")}</span></div><div class="k-rail-sep"></div>'
    f'<div class="k-rail-btn" role="button" aria-pressed="true"><span class="k-rail-pill">{i("network")}</span>Graph</div>'
    f'<div class="k-rail-btn" role="button" aria-pressed="false"><span class="k-rail-pill">{i("database")}</span>Data</div>'
    f'<div class="k-rail-btn" role="button" aria-pressed="false"><span class="k-rail-pill">{i("sticky-note")}</span>Notes</div>'
    f'<div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div></nav>'
)

REFUSED_ROW = (
    f'<span class="k-trail"><span class="k-warn-glyph">!</span><span class="k-secondary" title="{CAUSE}">hours</span></span>'
)
CATALOG = ["Betweenness", "Closeness", "Eigenvector", "Harmonic centrality", "HITS", "Katz", "PageRank"]


def left(project, graph, sets=""):
    return (
        '<aside class="k-panel" aria-label="Graph"><div class="k-panel-head"><div class="k-title-line">'
        f'<span class="k-project">{project}</span>{i("chevron-down", "k-i-sm k-secondary")}</div>'
        f'<span class="k-chip">{i("funnel", "k-i-sm")}Full graph</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Graphs</div>'
        f'<ul class="k-list" role="listbox" aria-label="Graphs"><li role="option" class="k-item" aria-selected="true">{i("network")}<span class="k-grow k-ellipsis">{graph}</span></li></ul></section>'
        f'<section class="k-section"{"" if sets else " data-empty"}><div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn" aria-label="Create a set">{i("plus")}</span></div>'
        + (f'<ul class="k-list" role="listbox" aria-label="Sets and paths">{sets}</ul>' if sets else "") + '</section>'
        f'<section class="k-section" data-empty><div class="k-section-head">Views<span class="k-grow"></span><span class="k-icon-btn" aria-label="Save a view">{i("plus")}</span></div></section></div></aside>'
    )


def results(rows):
    """The inspector's Results section: each run on this graph; "+" opens the list of measures."""
    return (
        f'<section class="k-section"><div class="k-section-head">Results<span class="k-grow"></span><span class="k-icon-btn" aria-label="Run a measure">{i("plus")}</span></div>'
        f'<ul class="k-list" role="listbox" aria-label="Results">{rows}</ul></section>'
    )


def cit_left(sampled=None):
    """sampled: None (no sibling yet), 'running', 'held'."""
    sel = "" if sampled else ' aria-selected="true"'
    rows = f'<li role="option" class="k-item"{sel}>{i("sigma")}<span class="k-ellipsis">Betweenness</span>{REFUSED_ROW}</li>'
    if sampled:
        trail = "under a minute" if sampled == "running" else "edit held"
        rows += (
            f'<li role="option" class="k-item" aria-selected="true">{i("sigma")}<span class="k-ellipsis">Betweenness (sampled)</span>'
            f'<span class="k-trail"><span class="k-secondary of-nowrap">{trail}</span></span></li>'
        )
    rows += f'<li role="option" class="k-item">{i("group")}<span class="k-ellipsis">Connected components</span><span class="k-trail k-num">3,912</span></li>'
    return rows


def ppi_left():
    rows = (
        f'<li role="option" class="k-item" aria-selected="true">{i("sigma")}<span class="k-ellipsis">Betweenness</span>'
        '<span class="k-trail"><span class="k-secondary of-nowrap">edit held</span></span></li>'
    )
    return rows


TOOLBAR = (
    '<div class="k-toolbar" role="toolbar">'
    f'<span class="k-tool" aria-pressed="true" aria-label="Select">{i("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret" aria-label="More tools">{i("chevron-down", "k-i-sm")}</span>'
    f'<span class="k-tool" aria-label="Path">{i("route", "k-i-lg")}</span><span class="k-tool" aria-label="Note">{i("sticky-note", "k-i-lg")}</span><span class="k-toolbar-sep"></span>'
    f'<span class="k-tool" aria-label="Quick actions">{i("zap", "k-i-lg")}</span><span class="k-toolbar-sep"></span>'
    f'<span class="k-tool" aria-label="View mode">{i("square", "k-i-lg")}</span><span class="k-tool-caret" aria-label="View mode options">{i("chevron-down", "k-i-sm")}</span></div>'
)


def cit_main(toast=""):
    return (
        '<main class="k-main"><div class="k-canvas"><div class="k-legend-card">'
        f'<div class="k-notdrawn k-num" style="border:0;margin:0;padding:0">{c["notDrawnLine"]}. <a>Narrow the graph...</a></div></div>'
        f'<div class="k-toolbar-dock">{toast}{TOOLBAR}</div>'
        f'<span class="k-help">{i("circle-help")}</span></div></main>'
    )


def ppi_main():
    alt = ppi["frame"]["alt"]
    src = ppi["frame"]["drawing"]
    return (
        '<main class="k-main"><div class="k-canvas"><div class="k-stage">'
        f'<img class="k-light-only" src="../kit/{src.replace("{theme}", "light")}" alt="{alt}">'
        f'<img class="k-dark-only" src="../kit/{src.replace("{theme}", "dark")}" alt="{alt}"></div>'
        f'<div class="k-toolbar-dock">{TOOLBAR}</div>'
        f'<span class="k-help">{i("circle-help")}</span></div></main>'
    )


TOAST = (
    f'<div class="k-toast">{i("loader-circle")}Running Betweenness (sampled)<div class="k-progress"><i style="width:40%"></i></div>'
    '<span class="of-toast-band">under a minute</span><span class="k-toast-action">Cancel</span></div>'
)


def right(name, metrics, rows, extra=""):
    return (
        '<aside class="k-right" aria-label="Inspector">'
        f'<div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">Fit{i("chevron-down", "k-i-sm")}</span></div>'
        f'<div class="k-typerow">{i("network")}<span class="k-name">{name}</span><span class="k-secondary">Graph</span></div>'
        '<div class="k-scroll"><section class="k-section"><div class="k-section-head">Statistics</div>'
        '<div class="k-row"><span class="k-grow of-nowrap">Overview: General</span><span class="k-btn k-btn-ghost" style="padding-inline:4px">Change overview...</span></div>'
        '<div class="k-metrics">' + "".join(
            f'<div class="k-metric"><span class="k-secondary">{k}</span><span class="k-big">{v}</span></div>' for k, v in metrics
        ) + "</div>"
        + "".join(f'<div class="k-data"><span class="k-name">{k}</span><span class="k-value">{v}</span></div>' for k, v in rows)
        + f"</section>{extra}</div></aside>"
    )


CIT_SETS = f'<li role="option" class="k-item">{i("group")}<span class="k-ellipsis">{ks["name"]}</span><span class="k-trail k-num">{KSN}</span></li>'


def cit_right(sampled=None):
    return right("Patent citations", [("nodes", N), ("edges", M)], [("direction", "directed"), ("average total degree", "23.8")], results(cit_left(sampled)))


PPI_RIGHT = right(
    ppi["frame"]["graphRow"],
    [("nodes", fxn("datasets.ppi.nodes", ppi["nodes"])), ("edges", fxn("datasets.ppi.edges", ppi["edges"]))],
    [("direction", "undirected"), ("weight", "confidence, not used yet")],
    results(ppi_left()),
)


def cit_frame(sampled=None, toast=""):
    return f'<div class="k-app">{RAIL}{left("Patent citations", "Patent citations", CIT_SETS)}{cit_main(toast)}{cit_right(sampled)}</div>'


PPI_FRAME = f'<div class="k-app">{RAIL}{left(ppi["frame"]["project"], ppi["frame"]["graphRow"])}{ppi_main()}{PPI_RIGHT}</div>'


def head(title, btn, disabled=False):
    dis = ' aria-disabled="true"' if disabled else ""
    return (
        f'<div class="k-popover-head"><span class="k-ellipsis">{title}</span><span class="k-grow"></span>'
        f'<span class="k-btn"{dis}>{btn}</span><span class="k-icon-btn" aria-label="Close">{i("x")}</span></div>'
    )


def route(label, band, selected=False, tip=""):
    """One route: a 32 px ActionRow, label left, band as trailing state, description in the tooltip."""
    sel = ' aria-selected="true"' if selected else ""
    t = f' data-tip="{tip}"' if tip else ""
    return (
        f'<div role="option" class="k-row of-route{" of-focus" if selected else ""}"{sel}{t}><span class="k-ellipsis k-grow">{label}</span>'
        f'<span class="k-secondary of-band">{band}</span></div>'
    )


def sub(text):
    return f'<div class="of-sub" aria-hidden="true">{text}</div>'


def section(name, body="", empty=False, collapsed=False):
    attrs = (" data-empty" if empty else "") + (" data-collapsed" if collapsed else "")
    chev = i("chevron-right", "k-i-sm k-secondary") if collapsed else ""
    return f'<section class="k-section of-psec"{attrs}><div class="k-section-head">{chev}{name}</div>{body}</section>'


def field(legend, inner, hint=""):
    h = f'<div class="of-hint k-secondary">{hint}</div>' if hint else ""
    return f'<div class="k-fieldrow"><span class="k-legend">{legend}</span><div class="k-fields">{inner}</div></div>{h}'


def direction(graph_dir, fixed=False):
    if fixed:
        return f'<div class="k-data"><span class="k-name">Direction</span><span class="k-value">{graph_dir}, as the graph</span></div>'
    return field("Direction", f'<span class="k-field k-span">As the graph: {graph_dir}{i("chevron-down", "k-i-sm k-caret")}</span>')


# ---- States 1 and 2: a weight the run cannot use refuses, and its button opens the question ----

WCOL = CONF["name"].split(" (")[0]  # "confidence"
WCAUSE = f"Can't weight paths by {WCOL}: {WCOL} isn't set up as a length yet."
WWHY = f"Betweenness counts shortest paths. Until you say what a higher {WCOL} means, no measure uses it, PageRank included."
WFIX = f"Set up {WCOL}"


def radio(label, term, first=False):
    tail = f' <span class="of-term">{term}</span>' if term else ""
    foc = " of-focus" if first else ""
    return (f'<div class="of-radio-row{foc}" role="radio" aria-checked="false"><span class="of-radio"></span>'
            f'<span class="k-grow">{label}{tail}</span></div>')


QUESTION = (
    '<div class="of-q" role="radiogroup" aria-labelledby="of-q-text">'
    f'<div class="of-q-text" id="of-q-text">For {WCOL}, a higher number means... '
    '<span class="k-secondary">Examples: ' + ", ".join(fxn(k, v, 2) for k, v in EXAMPLES) + ".</span></div>"
    + radio("a closer or stronger link", "similarity", first=True)
    + radio("a longer or costlier step", "distance")
    + radio("more can pass through", "capacity")
    + radio(f"Don't use {WCOL}", "")
    + f'<div class="of-hint k-secondary">Nothing runs until you answer. The answer is kept on {WCOL}: every measure and the Path tool read it.</div>'
    "</div>"
)


def weight_field(warn):
    mark = '<span class="k-warn-glyph">!</span>' if warn else ""
    return field("Weight by", f'<span class="k-field k-span"{" data-warn" if warn else ""}>{mark}{WCOL}{i("chevron-down", "k-i-sm k-caret")}</span>')


def weight_pop(asking):
    if asking:
        top = f'<div class="of-state"><span class="k-secondary">Finished, unweighted. Undirected. Edit held.</span></div>'
        btn, dis = "Run", True
    else:
        top = (f'<div class="of-err" role="alert"><span class="k-warn-glyph">!</span><span><b>{WCAUSE}</b>'
               f'<br><span class="k-secondary">{WWHY}</span></span></div>')
        btn, dis = WFIX, False
    head_html = head("Betweenness", btn, disabled=dis)
    if not asking:
        head_html = head_html.replace(f'<span class="k-btn">{WFIX}</span>', f'<span class="k-btn of-focus">{WFIX}</span>')
    return (
        '<div class="k-popover of-pop" style="left:931px;top:140px">'
        + head_html
        + '<div class="k-popover-body">' + top
        + field("Scope", f'<span class="k-field k-span">Full graph{i("chevron-down", "k-i-sm k-caret")}</span>')
        + section("Parameters", direction("undirected", fixed=True) + weight_field(not asking) + (QUESTION if asking else ""))
        + section("Appearance", collapsed=True)
        + section("Readings", '<div class="k-prose of-prose">Unweighted: every interaction counts the same.</div>')
        + section("Notes", empty=True)
        + section("Used by", empty=True)
        + "</div></div>"
    )


# ---- State 2: over the time limit, the routes ----

ROUTE_TIPS = {
    "sampled": f"Betweenness estimated from {K} source nodes drawn at random, seed {SEED}, on the full graph",
    "set": f"Exact betweenness within {ks['name']} only, not the full graph",
    "sampled500": "Betweenness estimated from 500 source nodes; runs in the background",
    "exact": "Exact betweenness on the full graph; runs in the background",
}

OVER_POP = (
    '<div class="k-popover of-pop" style="left:931px;top:140px">'
    + head("Betweenness", "Run sampled")
    + '<div class="k-popover-body">'
    + '<div class="of-err" role="alert"><span class="k-warn-glyph">!</span><span><b>' + CAUSE + "</b>"
    + f'<br><span class="k-secondary">Directed, on the full graph: {N} nodes.</span>'
    + ' <span class="k-link">Details</span></span></div>'
    + '<div role="listbox" aria-label="Ways to run it"><div role="group" aria-label="Fits the time limit">'
    + sub("Fits the time limit")
    + route(f"Sampled, {K} sources", kd["band"], selected=True, tip=ROUTE_TIPS["sampled"])
    + route(f"Exact, on {KSN} nodes", ks["exact"]["band"], tip=ROUTE_TIPS["set"])
    + '</div><div role="group" aria-label="Past the time limit">'
    + sub("Past the time limit")
    + route("Sampled, 500 sources", k500["band"], tip=ROUTE_TIPS["sampled500"])
    + route("Exact, on the full graph", EX, tip=ROUTE_TIPS["exact"])
    + "</div></div>"
    + "</div></div>"
)

# ---- States 3 and 4: the sampled result ----


def sampled_pop(mode):
    """mode: 'running' (just committed from the refusal) or 'held' (sample size edited past the time limit)."""
    running = mode == "running"
    kkey = "datasets.citations.betweennessCost.largestKWithinBudget"
    if running:
        top = (
            f'<div class="of-state"><span class="k-secondary">Running, <b class="of-plainb">under a minute</b>, within the time limit.'
            f' Directed.</span></div><div class="of-bar"><div class="k-progress"><i style="width:40%"></i></div></div>'
        )
        kfield = f'<span class="k-field k-num">{i("hash", "k-i-sm k-secondary")}{fxn(kkey, K)}</span>'
        kmsg = f'<div class="of-hint k-secondary">The largest sample that fits the time limit.</div>'
        runline = "Edits wait for Re-run"
    else:
        top = (
            f'<div class="of-state"><span class="k-secondary">Finished on {K} sources, seed {SEED}. Directed. Edit held.</span></div>'
        )
        kfield = f'<span class="k-field k-num" data-focus>{i("hash", "k-i-sm k-secondary")}500</span>'
        kmsg = (
            f'<div class="of-hint of-warn"><span class="k-warn-glyph">!</span><span>500 sources take <b class="of-plainb">{k500["band"]}</b>, past the {LIMIT}. Run starts it in the background.</span></div>'
            f'<div class="of-hint k-secondary">{fxn(kkey, K)} is the largest that fits.</div>'
        )
        runline = "Edit waits for Run"
    seed = (
        f'<span class="k-field k-num">{SEED}</span>'
        f'<span class="k-icon-btn" aria-label="New seed">{i("refresh-cw")}</span>'
    )
    params = (
        direction("directed")
        + field(f'Sample size {i("info", "k-i-sm k-secondary")}', f'{kfield}<span class="k-field k-secondary k-num of-of">of {N}</span>')
        + kmsg
        + f'<div class="k-fieldrow"><span class="k-legend">Seed</span><div class="k-fields">{seed}</div></div>'
        + f'<div class="of-runline k-secondary">{runline}</div>'
    )
    readings = (
        f'<div class="k-prose of-prose">Scores are estimated from {K} sources.</div>'
        '<div class="k-prose of-prose of-proposed"><span class="k-annot-tag of-prop">proposed</span> The top of the ranking is usually stable; a single score can be well off.</div>'
    )
    if not running:
        readings += f'<div class="k-row k-secondary">Top nodes {i("chevron-right", "k-i-sm")}</div>'
    body = (
        top
        + field("Scope", f'<span class="k-field k-span">Full graph{i("chevron-down", "k-i-sm k-caret")}</span>')
        + section("Parameters", params)
        + section("Appearance", collapsed=True)
        + section("Readings" if not running else "Readings, when it finishes", readings)
        + section("Notes", empty=True)
        + section("Used by", empty=True)
    )
    return (
        '<div class="k-popover of-pop" style="left:931px;top:132px">'
        + head("Betweenness (sampled)", "Cancel" if running else "Run")
        + f'<div class="k-popover-body">{body}</div></div>'
    )


def note(html):
    return f'<div class="k-annot-note">{html}</div>'


REFUSE_NOTES = (
    note("<b>A run that cannot use the chosen weight refuses before it starts</b>, with the same component, wording shape and focus order as the filtered-scope refusal: the error slot says what cannot happen and why, the field that causes it carries the warning mark, and the header's one primary button is the fix. Here the analyst set Weight by to confidence on a Betweenness that had run unweighted; nobody has said what a higher confidence means. framework-changes.md, &quot;Run options: a run that cannot use its weight refuses, like the filtered-scope refusal&quot;.")
    + note("<b>Nothing runs with the weight silently dropped</b>, and an unanswered meaning is &quot;not used&quot; by every measure, PageRank included, so the same column never means something in one result and nothing in another. Both are graphty-element behavior, proposed to it (framework-changes.md, &quot;graphty-element: an unanswered weight meaning is not used by every measure&quot;); the app only shows the refusal the element returns.")
    + note("<b>Set up confidence</b>: the header <b>TrailingSlot</b> <b>Button</b> (primary), where Run was. Focus lands on it and the error slot is announced; Enter opens the weight question for this column. Tab then reaches Close, Scope and the marked Weight by field, where &quot;none&quot; is the other way forward. Esc closes with nothing run; the unweighted values stay. Statistics reads &quot;Weight: confidence, not used yet&quot;.")
    + note("<b>Error slot</b>: warning glyph, the cause in bold, one secondary line; role alert. interaction-pattern-entries 8.1. Weight by is a <b>StyleSelect</b> listing the numeric edge columns and none, with the <b>FieldRow</b> warning mark.")
)

QUESTION_NOTES = (
    note("<b>The weight question, opened by the refusal's button</b>, under the Weight by field, focus on its first choice. The words are the column's, the technical term secondary (glossary 11); the examples are real values of confidence: its largest, a middle one (TP53 to DUSP6) and its smallest.")
    + note("<b>Nothing runs until it is answered</b>: Run is off, its reason in the hint under the question. Answering writes the meaning to the column as its own undo entry and turns Run on; the run is still the analyst's click. A closer link or a costlier step can weight paths; more can pass through cannot, so Betweenness refuses again, naming the answer; Don't use confidence sets Weight by to none.")
    + note("<b>Mantine Radio</b> in a radio group (figma-spec 5.6). There is no &quot;decide later&quot; choice: leaving the question unanswered already means not used, and Don't use says so for good.")
)

OVER_NOTES = (
    note("<b>Past the time limit the click creates the result and refuses it</b>: an Error row with the band as its trailing text and the cause on hover and focus. state-matrix 3, Result row, Error (row); state-matrix 4.10, row 1. &quot;Time limit&quot;, never &quot;budget&quot;, which a first-time reader took for money. The limit cannot be raised here or anywhere.")
    + note("<b>The error slot</b>: what happened, the direction and scope, and a Details link to the run's record, where the code lives. interaction-pattern-entries 8.1. The direction is the graph's own, directed, because Betweenness reads direction (graph-conventions 1, the direction list).")
    + note("<b>Four routes, grouped by whether they fit the time limit, cheapest first in each group</b>. Each is a 32 px <b>ActionRow</b>: route left, band as trailing state, description in the tooltip. A sampled route sits beside every exact one: the largest sample that fits (101) above, a larger sample of 500 below, next to the hours-long exact run. The subgraph route says what it covers, &quot;Exact, on 5,318 nodes&quot;; its tooltip names the kept set. Arrow keys choose; focus lands on the first. One commit: the header's <b>TrailingSlot</b> <b>Button</b> names the chosen route (Run sampled, Run on set, Run exactly).")
    + note("<b>Nothing else shows while the gate refuses</b>: no option rows and no Run line; the sampled route's options live on its own result. A route past the time limit runs in the background with its band and Cancel, as in screens/run-and-read.html.")
)

RUN_NOTES = (
    note("<b>Run sampled created the sibling result and ran it at once</b>: one commit, as a catalog click within the time limit. Cancel is in the header and the notice; the undo chord removes it. The refused exact result stays in the list beside it. interaction-patterns 3.3; glossary, sibling result.")
    + note("<b>State line</b>: band and verdict together, then the direction read. state-matrix 4.10. Body order is the template's: state line, Scope, Parameters, Appearance, readings, Notes, Used by. interface-templates 10.")
    + note("<b>Direction</b>: a <b>StyleSelect</b> defaulting to the graph's own direction, with Read as undirected as its other choice. <b>Sample size</b> is the library's real sampling parameter, <span class=\"k-mono\">k</span> of betweennessCentrality, named in the <b>InfoCircle</b>; an integer <b>ComboInput</b>. Its default is the largest sample that fits, read from the element, never computed by the app.")
    + note("<b>Seed</b>: a <b>ComboInput</b> showing the seed this run drew, editable, with New seed in the <b>TrailingSlot</b> (interface-templates 11), so a sampled run can be repeated exactly. It needs a seeded sample in @graphty/algorithms and graphty-element (framework-changes.md). The magenta-tagged caveat line is still proposed; toggle it off above.")
)

HELD_NOTES = (
    note("<b>After the run, an edit is held</b> for Run, as on any result that has run. interaction-patterns 3.3.")
    + note("<b>A sample past the time limit is offered, not refused</b>, as the hours-long exact run is: the field keeps 500, a warning under it gives the band and the limit, and Run starts it in the background with Cancel. The largest sample that fits is repeated. The finished estimate on 101 sources, with its seed, stays until the new one finishes. <b>FieldRow</b> warning slot; interaction-pattern-entries 8.1, the field scope.")
)


def state(sid, num, label, prev, nxt, body, pop, notes, spoken, top, left=580):
    nav = (f'<a href="#{prev}">&lsaquo;</a>' if prev else "") + (f'<a href="#{nxt}">&rsaquo;</a>' if nxt else "")
    return (
        f'<section class="of-state-frame" id="{sid}" aria-label="{label}">{body}{pop}'
        f'<div class="of-label"><span class="k-step">{num}</span>{label}<label for="annot" class="of-toggle">Notes</label>{nav}</div>'
        f'<div class="of-spoken"><b>Screen reader hears:</b> {spoken}</div><div class="of-note of-notes" style="top:{top}px;left:{left}px">{notes}</div></section>'
    )


STATES = [
    ("weight-refused", "Within the time limit: a weight the run cannot use refuses", PPI_FRAME, weight_pop(False), REFUSE_NOTES, 124,
     f"&quot;Alert. {WCAUSE} {WWHY}&quot; Focus: &quot;{WFIX}, button.&quot;", 580),
    ("weight-meaning", "Within the time limit: the question the refusal opens", PPI_FRAME, weight_pop(True), QUESTION_NOTES, 124,
     f"&quot;For {WCOL}, a higher number means..., radio group. A closer or stronger link, similarity, radio, not checked, 1 of 4.&quot;", 580),
    ("over-budget", "Over the time limit: choose how to run it", cit_frame(), OVER_POP, OVER_NOTES, 124,
     f"&quot;Betweenness, error. {CAUSE} Directed, on the full graph. Fits the time limit: Sampled, {K} sources, under a minute, 1 of 4.&quot;", 580),
    ("within-budget", "Within the time limit: the largest sample that fits, running", cit_frame("running", TOAST), sampled_pop("running"), RUN_NOTES, 150,
     "&quot;Running Betweenness (sampled), under a minute, within the time limit.&quot; (polite) Focus stays on the result's Cancel.", 580),
    ("sample-over-budget", "A sample past the time limit: offered, and run in the background", cit_frame("held"), sampled_pop("held"), HELD_NOTES, 250,
     f"&quot;Sample size, 500. 500 sources take {k500['band']}, past the {LIMIT}. Run starts it in the background.&quot;", 580),
]


def states():
    out = []
    for n, (sid, label, body, pop, notes, top, spoken, lft) in enumerate(STATES):
        prev = STATES[n - 1][0] if n else None
        nxt = STATES[n + 1][0] if n + 1 < len(STATES) else None
        out.append(state(sid, n + 1, label, prev, nxt, body, pop, notes, spoken, top, lft))
    return "\n".join(out)


NAV = "".join(f'<a href="#{s[0]}">{n + 1}. {s[1]}</a>' for n, s in enumerate(STATES))

HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440">
<title>Measure options with cost</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  /* States stacked, each exactly 1440 x 900, so #<state> lands on one state. */
  body {{ min-width: 1440px; }}
  .of-head {{ max-width: 1100px; padding: 24px 24px 16px; font-size: 13px; line-height: 20px; }}
  .of-head h1 {{ font-size: 24px; line-height: 32px; font-weight: 600; margin: 0 0 4px; }}
  .of-head p {{ margin: 0 0 8px; color: var(--cm-text-secondary); }}
  .of-head nav {{ display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }}
  .of-head a {{ color: var(--cm-text-brand); text-decoration: none; }}
  body:has(.of-state-frame:target) .of-head {{ display: none; }}
  body:has(.of-state-frame:target) .of-state-frame:not(:target) {{ display: none; }}
  .of-state-frame {{ position: relative; width: 1440px; height: 900px; overflow: hidden; border-bottom: 4px solid var(--k-annot); }}
  .of-state-frame .k-app {{ width: 1440px; height: 900px; }}
  .of-label {{ position: absolute; z-index: 95; top: 8px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px;
    height: 28px; padding: 0 6px 0 4px; border-radius: 14px; background: var(--k-annot-bg); color: var(--cm-text); font-size: 12px; font-weight: 550;
    box-shadow: 0 0 0 1px var(--k-annot); white-space: nowrap; }}
  .of-label a, .of-toggle {{ display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; color: var(--k-annot-ink); text-decoration: none; font-weight: 600; cursor: pointer; }}
  .of-toggle {{ border: 1px solid var(--k-annot); }}
  #annot:checked ~ .of-head .of-toggle[for=annot], #annot:checked ~ .of-state-frame .of-toggle {{ background: var(--k-annot); color: var(--cm-text-onbrand); }}
  #noprop:not(:checked) ~ .of-head .of-toggle[for=noprop] {{ background: var(--k-annot); color: var(--cm-text-onbrand); }}
  #noprop:checked ~ .of-state-frame .of-proposed {{ display: none; }}
  .of-note, .of-spoken {{ display: none; }}
  #annot:checked ~ .of-state-frame .of-spoken {{ display: block; }}
  .of-spoken {{ position: absolute; z-index: 95; left: 50%; top: 44px; transform: translateX(-50%); max-width: 640px; padding: 6px 10px; border-radius: 6px;
    background: var(--k-annot-bg); border: 1px dashed var(--k-annot); font-size: 12px; line-height: 17px; }}
  .of-notes {{ position: absolute; z-index: 91; width: 440px; flex-direction: column; gap: 8px; }}
  #annot:checked ~ .of-state-frame .of-notes {{ display: flex; }}
  .of-notes .k-annot-note {{ position: static; max-width: none; }}
  .of-pop {{ width: 260px; z-index: 80; }}
  .of-pop .k-popover-body {{ max-height: none; }}
  .of-pop .k-popover-head .k-btn {{ flex: none; }}
  .of-focus {{ outline: 2px solid var(--cm-border-selected); outline-offset: -2px; }}
  .of-err {{ display: flex; gap: 6px; align-items: flex-start; padding: 6px 8px 8px 16px; line-height: 16px; }}
  .of-err .k-warn-glyph {{ margin-top: 1px; }}
  .of-state {{ padding: 6px 8px 4px 16px; line-height: 16px; }}
  .of-plainb {{ font-weight: 550; color: var(--cm-text); }}
  .of-bar {{ padding: 0 8px 6px 16px; }}
  .of-sub {{ display: flex; align-items: center; height: 32px; padding: 0 8px 0 16px; font-weight: 550; color: var(--cm-text-secondary); }}
  .of-route .of-band {{ flex: none; white-space: nowrap; }}
  .of-psec .k-section-head {{ gap: 4px; }}
  .of-of {{ background: transparent; box-shadow: none; }}
  .of-hint {{ padding: 0 8px 6px 16px; line-height: 15px; margin-top: -4px; }}
  .of-warn {{ display: flex; gap: 6px; align-items: flex-start; color: var(--cm-text); }}
  .of-warn .k-warn-glyph {{ margin-top: 1px; }}
  .of-prose {{ padding-top: 2px; padding-bottom: 6px; line-height: 16px; }}
  .of-runline {{ padding: 2px 16px 8px; }}
  .of-filt {{ margin-inline-end: 4px; }}
  .of-nowrap {{ white-space: nowrap; }}
  .of-state-frame .k-toast {{ white-space: nowrap; transform: translateX(40px); }}
  .of-toast-band {{ color: var(--cm-text-menu-secondary); }}
  /* The weight question: Mantine Radio themed per figma-spec 5.6. */
  .of-q {{ padding: 4px 8px 4px 16px; }}
  .of-q-text {{ line-height: 16px; padding-bottom: 4px; }}
  .of-radio-row {{ display: flex; align-items: flex-start; gap: 8px; min-height: 24px; padding: 4px 0; line-height: 16px; border-radius: 4px; }}
  .of-radio-row .of-radio {{ margin-top: 0; }}
  .k-field[data-warn] {{ box-shadow: inset 0 0 0 1px var(--cm-bg-warning); gap: 4px; }}
  .of-radio {{ width: 16px; height: 16px; border-radius: 50%; flex: none; background: var(--cm-bg-secondary); box-shadow: inset 0 0 0 1px var(--cm-border-translucent-strong); }}
  .of-term {{ color: var(--cm-text-secondary); }}
  .of-q .of-hint {{ padding: 0; margin-top: 2px; }}
</style>
</head>
<body>
<!-- Both toggles are checkboxes, so the annotation layer and the proposed rows need no script. -->
<input type="checkbox" id="annot" hidden>
<input type="checkbox" id="noprop" hidden>
<script>if (/[?&]notes/.test(location.search)) document.getElementById("annot").checked = true;</script>
<div class="of-head">
  <h1>Measure options with cost</h1>
  <p>What a measure's options look like when running it has a cost. First, Betweenness on the 300-protein network, well within the time limit: set to weight its paths by confidence, which nobody has said the meaning of, the run refuses and its one button opens the question; nothing runs until it is answered, and until then no measure uses confidence. Then Betweenness on the {N}-patent citation graph, which would take hours, past the {CAP}-second time limit, so graphty-element refuses to start it and lists the ways forward, each with its cost: the largest sampled estimate that fits, exact on a 5,318-node kept set, a larger sample of 500, or exact on the full graph in the background. Then the sampled estimate running, with its direction and seed in view, and a sample of 500 set after it finished. Every time word comes from graphty-element's cost model over the graph's real size; the page follows your system theme.</p>
  <nav>{NAV}<label for="annot" class="of-toggle">Show annotations</label><label for="noprop" class="of-toggle">Proposed rows</label></nav>
</div>
{states()}
</body>
</html>
"""
open(os.path.join(P, "screens/option-form-cost.html"), "w").write(HTML)
# The current frame (rail, header, Styles and Results in the inspector): kit/shell.mjs
import subprocess
subprocess.run(["node", os.path.join(P, "kit/shell.mjs"), os.path.join(P, "screens/option-form-cost.html")], check=True)
assert all(ord(ch) < 128 for ch in HTML), "non-ASCII in output"
assert "#000" not in HTML and "#fff" not in HTML, "hex chrome color"
assert "udget" not in HTML.replace("over-budget", "").replace("within-budget", "").replace("KWithinBudget", "").replace("&quot;budget&quot;", ""), "the word is time limit"
print("ok")
