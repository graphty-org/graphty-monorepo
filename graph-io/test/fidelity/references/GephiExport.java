// Loads a GEXF with the Gephi Toolkit (headless) and writes what Gephi's preview draws: an SVG export
// and a JSON dump of the preview items (the values Gephi's renderers read). gephi.mjs turns both into
// a scene. Run in single-file source mode with the Toolkit jar on the class path:
//   java -Djava.awt.headless=true -cp gephi-toolkit-0.11.3-all.jar GephiExport.java <in.gexf> <outPrefix> [labels] [noscale]
// "noscale" keeps the file's own coordinates (the importer otherwise rescales the layout);
// "labels" shows node labels in the preview.
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
import org.gephi.project.api.ProjectController;
import org.gephi.project.api.Workspace;
import org.openide.util.Lookup;

public class GephiExport {
    static String q(Object v) {
        return "\"" + String.valueOf(v).replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    public static void main(String[] a) throws Exception {
        List<String> flags = Arrays.asList(a);
        ProjectController pc = Lookup.getDefault().lookup(ProjectController.class);
        pc.newProject();
        Workspace ws = pc.getCurrentWorkspace();
        ImportController ic = Lookup.getDefault().lookup(ImportController.class);
        Container c = ic.importFile(new File(a[0]));
        if (flags.contains("noscale")) c.getLoader().setAutoScale(false);
        ic.process(c, new DefaultProcessor(), ws);
        PreviewController prc = Lookup.getDefault().lookup(PreviewController.class);
        PreviewModel m = prc.getModel();
        m.getProperties().putValue(PreviewProperty.SHOW_NODE_LABELS, flags.contains("labels"));
        prc.refreshPreview();
        Lookup.getDefault().lookup(ExportController.class).exportFile(new File(a[1] + ".svg"));
        StringBuilder sb = new StringBuilder("{\n\"properties\": {");
        boolean first = true;
        for (PreviewProperty p : m.getProperties().getProperties()) {
            sb.append(first ? "\n  " : ",\n  ").append(q(p.getName())).append(": ").append(q(p.getValue()));
            first = false;
        }
        sb.append("\n},\n");
        for (String type : new String[] {Item.NODE, Item.EDGE, Item.NODE_LABEL}) {
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
                if (src instanceof Edge e) sb.append(", \"_src\": ").append(q(e.getSource().getId())).append(", \"_dst\": ").append(q(e.getTarget().getId()));
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
