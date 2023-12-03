/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.ScatterPlotNode = class extends DataVizExample.ChartNode {

    constructor(node_service) {
        super(node_service,["title_label","x_axis_label","y_axis_label"],["x_axis","y_axis","hue"]);
    }

    get x_axis() { return this.node_service.get_property("x_axis",""); }
    set x_axis(v) { this.node_service.set_property("x_axis",v); }

    get y_axis() { return this.node_service.get_property("y_axis",""); }
    set y_axis(v) { this.node_service.set_property("y_axis",v); }

    get hue() { return this.node_service.get_property("hue",""); }
    set hue(v) { this.node_service.set_property("hue",v); }

    valid() {
        let column_names = this.get_input_dataset().columnNames();
        if (column_names.includes(this.x_axis) && column_names.includes(this.y_axis)) {
            if (this.hue === "" || column_names.includes(this.hue)) {
                return true;
            }
        }
        return false;
    }

    refresh_controls() {
        let column_names = [];
        if (this.get_input_dataset()) {
            column_names = this.get_input_dataset().columnNames();
        }
        this.set_selector_options("x_axis", column_names);
        this.set_selector_options("y_axis", column_names);
        this.set_selector_options("hue", column_names);
    }

    draw() {
        super.upload();
        let spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "description": "A scatterplot.",
            "data": {"format": {"type": "csv"}},
            "mark": "point",
            "padding": 20,
            "autosize": {
              "type": "fit",
              "contains": "padding"
            },
            "encoding": {
                "x": {"field":this.x_axis, "type": "quantitative"},
                "y": {"field": this.y_axis, "type": "quantitative"},
                "tooltip": [
                    {"field":this.x_axis, "type": "quantitative"},
                    {"field": this.y_axis, "type": "quantitative"}
                ]
            }
        }
        if (this.title_label) {
            spec["title"] =  { "text": this.title_label };
        }
        if (this.x_axis_label) {
            spec.encoding.x.title = this.x_axis_label;
        }
         if (this.y_axis_label) {
            spec.encoding.y.title = this.y_axis_label;
        }
        if (this.hue) {
            spec["encoding"]["color"] = {"field": this.hue, "type": "nominal"};
        }
        let msg = {
            "theme": this.node_service.get_configuration().get_theme(),
            "spec": spec
        }
        this.node_service.page_send_message(msg);
    }
}

