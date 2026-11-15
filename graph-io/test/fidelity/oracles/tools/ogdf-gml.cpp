// OGDF's own GML reader, GML writer and SVG drawing, for the oracles of the GML specimen sheets written in OGDF's
// dialect (ogdf.mjs builds and runs this; it is never part of graph-io).
//
//   ogdf-gml rewrite <in.gml> <out.gml>
//       GraphIO::readGML, then GraphIO::writeGML: the sheet as OGDF itself writes it.
//   ogdf-gml draw <in.gml> <out.svg> <margin> <width> <height> <font family>
//       GraphIO::readGML, then GraphIO::drawSVG with OGDF's default SVG settings except the margin, the size of
//       the drawing and the font family (the repository's pinned font).
//
// A file holding a rootcluster is read and written as a cluster graph (ClusterGraphAttributes), any other as a
// plain graph (GraphAttributes), so a sheet without clusters gains no empty rootcluster.
#include <ogdf/basic/GraphAttributes.h>
#include <ogdf/basic/Logger.h>
#include <ogdf/cluster/ClusterGraph.h>
#include <ogdf/cluster/ClusterGraphAttributes.h>
#include <ogdf/fileformats/GraphIO.h>

#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

using namespace ogdf;

static int fail(const std::string& message) {
    std::cerr << "ogdf-gml: " << message << "\n";
    return 1;
}

int main(int argc, char** argv) {
    if (argc < 4) {
        return fail("usage: ogdf-gml rewrite <in.gml> <out.gml> | draw <in.gml> <out.svg> <margin> <w> <h> <font>");
    }
    // every message OGDF's reader logs goes to stderr, so a file it cannot read says why
    Logger::globalLogLevel(Logger::Level::Minor);
    Logger::setWorldStream(std::cerr);
    const std::string mode = argv[1];
    std::ifstream in(argv[2]);
    std::stringstream text;
    text << in.rdbuf();
    const bool clustered = text.str().find("rootcluster") != std::string::npos;
    std::istringstream source(text.str());
    std::ofstream out(argv[3]);

    GraphIO::SVGSettings settings;
    if (mode == "draw") {
        if (argc < 8) {
            return fail("draw needs <margin> <width> <height> <font family>");
        }
        settings.margin(std::stod(argv[4]));
        settings.width(argv[5]);
        settings.height(argv[6]);
        settings.fontFamily(argv[7]);
    } else if (mode != "rewrite") {
        return fail("unknown mode " + mode);
    }

    Graph G;
    if (clustered) {
        ClusterGraph C(G);
        ClusterGraphAttributes A(C, ClusterGraphAttributes::all);
        if (!GraphIO::readGML(A, C, G, source)) {
            return fail(std::string("cannot read ") + argv[2]);
        }
        return (mode == "draw" ? GraphIO::drawSVG(A, out, settings) : GraphIO::writeGML(A, out)) ? 0 : 1;
    }
    GraphAttributes A(G, GraphAttributes::all);
    if (!GraphIO::readGML(A, G, source)) {
        return fail(std::string("cannot read ") + argv[2]);
    }
    return (mode == "draw" ? GraphIO::drawSVG(A, out, settings) : GraphIO::writeGML(A, out)) ? 0 : 1;
}
