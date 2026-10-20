// Loads a GEXF with the Gephi Toolkit (headless) and writes what Gephi's preview draws: an SVG export
// and a JSON dump of the preview items (the values Gephi's renderers read). gephi.mjs turns both into
// a scene. Run in single-file source mode with the Toolkit jar on the class path:
//   java -Djava.awt.headless=true -cp gephi-toolkit-0.11.3-all.jar GephiExport.java <in.gexf> <outPrefix> [labels] [noscale] [set:<property>=<value> ...]
//   java -Djava.awt.headless=true -cp gephi-toolkit-0.11.3-all.jar GephiExport.java --props
// "noscale" keeps the file's own coordinates (the importer otherwise rescales the layout);
// "labels" shows node labels in the preview; "set:edge.curved=false" sets one Preview property
// (after "labels"), its value parsed by the property's own type: true/false, a number, #rrggbb, a
// Font as Family,plain|bold|italic|bolditalic,size, an EdgeColor as source|target|mixed|original or
// #rrggbb, a DependantColor as parent|darker or #rrggbb, a DependantOriginalColor as
// parent|original or #rrggbb. "--props" prints every Preview property of a fresh model (name, type,
// category, default, display name, description) and the values of its enumerated types, as JSON.
import java.awt.Color;
import java.awt.Font;
import java.io.File;
import java.io.FileWriter;
import java.io.Writer;
import java.util.Arrays;
import java.util.List;
import org.gephi.graph.api.Edge;
import org.gephi.graph.api.Node;
import org.gephi.io.exporter.api.ExportController;
import org.gephi.io.importer.api.Container;
import org.gephi.io.importer.api.ImportController;
import org.gephi.io.processor.plugin.DefaultProcessor;
import org.gephi.preview.api.Item;
import org.gephi.preview.api.PreviewController;
import org.gephi.preview.api.PreviewModel;
import org.gephi.preview.api.PreviewProperty;
import org.gephi.preview.types.DependantColor;
import org.gephi.preview.types.DependantOriginalColor;
import org.gephi.preview.types.EdgeColor;
import org.gephi.project.api.ProjectController;
import org.gephi.project.api.Workspace;
import org.openide.util.Lookup;

public class GephiExport {
    static String q(Object v) {
        return "\"" + String.valueOf(v).replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    static String show(Object v) {
        if (v instanceof Color c) return String.format("#%02x%02x%02x", c.getRed(), c.getGreen(), c.getBlue());
        if (v instanceof EdgeColor e) return e.getMode() == EdgeColor.Mode.CUSTOM ? show(e.getCustomColor()) : e.getMode().name().toLowerCase();
        if (v instanceof DependantColor d) return d.getMode() == DependantColor.Mode.CUSTOM ? show(d.getCustomColor()) : d.getMode().name().toLowerCase();
        if (v instanceof DependantOriginalColor d) return d.getMode() == DependantOriginalColor.Mode.CUSTOM ? show(d.getCustomColor()) : d.getMode().name().toLowerCase();
        if (v instanceof Font f) return f.getFamily() + "," + (f.isBold() ? "bold" : "") + (f.isItalic() ? "italic" : "") + (f.isPlain() ? "plain" : "") + "," + f.getSize();
        return String.valueOf(v);
    }

    static Object parse(Class<?> type, String v) {
        if (type == Boolean.class) return Boolean.valueOf(v);
        if (type == Float.class) return Float.valueOf(v);
        if (type == Integer.class) return Integer.valueOf(v);
        if (type == Color.class) return Color.decode(v);
        if (type == EdgeColor.class) return v.startsWith("#") ? new EdgeColor(Color.decode(v)) : new EdgeColor(EdgeColor.Mode.valueOf(v.toUpperCase()));
        if (type == DependantColor.class) return v.startsWith("#") ? new DependantColor(Color.decode(v)) : new DependantColor(DependantColor.Mode.valueOf(v.toUpperCase()));
        if (type == DependantOriginalColor.class) return v.startsWith("#") ? new DependantOriginalColor(Color.decode(v)) : new DependantOriginalColor(DependantOriginalColor.Mode.valueOf(v.toUpperCase()));
        if (type == Font.class) {
            String[] f = v.split(",");
            int style = switch (f[1]) { case "bold" -> Font.BOLD; case "italic" -> Font.ITALIC; case "bolditalic" -> Font.BOLD | Font.ITALIC; default -> Font.PLAIN; };
            return new Font(f[0], style, Integer.parseInt(f[2]));
        }
        if (type == String.class) return v;
        throw new IllegalArgumentException("no parser for a " + type.getName());
    }

    public static void main(String[] a) throws Exception {
        List<String> flags = Arrays.asList(a);
        ProjectController pc = Lookup.getDefault().lookup(ProjectController.class);
        pc.newProject();
        Workspace ws = pc.getCurrentWorkspace();
        if (flags.contains("--props")) {
            PreviewModel pm = Lookup.getDefault().lookup(PreviewController.class).getModel(ws);
            StringBuilder sb = new StringBuilder("{\n\"properties\": [");
            boolean first = true;
            for (PreviewProperty p : pm.getProperties().getProperties()) {
                sb.append(first ? "\n  {" : ",\n  {").append("\"name\": ").append(q(p.getName()))
                    .append(", \"type\": ").append(q(p.getType().getSimpleName()))
                    .append(", \"category\": ").append(q(p.getCategory()))
                    .append(", \"default\": ").append(q(show(p.getValue())))
                    .append(", \"displayName\": ").append(q(p.getDisplayName()))
                    .append(", \"description\": ").append(q(p.getDescription())).append("}");
                first = false;
            }
            sb.append("\n],\n\"enums\": {\n  \"EdgeColor\": ").append(q(Arrays.toString(EdgeColor.Mode.values())))
                .append(",\n  \"DependantColor\": ").append(q(Arrays.toString(DependantColor.Mode.values())))
                .append(",\n  \"DependantOriginalColor\": ").append(q(Arrays.toString(DependantOriginalColor.Mode.values())))
                .append("\n}\n}\n");
            System.out.print(sb);
            return;
        }
        ImportController ic = Lookup.getDefault().lookup(ImportController.class);
        Container c = ic.importFile(new File(a[0]));
        if (flags.contains("noscale")) c.getLoader().setAutoScale(false);
        // into a new workspace, as Gephi's File > Open does: the processor then sets up the graph model the file
        // needs (timestamps instead of intervals, a dynamic weight column), which an existing workspace refuses
        ic.process(c, new DefaultProcessor(), null);
        ws = pc.getCurrentWorkspace();
        PreviewController prc = Lookup.getDefault().lookup(PreviewController.class);
        PreviewModel m = prc.getModel();
        m.getProperties().putValue(PreviewProperty.SHOW_NODE_LABELS, flags.contains("labels"));
        for (String f : flags) {
            if (!f.startsWith("set:")) continue;
            String name = f.substring(4, f.indexOf('='));
            PreviewProperty p = m.getProperties().getProperty(name);
            if (p == null) throw new IllegalArgumentException("Gephi has no Preview property " + name);
            m.getProperties().putValue(name, parse(p.getType(), f.substring(f.indexOf('=') + 1)));
        }
        prc.refreshPreview();
        Lookup.getDefault().lookup(ExportController.class).exportFile(new File(a[1] + ".svg"));
        StringBuilder sb = new StringBuilder("{\n\"properties\": {");
        boolean first = true;
        for (PreviewProperty p : m.getProperties().getProperties()) {
            sb.append(first ? "\n  " : ",\n  ").append(q(p.getName())).append(": ").append(q(show(p.getValue())));
            first = false;
        }
        sb.append("\n},\n");
        for (String type : new String[] {Item.NODE, Item.EDGE, Item.NODE_LABEL, Item.EDGE_LABEL}) {
            sb.append(q(type)).append(": [");
            first = true;
            for (Item it : m.getItems(type)) {
                sb.append(first ? "\n  {" : ",\n  {");
                boolean f2 = true;
                for (String k : it.getKeys()) {
                    sb.append(f2 ? "" : ", ").append(q(k)).append(": ").append(q(it.getData(k)));
                    f2 = false;
                }
                Object src = it.getSource();
                if (src instanceof Node n) sb.append(", \"_id\": ").append(q(n.getId()));
                if (src instanceof Edge e) sb.append(", \"_edge\": ").append(q(e.getId() == null ? "" : e.getId().toString())).append(", \"_src\": ").append(q(e.getSource().getId())).append(", \"_dst\": ").append(q(e.getTarget().getId()));
                sb.append("}");
                first = false;
            }
            sb.append("\n],\n");
        }
        sb.append("\"done\": true\n}\n");
        try (Writer w = new FileWriter(a[1] + ".items.json")) {
            w.write(sb.toString());
        }
        System.out.println("nodes=" + m.getItems(Item.NODE).length + " edges=" + m.getItems(Item.EDGE).length);
    }
}
