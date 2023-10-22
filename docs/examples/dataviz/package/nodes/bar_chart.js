/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.BarChartNode = class extends DataVizExample.ChartNode {

    constructor(node_service) {
        super(node_service,["title_label","x_axis_label","y_axis_label"],["x_axis","hue"]);
    }

    get x_axis() { return this.node_service.get_property("x_axis",""); }
    set x_axis(v) { this.node_service.set_property("x_axis",v); }

    get hue() { return this.node_service.get_property("hue",""); }
    set hue(v) { this.node_service.set_property("hue",v); }

    valid() {
        let column_names = this.get_input_dataset().columnNames();
        if (column_names.includes(this.x_axis)) {
            if (this.hue === "" || column_names.includes(this.hue)) {
                return true;
            }
        }
        return false;
    }

    refresh_controls() {
        let column_names = [];
        if (this.dataset) {
            column_names = this.dataset.columnNames();
        }
        this.set_selector_options("x_axis", column_names);
        this.set_selector_options("hue", column_names);
    }

    draw() {
        super.upload();
        let msg = {
            "x_col": this.x_axis,
            "h_col": this.hue,
            "width": super.width,
            "height": super.height,
            "theme": this.node_service.get_configuration().get_theme(),
            "title": this.title_label,
            "x_axis_label": this.x_axis_label,
            "y_axis_label": this.y_axis_label
        }
        this.node_service.page_send_message(msg);
    }
}

