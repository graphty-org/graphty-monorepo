# Builds screens/alert-triage.html (plain ASCII output). Run: python3 build.py
# Reads kit/alerts.json (made by kit/gen-alerts.mjs) and states.py beside it. board.py builds the
# storyboard; shots.sh renders every state to shots/.
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
PROTO = os.path.abspath(os.path.join(HERE, "../../.."))
OUT = os.path.join(PROTO, "screens")
AL = json.load(open(os.path.join(PROTO, "kit/alerts.json")))
A, BANK = AL["august"], AL["bank"]
# The money words and the dated Neighbors trace: kit/fixtures.json scenarios.alertTriage, written by
# trace-numbers.mjs beside this file (run it first when kit/gen-alerts.mjs changes).
SC = json.load(open(os.path.join(PROTO, "kit/fixtures.json")))["scenarios"]["alertTriage"]
MONEY, TRACE = SC["accounts"], SC["trace"]
VERM = "#D55E00"

def n(x): return f"{x:,}"
def usd(x): return f"{x:,.2f}"
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
def when(iso):  # "2026-08-07T02:17:00Z" -> "Aug 7 02:17" (every time in the fixture is UTC)
    return f'{MON[int(iso[5:7]) - 1]} {int(iso[8:10])} {iso[11:16]}' if iso else ""
def ic(name, cls="k-i"): return f'<svg class="{cls}"><use href="../kit/icons.svg#{name}"/></svg>'
DIA = '<span class="at-dia" aria-hidden="true"></span>'

def rail(active="Graph"):
    def b(icon, label, extra=""):
        p = ' aria-pressed="true"' if label == active else ""
        return f'<div class="k-rail-btn"{p}{extra}><span class="k-rail-pill">{ic(icon)}</span>{label}</div>'
    return ('<nav class="k-rail" aria-label="Main"><div class="k-rail-btn" aria-label="Main menu"><span class="k-rail-pill">' + ic("menu") + '</span></div><div class="k-rail-sep"></div>'
            + b("network", "Graph") + b("database", "Data") + b("flask-conical", "Results") + b("sticky-note", "Notes")
            + '<div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div></nav>')

def chip(text, expanded=False):
    e = ' aria-expanded="true"' if expanded else ""
    return f'<span class="k-chip"{e}>{ic("funnel", "k-i k-i-sm")}<span class="k-num">{text}</span></span>'

def filechip(name, open_=False):
    e = ' aria-expanded="true"' if open_ else ""
    return f'<span class="k-chip at-file"{e} title="{name}">{ic("file", "k-i k-i-sm")}<span class="k-id k-ellipsis">{name}</span></span>'

def panel(project, chip_html, body, file=A["file"], file_open=False):
    return (f'<aside class="k-panel" aria-label="Graph"><div class="k-panel-head"><div class="k-title-line"><span class="k-project">{project}</span>'
            f'{ic("chevron-down", "k-i k-i-sm k-secondary")}<span class="k-grow"></span>{filechip(file, file_open)}</div><div class="at-chips">{chip_html}</div></div><div class="k-scroll">{body}</div></aside>')

def section(head, inner, extra_head="", attrs=""):
    return f'<section class="k-section"{attrs}><div class="k-section-head">{head}<span class="k-grow"></span>{extra_head}</div>{inner}</section>'

def item(icon_html, name, kind="", trail="", attrs=""):
    k = f'<span class="k-kind">{kind}</span>' if kind else ""
    return f'<li class="k-item"{attrs}>{icon_html}<span class="k-ellipsis">{name}</span>{k}<span class="k-trail">{trail}</span></li>'

def graphs_section(name, count):
    return section("Graphs", f'<ul class="k-list"><li class="k-item" aria-selected="true">{ic("network")}<span class="k-grow k-ellipsis">{name}</span><span class="k-trail k-num">{count}</span></li></ul>',
                   f'<span class="k-icon-btn">{ic("search")}</span><span class="k-icon-btn">{ic("plus")}</span>')

def sets_section(rows):
    return section("Sets and paths", '<ul class="k-list">' + "".join(rows) + "</ul>", f'<span class="k-icon-btn">{ic("plus")}</span>')

# The Style stack, in the inspector when it shows the graph. The Alerts layer came with the team's
# recipe (vermillion and a diamond on alert is true). Shape by kind is only offered: a suggested
# layer the reader adds with its +, never drawn until then.
def style_stack(count=50):
    return section("Style stack", '<ul class="k-list">'
                   + item(DIA, "Alerts", "recipe", f'<span class="k-num">{n(count)}</span>')
                   + item('<span class="k-chit" style="background:#808080"></span>', "Base style") + "</ul>"
                   + '<div class="k-group-head">Suggested</div>'
                   + f'<div class="k-row at-suggest"><span class="at-kinds" aria-hidden="true"><i></i><i></i><i></i></span><span class="k-grow">Shape by kind<br><span class="k-secondary">3 kinds: personal, business, merchant. Not drawn until added.</span></span><span class="k-icon-btn" aria-label="Add the layer Shape by kind">{ic("plus")}</span></div>',
                   f'<span class="k-icon-btn" aria-label="Add a style layer">{ic("plus")}</span>')

def views_section(count=0, rows=""):
    if not count:
        return '<section class="k-section" data-collapsed><div class="k-section-head">Views <span class="k-count k-num">0</span></div></section>'
    return section(f'Views <span class="k-count k-num">{count}</span>', f'<ul class="k-list">{rows}</ul>')

def toolbar(armed="select", toast_html=""):
    tools = []
    for icon, name in (("mouse-pointer-2", "select"), ("route", "path")):
        pressed = ' aria-pressed="true"' if armed == name else ""
        tools.append(f'<span class="k-tool"{pressed}>{ic(icon, "k-i k-i-lg")}</span>' + ('<span class="k-tool-caret">' + ic("chevron-down", "k-i k-i-sm") + '</span>' if name == "select" else ""))
    return ('<div class="k-toolbar-dock">' + toast_html + '<div class="k-toolbar" role="toolbar">' + "".join(tools)
            + '<span class="k-toolbar-sep"></span><span class="k-tool">' + ic("zap", "k-i k-i-lg") + '</span><span class="k-toolbar-sep"></span><span class="k-tool">'
            + ic("square", "k-i k-i-lg") + '</span><span class="k-tool-caret">' + ic("chevron-down", "k-i k-i-sm") + '</span></div></div>')

def canvas(drawing, alt, overlays="", legend="", toast_html="", armed="select", bar=""):
    stage = ""
    if drawing:
        base = f'img/{drawing[4:]}' if drawing.startswith("img:") else f'../kit/canvas/alerts-{drawing}'
        stage = (f'<div class="k-stage"><img class="k-light-only" src="{base}-light.svg" alt="{alt}">'
                 f'<img class="k-dark-only" src="{base}-dark.svg" alt="{alt}">{overlays}</div>')
    lg = f'<div class="k-legend-card">{legend}</div>' if legend else ""
    return f'<div class="k-canvas">{bar}{stage}{lg}{toolbar(armed, toast_html)}<span class="k-help">{ic("circle-help")}</span></div>'

def dock(tabs, sel, scope, head, rows, foot=""):
    SELA, KN = ' aria-selected="true"', ' class="k-n"'
    t = "".join(f'<span class="k-tab"{SELA if x == sel else ""}>{x}</span>' for x in tabs)
    th = "".join(f'<th{KN if num else ""}>{h}</th>' for h, num in head)
    trs = []
    for attrs, cells in rows:
        tds = "".join("<td" + (f' class="{c}"' if c else "") + f">{v}</td>" for v, c in cells)
        trs.append(f"<tr{attrs}>{tds}</tr>")
    ft = f'<div class="k-scope at-sum k-num">{foot}</div>' if foot else ""
    return (f'<section class="k-dock" aria-label="Table"><div class="k-dock-tabs">{t}<span class="k-grow"></span><span class="k-icon-btn">{ic("search")}</span>'
            f'<span class="k-icon-btn">{ic("ellipsis")}</span></div><div class="k-scope">{scope}</div><div class="k-table-wrap"><table class="k-table"><thead><tr>{th}</tr></thead><tbody>{"".join(trs)}</tbody></table></div>{ft}</section>')

def right(typerow_html, body, who=None, zoom="Fit"):  # who: kept for callers; the frame has no avatar
    return (f'<aside class="k-right" aria-label="Inspector"><div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">{zoom}{ic("chevron-down", "k-i k-i-sm")}</span></div>'
            f'{typerow_html}<div class="k-scroll">{body}</div></aside>')

def typerow(icon, name, kind, verbs="", line3=""):
    return (f'<div class="k-typerow at-typerow"><div class="at-l1"><svg class="k-i"><use href="../kit/icons.svg#{icon}"/></svg><span class="k-name k-id k-ellipsis k-grow">{name}</span>'
            f'<span class="k-icon-btn">{ic("ellipsis")}</span></div><div class="at-l2"><span class="k-secondary k-grow k-ellipsis">{kind}</span>{verbs}</div>{line3}</div>')

PATH_TO = f'<div class="at-l3"><span class="k-btn k-btn-secondary k-btn-block at-paths" role="button" aria-label="Path to another node">{ic("route")}Path to...</span></div>'

# The node's verbs: the Neighbors split button (a neighborhood glyph, never the share glyph, which
# reads as Export) and Pin, then Path to... on its own line, as screens/inspector.html draws a node.
def node_verbs(open_=False):
    o = ' data-open' if open_ else ""
    x = "true" if open_ else "false"
    return (f'<span class="at-split"{o}><span class="at-nbmain" role="button" aria-label="Neighbors: filter to neighbors, 1 hop" data-tip="Filter to neighbors, 1 hop  Shift+N">{ic("waypoints", "k-i k-i-sm")}Neighbors</span><span class="at-caret" role="button" aria-label="Neighbors options" aria-haspopup="menu" aria-expanded="{x}">{ic("chevron-down", "k-i k-i-sm")}</span></span>'
            f'<span class="k-icon-btn" role="button" aria-label="Pin" data-tip="Pin">{ic("pin")}</span>')

def data(name, value, cls=""):
    return f'<div class="k-data"><span class="k-name">{name}</span><span class="k-value {cls}">{value}</span></div>'

def arow(label, trail="", attrs=""):
    return f'<div class="k-row"{attrs}><span class="k-grow">{label}</span>{trail}</div>'

def prose(text, cls=""):
    return f'<div class="k-prose {cls}">{text}</div>'

# The style row: which layer paints this node. A chit and the layer's name, opening that layer's
# editor -- never an editable color on one node (interface-specification 3.1).
def style_row(alerted):
    if alerted:
        return section("Appearance", f'<div class="k-row at-stylerow">{DIA}<span class="k-grow">Alerts</span><span class="k-secondary">layer</span>{ic("chevron-right", "k-i k-i-sm k-secondary")}</div>')
    return section("Appearance", f'<div class="k-row at-stylerow"><span class="k-chit" style="background:#808080"></span><span class="k-grow">Base style</span><span class="k-secondary">layer</span>{ic("chevron-right", "k-i k-i-sm k-secondary")}</div>')

# Attribute provenance: each group of attributes says which file it came from, and a delivered
# score says graphty did not compute it. Every value is the fixture's own column.
def src(file, text=""):
    return f'<div class="at-src">From <span class="k-id">{file}</span>{text}</div>'
def node_inspector(r, members="1 set", open_menu=False, in_full=None, extra=""):
    body = data("kind", r["kind"])
    if r["category"]: body += data("category", r["category"])
    body += data("country", r["country"]) + data("riskScore", r["riskScore"])
    body += src(A["accountsFile"], ". riskScore is the bank's customer risk rating as delivered; not computed by graphty.")
    body += data("alert", "true" if r["alert"] else "false")
    if r["alertId"]: body += data("alertId", f'<span class="k-id">{r["alertId"]}</span>') + data("alertScenario", r["alertScenario"], "at-wrap") + data("alertTime", when(r["alertTime"]) + " UTC")
    body += src(A["alertsFile"], ", the monitoring system's alerts." if r["alertId"] else ": no alert row for this account.")
    body = section("Attributes", body)
    conn = arow(f'<span class="k-num">{r["degree"]}</span> neighbor' + ("" if r["degree"] == 1 else "s"))
    conn += data("Links in (count)", str(r["in"])) + data("Links out (count)", str(r["out"]))
    m = MONEY[r["id"]]
    if in_full: conn += data("full graph", in_full)
    conn += data("Money in", f'{usd(m["moneyIn"])} USD') + data("Money out", f'{usd(m["moneyOut"])} USD')
    conn += '<div class="at-src">Sum of amount over its transfers' + (", on the full graph." if in_full else ".") + '</div>'
    body += section("Connections", conn)
    body += section("Memberships", arow(members, ic("chevron-right", "k-i k-i-sm k-secondary")))
    body += style_row(r["alert"]) + extra
    body += section("Export", "", f'<span class="k-icon-btn">{ic("plus")}</span>', " data-empty")
    return typerow("circle-dot", r["id"], "Node", node_verbs(open_menu), PATH_TO), body

def legend(count, points=None, extra=""):
    line = ""
    if points is not None:
        line = f'<div class="k-notdrawn k-num">{n(3000 - points)} nodes drawn as density. <a>Narrow the graph...</a></div>'
    return f'<div class="k-lg-title">Alerts</div><div class="k-lg-row">{DIA}alert is true<span class="k-value k-num">{n(count)}</span></div>{extra}{line}'

def note(x, y, text, w=None):
    ws = f"max-width:{w}px;" if w else ""
    return f'<span class="k-annot-note a-note" style="left:{x}px;top:{y}px;{ws}">{text}</span>'

def sel_at(p, label=None):
    s = f'<span class="at-sel" style="left:{p["x"]}%;top:{p["y"]}%"></span>'
    if label: s += f'<span class="at-lbl" style="left:{p["x"]}%;top:{p["y"]}%">{label}</span>'
    return s

def pt_at(p):
    return f'<span class="at-pt" style="left:{p["x"]}%;top:{p["y"]}%"></span>'

def toast(text, action="Undo"):
    return f'<div style="margin-bottom:8px"><div class="k-toast">{text}<span class="k-toast-action">{action}</span></div></div>'

def state(sid, app_html, notes, zoom=False):
    z = " st-z" if zoom else ""
    return f'<section class="st{z}" id="{sid}"><header class="st-label"><h2></h2><p></p></header><div class="st-frame">{app_html}{"".join(notes)}</div></section>'

def app(rail_html, panel_html, main_html, right_html, extra=""):
    return f'<div class="k-app">{rail_html}{panel_html}<main class="k-main">{main_html}</main>{right_html}</div>{extra}'

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
  /* Each state is one app frame, 1440 x 900 (or 1536 x 740: the reviewers' zoomed laptops).
     Opened with #<state id>, the page shows only that state, for shots and storyboard links. */
  body:has(.st:target) .st:not(:target), body:has(.st:target) .page-head, body:has(.st:target) .st-label {{ display: none; }}
  .page-head {{ max-width: 1440px; padding: 24px 24px 8px; font-size: 13px; line-height: 20px; }}
  .page-head h1 {{ font-size: 24px; line-height: 32px; font-weight: 600; margin: 0 0 4px; }}
  .page-head p {{ max-width: 90ch; margin: 0 0 8px; color: var(--cm-text-secondary); }}
  .page-head label {{ display: inline-flex; gap: 8px; align-items: center; font-weight: 550; }}
  .page-head nav {{ display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 8px; }}
  .page-head nav a {{ color: var(--cm-text-brand); text-decoration: none; }}
  .page-head h2 {{ font-size: 13px; margin: 12px 0 0; }}
  .st-label {{ padding: 32px 24px 8px; font-size: 13px; line-height: 20px; max-width: 1440px; }}
  .st-label h2 {{ font-size: 15px; margin: 0 0 2px; }}
  .st-label p {{ margin: 0; color: var(--cm-text-secondary); max-width: 110ch; }}
  .st-frame {{ position: relative; width: 1440px; height: 900px; overflow: hidden; box-shadow: 0 0 0 1px var(--cm-border); }}
  .st-frame .k-app {{ width: 100%; height: 100%; }}
  .st-z .st-frame {{ width: 1536px; height: 740px; }}
  .st-frame .k-backdrop {{ position: absolute; }}
  .a-note {{ display: none; }}
  body:has(#annot:checked) .a-note {{ display: block; }}
  .at-typerow {{ display: block; height: auto; padding: 8px 8px 6px 16px; }}
  .at-l1, .at-l2 {{ display: flex; align-items: center; gap: 8px; min-height: 24px; }}
  .at-l2 {{ padding-inline-start: 24px; gap: 2px; }}
  .at-l3 {{ padding: 4px 0 2px 24px; }}
  .at-paths {{ gap: 6px; }}
  .at-split {{ display: inline-flex; align-items: center; border-radius: 5px; box-shadow: inset 0 0 0 1px var(--cm-border-strong); height: 24px; }}
  .at-nbmain {{ display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px; white-space: nowrap; }}
  .at-split .at-caret {{ width: 24px; padding: 0; border-inline-start: 1px solid var(--cm-border-strong); }}
  .at-split[data-open] {{ background: var(--cm-bg-selected); color: var(--cm-text-brand); }}
  .at-caret {{ display: grid; place-items: center; width: 24px; padding-inline-end: 10px; height: 24px; color: var(--cm-icon-secondary); }}
  .k-header1 > :not(.k-grow) {{ flex-shrink: 0; }}
  .at-chips {{ display: flex; gap: 4px; align-items: center; min-width: 0; margin-top: 2px; }}
  .at-file[aria-expanded="true"] {{ background: var(--cm-bg-selected); color: var(--cm-text-brand); }}
  .at-dia {{ display: inline-block; width: 8px; height: 8px; margin: 0 2px; flex: none; background: {verm}; transform: rotate(45deg); }}
  .at-sel {{ position: absolute; width: 16px; height: 16px; border-radius: 50%; transform: translate(-50%, -50%);
            box-shadow: 0 0 0 2px var(--k-mark-in), 0 0 0 4px var(--k-mark-out); }}
  .at-pt {{ position: absolute; width: 7px; height: 7px; border-radius: 50%; transform: translate(-50%, -50%); background: #808080; box-shadow: 0 0 0 1px var(--k-canvas); }}
  .at-lbl {{ position: absolute; transform: translate(14px, -50%); font-size: 12px; color: var(--k-canvas-ink); text-shadow: 0 0 3px var(--k-canvas), 0 0 3px var(--k-canvas), 0 0 2px var(--k-canvas); white-space: nowrap; }}
  .k-data .k-value.at-wrap {{ white-space: normal; text-align: end; flex: 0 1 68%; }}
  .k-data:has(.at-wrap) .k-name {{ flex: 0 0 auto; }}
  .at-chips .k-chip {{ white-space: nowrap; flex: none; }}
  .k-title-line .k-project {{ white-space: nowrap; flex: none; }}
  .k-title-line .at-file {{ margin-top: 0; max-width: 104px; min-width: 0; }}
  .k-modal .k-data .k-value.at-wrap {{ flex: 1 1 auto; }}
  .at-hit .k-id {{ white-space: nowrap; }}
  .at-note-body {{ margin: 0 8px 8px 16px; padding: 8px; border-radius: 5px; background: var(--cm-bg-secondary); line-height: 16px; }}
  .at-foot {{ display: flex; gap: 8px; justify-content: flex-end; padding: 8px 12px 0 16px; border-top: 1px solid var(--cm-border); margin-top: 8px; }}
  .at-menu {{ right: 8px; min-width: 304px; max-width: 304px; }}
  .at-menu .k-menu-item[data-described] .k-menu-desc {{ white-space: normal; }}
  .at-menu .at-count {{ color: var(--k-menu-ink2); }}
  .at-hit {{ height: auto; min-height: 32px; align-items: flex-start; padding-top: 6px; padding-bottom: 6px; }}
  .at-hit .k-secondary {{ white-space: normal; }}
  .at-gray {{ filter: grayscale(1); }}
  .at-stylerow {{ gap: 8px; }}
  .at-src {{ padding: 0 8px 6px 16px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }}
  .at-sum {{ padding: 6px 16px; border-top: 1px solid var(--cm-border); display: flex; gap: 16px; flex-wrap: wrap; }}
  .at-sum b {{ font-weight: 550; }}
  .at-suggest {{ height: auto; min-height: 32px; align-items: flex-start; padding-top: 6px; padding-bottom: 6px; gap: 8px; }}
  .at-suggest .k-secondary {{ white-space: normal; }}
  .at-kinds {{ display: inline-flex; gap: 2px; align-items: center; margin-top: 4px; flex: none; }}
  .at-kinds i {{ display: block; width: 7px; height: 7px; background: var(--cm-icon-secondary); }}
  .at-kinds i:first-child {{ border-radius: 50%; }}
  .at-kinds i:last-child {{ transform: rotate(45deg) scale(0.85); }}
  .at-order {{ white-space: nowrap; }}
  .at-cell {{ display: inline-block; max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }}
</style>
</head>
<body>
""".replace("{verm}", VERM)

def page(fname, title, lede, states, groups):
    html = HEAD.format(title=title)
    nav = ""
    for gname, ids in groups:
        nav += f"<h2>{gname}</h2><nav>" + "".join(f'<a href="#{s[0]}">{s[1]}</a>' for s in states if s[0] in ids) + "</nav>"
    html += (f'<div class="page-head"><h1>{title}</h1><p>{lede}</p>'
             '<label><input type="checkbox" id="annot"> Show annotations: the framework section behind each element and the compact-mantine component it is built with</label>'
             f'{nav}</div>\n')
    html += "\n".join(s[3].replace('<header class="st-label"><h2></h2><p></p></header>', f'<header class="st-label"><h2>{s[1]}</h2><p>{s[2]}</p></header>', 1) for s in states)
    html += "\n</body>\n</html>\n"
    html.encode("ascii")
    with open(os.path.join(OUT, fname), "w") as f:
        f.write(html)
    # The current frame (rail, header, Styles and Results in the inspector): kit/shell.mjs
    import subprocess
    subprocess.run(["node", os.path.join(OUT, "..", "kit", "shell.mjs"), os.path.join(OUT, fname)], check=True)

exec(open(os.path.join(HERE, "states.py")).read())
