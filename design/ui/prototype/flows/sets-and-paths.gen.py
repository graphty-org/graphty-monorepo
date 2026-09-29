"""Draws the two flow diagrams as inline SVG into sets-and-paths.template.html and writes
sets-and-paths.html. Edit the template for text, this file for the diagrams; run: python3 flows/sets-and-paths.gen.py"""
import html, os
HERE = os.path.dirname(os.path.abspath(__file__))

OUT = os.path.join(HERE, "sets-and-paths.html")
SCR = "../screens/sets-and-paths.html"
CW, RH, X0, Y0 = 210, 96, 16, 16      # column pitch, row pitch, margins
W, H = 128, 60                         # node box


def center(n):
    return X0 + n["c"] * CW + W / 2, Y0 + n["r"] * RH + H / 2


def shape(n):
    x, y = center(n)
    k, hw, hh = n["k"], W / 2, H / 2
    if k == "place":
        return f'<rect x="{x-hw}" y="{y-hh}" width="{W}" height="{H}" rx="4"/>'
    if k == "device":
        return f'<rect x="{x-hw}" y="{y-hh}" width="{W}" height="{H}" rx="{hh}"/>'
    if k == "decide":
        return f'<polygon points="{x},{y-hh-6} {x+hw+4},{y} {x},{y+hh+6} {x-hw-4},{y}"/>'
    if k == "check":
        return f'<polygon points="{x-hw+14},{y-hh} {x+hw-14},{y-hh} {x+hw},{y} {x+hw-14},{y+hh} {x-hw+14},{y+hh} {x-hw},{y}"/>'
    if k == "commit":
        return f'<polygon points="{x-hw+12},{y-hh} {x+hw},{y-hh} {x+hw-12},{y+hh} {x-hw},{y+hh}"/>'
    raise ValueError(k)


def clip(n, dx, dy):
    """Distance from the node center to its outline along (dx, dy), roughly."""
    hw, hh = W / 2, H / 2
    if n["k"] == "decide":
        hw, hh = hw + 4, hh + 6
        s = abs(dx) / hw + abs(dy) / hh
        return 1 / s if s else 0
    tx = hw / abs(dx) if dx else 1e9
    ty = hh / abs(dy) if dy else 1e9
    return min(tx, ty)


def edge(a, b, label="", bend=0, cls=""):
    (x1, y1), (x2, y2) = center(a), center(b)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    if bend:
        # control point perpendicular to the chord
        dx, dy = x2 - x1, y2 - y1
        L = (dx * dx + dy * dy) ** 0.5
        cx, cy = mx - dy / L * bend, my + dx / L * bend
        t1 = clip(a, cx - x1, cy - y1); t2 = clip(b, cx - x2, cy - y2)
        sx, sy = x1 + (cx - x1) * t1, y1 + (cy - y1) * t1
        ex, ey = x2 + (cx - x2) * t2, y2 + (cy - y2) * t2
        d = f"M{sx:.1f} {sy:.1f} Q{cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}"
        lx, ly = 0.25 * sx + 0.5 * cx + 0.25 * ex, 0.25 * sy + 0.5 * cy + 0.25 * ey
    else:
        t1 = clip(a, x2 - x1, y2 - y1); t2 = clip(b, x1 - x2, y1 - y2)
        sx, sy = x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1
        ex, ey = x2 + (x1 - x2) * t2, y2 + (y1 - y2) * t2
        d = f"M{sx:.1f} {sy:.1f} L{ex:.1f} {ey:.1f}"
        lx, ly = (sx + ex) / 2, (sy + ey) / 2
    out = f'<path class="e {cls}" d="{d}" marker-end="url(#arr)"/>'
    if label:
        lines = label.split("\n")
        start = abs(bend) > 100
        if start:
            lx += 6
        out += f'<text class="el{" start" if start else ""}" x="{lx:.1f}" y="{ly - (len(lines)-1)*6.5 + 4:.1f}">' + "".join(
            f'<tspan x="{lx:.1f}" dy="{0 if i == 0 else 13}">{html.escape(t)}</tspan>' for i, t in enumerate(lines)) + "</text>"
    return out


def node(n):
    x, y = center(n)
    lines = n["t"].split("\n")
    cls = "n " + n["k"] + (" gap" if n.get("gap") else "") + (" branch" if n.get("branch") else "")
    txt = f'<text x="{x}" y="{y - (len(lines)-1)*7 + 4}">' + "".join(
        f'<tspan x="{x}" dy="{0 if i == 0 else 14}">{html.escape(t)}</tspan>' for i, t in enumerate(lines)) + "</text>"
    g = f'<g class="{cls}">{shape(n)}{txt}</g>'
    if n.get("href"):
        g = f'<a href="{n["href"]}"><title>Open the mock of this step</title>{g}</a>'
    return g


def diagram(nodes, edges, rows, title):
    maxc = max(n["c"] for n in nodes.values())
    w, h = X0 * 2 + maxc * CW + W, Y0 * 2 + rows * RH - (RH - H)
    body = "".join(edge(nodes[a], nodes[b], *rest) for a, b, *rest in edges) + "".join(node(n) for n in nodes.values())
    return f'<svg class="flow" viewBox="0 0 {w} {h}" role="group" aria-label="{html.escape(title)}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="ah"/></marker></defs>{body}</svg>'


# ---------- Flow 1: keep and combine sets (15 nodes) ----------
A = {
    "a1": dict(c=0, r=1, k="place", t="Canvas: merchant\nACC-893168 selected"),
    "a2": dict(c=1, r=1, k="place", t="Canvas: its 37\npayers selected"),
    "a3": dict(c=2, r=1, k="commit", t="Frozen set Paid\nACC-893168, named"),
    "b1": dict(c=0, r=2.2, k="place", t="Histogram: riskScore\nband 70 to 98"),
    "b2": dict(c=2, r=2.2, k="commit", t="Rule set High risk,\n143, named"),
    "sp": dict(c=3, r=1.6, k="place", t="Graph:\nSets and paths", href=SCR + "#s1"),
    "d1": dict(c=4, r=1.6, k="decide", t="Combine\ntwo sets?"),
    "r1": dict(c=4, r=0.3, k="place", t="Sets and paths: each\nset as it was kept"),
    "fb": dict(c=5, r=1.6, k="device", t="Focus bar of the\nfocused rows", href=SCR + "#s1"),
    "c3": dict(c=5, r=3.0, k="commit", t="Rule set naming\nboth operands", gap=True, href=SCR + "#s2"),
    "d0": dict(c=4, r=3.0, k="decide", t="Any overlap?"),
    "t1": dict(c=3, r=3.0, k="check", t="Created from names\nboth sets; count 16", href=SCR + "#s2"),
    "d2": dict(c=2, r=3.0, k="decide", t="Keep today's\nmembers as well?"),
    "c4": dict(c=1, r=3.0, k="commit", t="New frozen set, 16;\nrule set unchanged", href=SCR + "#s7"),
    "r2": dict(c=3, r=4.4, k="place", t="Sets and paths: the\nrule set follows data"),
}
AE = [
    ("a1", "a2", "Neighbors:\ndirection In,\nSelect\nneighbors"),
    ("a2", "a3", "Create set"),
    ("b1", "b2", "Create rule set"),
    ("a3", "sp"), ("b2", "sp"),
    ("sp", "d1"),
    ("d1", "r1", "no"),
    ("d1", "fb", "yes: focus\nboth rows"),
    ("fb", "c3", "Intersect"),
    ("c3", "d0"),
    ("d0", "t1", "yes"),
    ("d0", "r2", "no: 0 members,\nkept as an answer"),
    ("t1", "d2"),
    ("d2", "c4", "yes: Freeze"),
    ("d2", "r2", "no"),
]

# ---------- Flow 2: paths between two accounts ----------
B = {
    "s1": dict(c=0, r=0.9, k="place", t="Inspector: one\naccount selected"),
    "qa": dict(c=0, r=2.1, k="device", t="Quick actions,\none account selected"),
    "s2": dict(c=0, r=3.8, k="place", t="Inspector: two\naccounts selected"),
    "tb": dict(c=0, r=5.0, k="place", t="Toolbar: Path tool"),
    "esc": dict(c=1, r=0, k="place", t="Nothing runs; focus\nback on Path to...", branch=True),
    "pick": dict(c=1, r=1.5, k="device", t="Pick mode: \"Pick the\nend node: click, or\nfind it by name\""),
    "pf": dict(c=1, r=4.4, k="device", t="Paths between: From,\nTo, Direction, Weight\nby, Scope, time order", href=SCR + "#s3"),
    "fo": dict(c=2, r=2.95, k="decide", t="Follow time\norder ticked?", gap=True),
    "nt": dict(c=5, r=1.5, k="place", t="No path in time\norder; 2 out of\norder exist", branch=True, gap=True),
    "sc": dict(c=2, r=1.5, k="decide", t="Both ends inside\nthe filter?"),
    "wb": dict(c=2, r=4.4, k="decide", t="Weight by?"),
    "wq": dict(c=3, r=4.4, k="check", t="Run refused until\namount is answered", gap=True, href=SCR + "#s5"),
    "run": dict(c=3, r=2.95, k="commit", t="Query run under\nPaths between"),
    "np": dict(c=4, r=1.5, k="place", t="No path along\ntransfers; Ignore\ndirection", branch=True, href=SCR + "#s6"),
    "f": dict(c=4, r=2.95, k="decide", t="Path found?"),
    "fp": dict(c=5, r=2.95, k="place", t="Canvas: every equal\npath, drawn and\nselected", gap=True, href=SCR + "#s4"),
    "t2": dict(c=5, r=4.4, k="check", t="State line: 2 equal\npaths; weight, scope;\ntime order", gap=True, href=SCR + "#s4"),
    "tbl": dict(c=4, r=4.4, k="place", t="Table: 5 transfers,\ntime after the ends;\nearlier hops named"),
    "eq": dict(c=5, r=5.8, k="device", t="The list: each route,\nits hops and dates", gap=True),
    "k": dict(c=4, r=5.8, k="decide", t="Keep it?"),
    "c1": dict(c=3, r=5.8, k="commit", t="Path kept: 2\nroutes, 5 accounts"),
    "e": dict(c=4, r=7.1, k="place", t="Results: the query\nstays under its result"),
}
BE = [
    ("s1", "pick", "Path to..."),
    ("qa", "pick", "Path to..."),
    ("pick", "esc", "Esc", 0, "br"),
    ("pick", "sc", "end picked"),
    ("sc", "run", "yes: runs\nat once"),
    ("sc", "pf", "no: the form\nopens, scope\nstated", 80),
    ("s2", "pf", "Paths\nbetween..."),
    ("tb", "pf", "click From,\nthen To"),
    ("pf", "wb"),
    ("wb", "fo", "none, or a\nmeaning set"),
    ("fo", "run", "no, or yes:\nonly later\nhops"),
    ("wb", "wq", "amount,\nnot set"),
    ("wq", "fo", "answered"),
    ("run", "f"),
    ("f", "np", "no", 0, "br"),
    ("np", "run", "Ignore\ndirection"),
    ("f", "nt", "none in\ntime order", 0, "br"),
    ("nt", "fp", "Show paths\nout of order"),
    ("f", "fp", "yes"),
    ("fp", "t2"),
    ("t2", "tbl", "Show as\nrows"),
    ("t2", "eq", "expand"),
    ("t2", "k"),
    ("k", "c1", "yes: Create\npath"),
    ("k", "e", "no"),
]

# ---------- Routes not drawn yet (task-flows 10.3), each from the place it would start ----------
G = {
    "g1": dict(c=0, r=0, k="place", t="Sets and paths:\ntwo sets focused"),
    "h1": dict(c=1, r=0, k="commit", t="Compare with...\nhow the sets differ", gap=True),
    "g2": dict(c=2, r=0, k="place", t="The intersection,\n16 accounts"),
    "h2": dict(c=3, r=0, k="check", t="Is 16 more than\nchance would give?", gap=True),
    "g3": dict(c=4, r=0, k="place", t="Inspector: one\naccount selected"),
    "h3": dict(c=5, r=0, k="check", t="Money in and out:\ntotals by direction", gap=True),
    "g4": dict(c=0, r=1.05, k="place", t="Inspector: two\naccounts selected"),
    "h4": dict(c=1, r=1.05, k="commit", t="Merge: one person,\ntwo accounts", gap=True),
}
GE = [("g1", "h1", "0 to 2\nsteps"), ("g2", "h2", "2 steps"), ("g3", "h3", "0 steps"), ("g4", "h4", "2 steps")]

C = {
    "n0": dict(c=0, r=1, k="place", t="Inspector:\nACC-233575 selected,\nfull graph"),
    "n1": dict(c=1, r=1, k="device", t="Neighbors menu:\nhops, direction,\nwindow"),
    "esc": dict(c=1, r=0, k="place", t="Nothing changes; focus\nback on Neighbors", branch=True),
    "nd": dict(c=2, r=1, k="decide", t="A date column\non transfers?"),
    "nw": dict(c=3, r=1, k="device", t="Window on timestamp:\n4 Mar to Mar 17", gap=True),
    "nno": dict(c=2, r=2.3, k="place", t="No window offered;\nno time marks"),
    "nc": dict(c=4, r=1, k="check", t="Size on each hop:\n2 hops, 10 accounts", gap=True),
    "ne": dict(c=4, r=0, k="place", t="0 transfers in the\nwindow: nothing runs", branch=True),
    "nf": dict(c=5, r=1, k="commit", t="Filter step:\nACC-233575 and\nneighbors, out"),
    "ns": dict(c=5, r=2.3, k="check", t="One summary line;\n2 transfers earlier\nthan the hop before", gap=True),
    "nr": dict(c=4, r=2.3, k="place", t="Edges tab: 12\ntransfers, time after\nthe two accounts"),
    "nk": dict(c=3, r=2.3, k="decide", t="Go further?"),
    "na": dict(c=3, r=3.6, k="commit", t="Add their neighbors:\none more hop, the\nsame window"),
    "nset": dict(c=2, r=3.6, k="commit", t="Create set: Out\nof ACC-233575,\n4 to Mar 17"),
}
CE = [
    ("n0", "n1", "Neighbors\ncaret"),
    ("n1", "esc", "Esc", 0, "br"),
    ("n1", "nd", "Direction:\nOut"),
    ("nd", "nw", "yes"),
    ("nd", "nno", "no"),
    ("nw", "nc"),
    ("nno", "nc"),
    ("nc", "ne", "window\ntoo narrow", 0, "br"),
    ("ne", "nw", "Widen"),
    ("nc", "nf", "Filter to\nneighbors"),
    ("nf", "ns"),
    ("ns", "nr", "Show as\nrows"),
    ("nr", "nk"),
    ("nk", "na", "yes"),
    ("nk", "nset", "no: keep\nthese"),
]

LEG = {
    "l1": dict(c=0, r=0, k="place", t="A place"),
    "l2": dict(c=1, r=0, k="device", t="A bar, menu\nor popover"),
    "l3": dict(c=2, r=0, k="decide", t="A question"),
    "l4": dict(c=3, r=0, k="check", t="A trust check"),
    "l5": dict(c=4, r=0, k="commit", t="A committed change\n(one undo entry)"),
    "l6": dict(c=5, r=0, k="place", t="Not yet possible:\nwaits on the element", gap=True),
}

svg_leg = diagram(LEG, [], 1, "Shapes used in the diagrams")
svg_a = diagram(A, AE, 5.4, "Flow: keep and combine sets")
svg_b = diagram(B, BE, 8.1, "Flow: paths between two accounts")
svg_g = diagram(G, GE, 2.05, "Routes not drawn yet, from where each would start")
svg_c = diagram(C, CE, 4.6, "Flow: neighbors out of one account, in a date window")


# ---------- The trace's numbers, read from the kit's fixtures (scenarios.setsAndPathsTrace) ----------
import json, datetime
FX = json.load(open(os.path.join(HERE, "../kit/fixtures.json")))
TR = FX["scenarios"]["setsAndPathsTrace"]
PATH = FX["datasets"]["transactions"]["setsAndPaths"]["path"]


def when(iso, minute=True):
    d = datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
    return f"{d.day} {d:%b}" + (f" {d:%H:%M}" if minute else "")


def usd(v):
    return f"${v:,.2f}"


def stamp(iso):
    return iso.replace("T", " ")[:16] + " UTC"


CLOCK = '<svg class="k-i k-i-sm tmark" aria-hidden="true"><use href="../kit/icons.svg#clock"/></svg>'


def order_cell(earlier, before=None):
    if earlier:
        return f'<td class="late">{CLOCK}earlier than the hop before' + (f" ({before})" if before else "") + "</td>"
    return '<td class="k-secondary">in order</td>'


def trace_rows():
    out = []
    for r in TR["step1"]["rows"]:
        out.append(f'<tr><td class="k-id">{r["from_account"]}</td><td class="k-id">{r["to_account"]}</td><td class="k-num">{stamp(r["timestamp"])}</td><td class="k-num">1</td><td class="k-num">{usd(r["amount"])}</td>{order_cell(False)}</tr>')
    for r in TR["step2"]["rows"]:
        e = r["earlierThanHopBefore"]
        out.append(f'<tr{" data-late" if e else ""}><td class="k-id">{r["from_account"]}</td><td class="k-id">{r["to_account"]}</td><td class="k-num">{stamp(r["timestamp"])}</td><td class="k-num">2</td><td class="k-num">{usd(r["amount"])}</td>{order_cell(e, when(r["reachedAt"]) if e else None)}</tr>')
    return "".join(out)


def summary():
    s1, s2 = TR["step1"], TR["step2"]
    return (f'Out of {TR["seed"]}, {when(TR["window"][0], False)} to {when(TR["window"][1], False)}: {s1["transfers"]} transfers, {usd(s1["total"])}, '
            f'to {s1["accounts"]} accounts; then {s2["inOrderTransfers"]} transfers out of them after the one that reached them, {usd(s2["totalInOrder"])}, '
            f'to {s2["inOrderAccounts"]} more accounts, within {TR["inOrderHours"]} hours. '
            f'{s2["earlierThanHopBefore"]} transfers are earlier than the hop before and are not counted.')


def reversed_rows():
    """The reversed search, ignoring direction: walked from ACC-233575 back to ACC-271813, in walk order."""
    rows, seen = [], set()
    for rt in PATH["routes"]:
        tr = list(reversed(rt["transfers"]))
        for h, t in enumerate(tr):
            key = (t["source"], t["target"])
            if key in seen:
                continue
            seen.add(key)
            prev = tr[h - 1] if h else None
            e = bool(prev and t["timestamp"] < prev["timestamp"])
            rows.append((h + 1, t, e, when(prev["timestamp"]) if e else None))
    rows.sort(key=lambda x: x[0])
    return "".join(
        f'<tr{" data-late" if e else ""}><td class="k-id">{t["source"]}</td><td class="k-id">{t["target"]}</td><td class="k-num">{stamp(t["timestamp"])}</td><td class="k-num">{h}</td><td class="k-num">{usd(t["amount"])}</td>{order_cell(e, b)}</tr>'
        for h, t, e, b in rows)


def fork():
    """The canvas marks, sketched: ACC-233575 to ACC-350110, then one hop in order and one earlier."""
    r1 = next(r for r in TR["step1"]["rows"] if r["to_account"] == "ACC-350110")
    ok = next(r for r in TR["step2"]["rows"] if r["from_account"] == "ACC-350110" and not r["earlierThanHopBefore"])
    late = next(r for r in TR["step2"]["rows"] if r["from_account"] == "ACC-350110" and r["earlierThanHopBefore"])
    N = [(70, 80, TR["seed"]), (300, 80, "ACC-350110"), (620, 25, ok["to_account"]), (620, 135, late["to_account"])]
    def node(x, y, t):
        return f'<g class="fn"><rect x="{x-58}" y="{y-13}" width="116" height="26" rx="13"/><text x="{x}" y="{y+4}">{t}</text></g>'
    def hop(a, b, r, dashed):
        (x1, y1, _), (x2, y2, _) = N[a], N[b]
        sx, ex = x1 + 58, x2 - 60
        mx, my = (sx + ex) / 2, (y1 + y2) / 2
        g = f'<path class="fe{" late" if dashed else ""}" d="M{sx} {y1} L{ex} {y2}" marker-end="url(#farr)"/>'
        lab = f'{when(r["timestamp"])}, {usd(r["amount"])}'
        if y1 == y2:
            g += f'<text class="fl" x="{mx}" y="{my - 8}">{when(r["timestamp"])}</text><text class="fl sub" x="{mx}" y="{my + 16}">{usd(r["amount"])}</text>'
        elif y2 < y1:
            g += f'<text class="fl" text-anchor="end" x="{mx - 24}" y="{my - 14}">{lab}</text>'
        else:
            g += f'<text class="fl" text-anchor="end" x="{mx - 24}" y="{my + 26}">{lab}</text>'
        if dashed:
            # the clock mark sits on the dashed line
            g += f'<g class="fclock"><circle cx="{mx}" cy="{my}" r="8"/><path d="M{mx} {my - 4.5} V{my} L{mx + 3.5} {my + 2}"/></g>'
        return g
    body = hop(0, 1, r1, False) + hop(1, 2, ok, False) + hop(1, 3, late, True) + "".join(node(*n) for n in N)
    return (f'<svg class="fork" viewBox="0 0 700 160" role="img" aria-label="Sketch of the canvas marks: {TR["seed"]} to ACC-350110 on {when(r1["timestamp"])}; '
            f'then to {ok["to_account"]} on {when(ok["timestamp"])}, drawn solid; and to {late["to_account"]} on {when(late["timestamp"])}, earlier than the hop before, drawn dashed with a clock mark">'
            '<defs><marker id="farr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="fah"/></marker></defs>'
            + body + "</svg>")

page = open(os.path.join(HERE, "sets-and-paths.template.html")).read()
page = page.replace("<!--LEGEND-->", svg_leg).replace("<!--FLOW-A-->", svg_a).replace("<!--FLOW-B-->", svg_b).replace("<!--GAPS-->", svg_g).replace("<!--FLOW-C-->", svg_c)
page = page.replace("<!--TRACE-ROWS-->", trace_rows()).replace("<!--TRACE-SUMMARY-->", summary()).replace("<!--REVERSED-ROWS-->", reversed_rows()).replace("<!--FORK-->", fork())
open(OUT, "w").write(page)
print("wrote", OUT)
