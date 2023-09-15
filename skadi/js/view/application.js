/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

skadi_application_statuses = {};
skadi_application_status_areas = {};

class SkadiApplication extends SkadiCore {

    constructor(element_id, node_factory, configuration_factory) {
        super(element_id, null, node_factory, configuration_factory);
    }

    open_display() {
        let configuration_list = this.network.get_configuration_list();
        configuration_list.map(package_id => {
            let e = document.createElement("p");
            e.appendChild(document.createTextNode("Package:"+package_id));
            this.div.node().appendChild(e);
        });
        let node_list = this.get_network().get_node_list();
        node_list.map(node_id => {
            let node = this.get_network().get_node(node_id);
            let url = node.get_type().get_html_url();
            let li = this.div.append("div").attr("class","exo-tree").attr("role","tree")
                    .append("ul").append("li").attr("role","treeitem");
            let input = li.append("input").attr("type","checkbox").attr("aria-hidden","true");
            let label = li.append("label").text(node.get_metadata().name);

            skadi_application_status_areas[node_id] = label.append("span");
            skadi_application_status_areas[node_id].attr("class","status_label");
            let div = li.append("div");
            let iframe = div.append("iframe").attr("class", "skadi_iframe")
                .attr("src", url).attr("width", "100%").attr("height","500px").attr("target","_new").node();
            iframe.addEventListener("load", (ev) => {
               node.get_wrapper().open(iframe.contentWindow,null,null);
            });
            this.div.append("hr");
            if (node_id in skadi_application_statuses) {
                let status = skadi_application_statuses[node_id];
                this.update_status_area(node_id, status.state, status.status_message);
            }
        });
    }

    update_node_status(id, state, status_message) {
        skadi_application_statuses[id] = { "state":state, "status_message":status_message };
        this.update_status_area(id, state, status_message);
    }

    update_status_area(id, state, status_message) {
        if (id in skadi_application_status_areas) {
            let area = skadi_application_status_areas[id];
            area.node().innerHTML = "";
            area.text(status_message);
            let status_icon = skadi_create_icon_for_status_state(state);
            if (status_icon) {
                area.node().appendChild(status_icon);
            }
        }
    }

}