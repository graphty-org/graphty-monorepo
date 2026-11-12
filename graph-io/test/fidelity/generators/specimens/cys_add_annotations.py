"""Add annotations to a Cytoscape session's network, as Cytoscape saves them.

    python3 cys_add_annotations.py <in.cys> <out.cys> <entries.json>

entries.json is a list of annotation strings (`key=value|key=value`, the form Cytoscape 3.10.5 writes into the
network's __Annotations column). A `@name` in a value stands for the uuid of the session's annotation with that name.
The strings are appended to the one network table that holds an __Annotations column; every other entry of the
archive is copied unchanged. cytoscape-desktop.mjs uses it for the arrow annotations Cytoscape's commands cannot
make, and opens the result in Cytoscape, which reads them as it reads any session's.
"""

import csv
import io
import json
import re
import sys
import zipfile

TABLE = re.compile(r"/LOCAL_ATTRS-org\.cytoscape\.model\.CyNetwork-.*\+default\+network\.cytable$")


def add(text, entries):
    """The cytable text with the entries appended to its single row's __Annotations cell."""
    lines = text.split("\r\n")
    header = next(i for i, line in enumerate(lines) if line.startswith('"SUID",'))
    k = next(csv.reader([lines[header]])).index("__Annotations")
    row = max(i for i, line in enumerate(lines) if line != "")
    if row <= header + 3:
        sys.exit("the network table has no row")
    cells = next(csv.reader([lines[row]]))
    old = [s for s in cells[k].split("\r") if s]
    uuids = {}
    for s in old:
        fields = dict(p.split("=", 1) for p in s.split("|") if "=" in p)
        uuids[fields.get("name")] = fields.get("uuid")
    new = [re.sub(r"@([a-z0-9-]+)", lambda m: uuids[m.group(1)], e) for e in entries]
    cells[k] = "\r".join(old + new)
    out = io.StringIO()
    csv.writer(out, quoting=csv.QUOTE_ALL, lineterminator="").writerow(cells)
    lines[row] = out.getvalue()
    return "\r\n".join(lines)


def main():
    src, dst, entries_file = sys.argv[1:4]
    with open(entries_file, encoding="utf-8") as f:
        entries = json.load(f)
    patched = 0
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if TABLE.search(info.filename) and b"__Annotations" in data:
                data = add(data.decode("utf-8"), entries).encode("utf-8")
                patched += 1
            zout.writestr(info, data)
    if patched != 1:
        sys.exit(f"{patched} network tables hold __Annotations; expected 1")


if __name__ == "__main__":
    main()
