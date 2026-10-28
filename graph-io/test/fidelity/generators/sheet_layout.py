"""The specimen sheet layout for Python generators: reads sheet-layout.json (its "about" says what each number
means) and places a sheet's cells. sheet-layout.mjs is the same for Node generators.

    from sheet_layout import LAYOUT, ANCHORS, cells, caption
    for c in cells(48): c["x"], c["y"], c["caption"], c["source"], c["target"]
"""
import json
import math
import os

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sheet-layout.json")) as _f:
    LAYOUT = json.load(_f)

#: The four corner anchors: [{"id", "x", "y", "size"}].
ANCHORS = [{"id": k, "x": v[0], "y": v[1], "size": LAYOUT["anchors"]["size"]}
           for k, v in LAYOUT["anchors"]["nodes"].items()]


def cells(count, columns=None):
    """The cells of a sheet of `count` specimens, row by row across the area."""
    if count > LAYOUT["maxSpecimens"]:
        raise ValueError(f"{count} specimens is more than a sheet holds ({LAYOUT['maxSpecimens']}); split it into pages")
    a = LAYOUT["area"]
    cols = min(columns or LAYOUT["columns"], max(1, count))
    rows = max(1, math.ceil(count / cols))
    w = (a["x1"] - a["x0"]) / cols
    h = (a["y1"] - a["y0"]) / rows
    s = LAYOUT["edgeHalfSpan"]
    out = []
    for i in range(count):
        x = a["x0"] + w * (i % cols + 0.5)
        y = a["y0"] + h * (i // cols + 0.5) + LAYOUT["specimenDy"]
        out.append({"index": i, "x": x, "y": y, "w": w, "h": h,
                    "caption": {"x": x, "y": y + LAYOUT["captionDy"]},
                    "source": {"x": x - s, "y": y}, "target": {"x": x + s, "y": y}})
    return out


def caption(prop, value):
    """A caption's text: "<property>=<value>"."""
    return f"{prop}={value}"


if __name__ == "__main__":
    c = cells(60)
    a = LAYOUT["area"]
    assert len(ANCHORS) == 4 and len(c) == 60
    assert all(a["x0"] <= k["x"] <= a["x1"] and a["y0"] <= k["y"] and k["caption"]["y"] <= a["y1"] for k in c)
    assert cells(3)[2]["x"] > cells(3)[0]["x"]
    print("sheet_layout.py: ok")
