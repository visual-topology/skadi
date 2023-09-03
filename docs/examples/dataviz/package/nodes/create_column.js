/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.CreateColumnNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.elt = null;
        this.column_name_control = null;
        this.column_expression_control = null;
        this.update_status();
    }

    get column_name() { return this.node_service.get_property("column_name",""); }
    set column_name(v) { this.node_service.set_property("column_name",v); }

    get column_expression() { return this.node_service.get_property("column_expression",""); }
    set column_expression(v) { this.node_service.set_property("column_expression",v); }

    update_status() {
        if (this.column_name && this.column_expression) {
            this.node_service.set_status_info(""+this.column_name);
        } else {
            this.node_service.set_status_warning("Configure Settings");
        }
    }

    open(elt) {
        this.elt = elt;
        this.column_name_control = elt.getElementById("column_name");
        this.column_name_control.setAttribute("value",this.column_name);

        this.column_expression_control = elt.getElementById("column_expression");
        this.column_expression_control.setAttribute("value",this.column_expression);

        this.column_name_control.addEventListener("change", e => {
            this.column_name = e.target.value;
            this.update_status();
            this.node_service.request_execution();
        });

        this.column_expression_control.addEventListener("change", e => {
            this.column_expression = e.target.value;
            this.update_status();
            this.node_service.request_execution();
        });
    }

    close() {
        this.elt = null;
        this.column_name_control = null;
        this.column_expression_control = null;
    }

    async execute(inputs) {
        if (inputs["data_in"] && this.column_name && this.column_expression) {
            let dataset = inputs["data_in"][0];
            let derive_cols = {};
            let aq = new DataVizExample.AqUtils(dataset);
            derive_cols[this.column_name] = aq.preprocess_expression(this.column_expression);
            return {
                "data_out": dataset.derive(derive_cols)
            };
        } else {
            return {};
        }

    }
}
