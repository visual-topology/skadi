/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var DataVizExample = DataVizExample || {};

DataVizExample.SelectColumnsNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.elt = null;
        this.dataset = null;
        this.input_column_names = [];
        this.update_status();
    }

    get column_names() { return this.node_service.get_property("column_names",[]); }
    set column_names(v) { this.node_service.set_property("column_names",v); }

    update_status() {
        if (this.is_reset_execution) {
            this.node_service.set_status_info("Reloading...");
        } else {
            if (this.valid()) {
                this.node_service.set_status_info("" + this.column_names.length);
            } else {
                this.node_service.set_status_error("invalid");
            }
        }
    }

    input_changed() {
        this.input_column_names = [];
        if (this.dataset) {
            this.input_column_names = this.dataset.columnNames();
        }
        this.refresh_controls();
    }

    refresh_controls() {
        let options = [["",""]];
        this.input_column_names.forEach(name => options.push([name,name]));
        const s = JSON.stringify(options);
        this.node_service.page_set_attributes("column_names",{"options":s,"value":JSON.stringify(this.column_names)});
    }

    valid() {
        return (this.column_names.length > 0);
    }

    page_open() {
        this.node_service.page_set_attributes("column_names",{"value":JSON.stringify(this.column_names)});
        this.node_service.page_add_event_handler("column_names","change", v => {
            this.column_names = JSON.parse(v);
            this.update_status();
            this.node_service.request_execution();
        });
    }

    page_close() {
    }

    reset_execution() {
        this.input_changed();
    }

    async execute(inputs) {
        this.is_reset_execution = false;
        if (inputs["data_in"]) {
            this.dataset = inputs["data_in"][0];
            this.input_changed();
            if (this.valid()) {
                return {"data_out": this.dataset.select(...this.column_names)};
            }
        }
        return undefined;
    }
}

