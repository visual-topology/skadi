/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.SelectRowsNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.elt = null;
        this.dataset = null;

        this.input_column_names = [];
        this.input_column_values = [];
        this.column_name_control = null;
        this.column_value_control = null;
        this.column_value_min_control = null;
        this.column_value_max_control = null;
        this.reset_button = null;
        this.column_isnumeric = undefined;
        this.column_iscategorical = undefined;
        this.is_reset_execution = false;
        this.update_status();
    }

    get column_name() { return this.node_service.get_property("column_name",""); }
    set column_name(v) { this.node_service.set_property("column_name",v); }

    get column_names() { return this.node_service.get_property("column_names",[]); }
    set column_names(v) { this.node_service.set_property("column_names",v); }

    get min_value() { return this.node_service.get_property("min_value",null); }
    set min_value(v) { this.node_service.set_property("min_value",v); }

    get max_value() { return this.node_service.get_property("max_value",null); }
    set max_value(v) { this.node_service.set_property("max_value",v); }

    update_status() {
        if (this.is_reset_execution) {
            this.node_service.set_status_info("Reloading...");
        } else {
            if (this.valid()) {
                this.node_service.set_status_info("" + this.column_name);
            } else {
                this.node_service.set_status_error("invalid");
            }
        }
    }

    input_changed() {
        this.input_column_names = [];
        this.input_column_values = [];
        if (this.dataset) {
            this.input_column_names = this.dataset.columnNames();
            this.collect_input_column_values();
        }
        this.refresh_controls();
    }

    column_changed() {
        this.collect_input_column_values();
    }

    collect_input_column_values() {
        this.input_column_values = [];
        if (this.dataset) {
            if (this.input_column_names.includes(this.column_name)) {
                let aqu = new DataVizExample.AqUtils(this.dataset);
                let analysis = aqu.analyse(this.column_name);
                if (analysis.fraction_numeric > 0.5) {
                    this.column_isnumeric = true;
                    this.column_iscategorical = false;
                    // clip min/max to the new column min/max
                    if (this.min_value == null) {
                        this.min_value = analysis.range.min;
                    }
                    if (this.max_value == null) {
                        this.max_value = analysis.range.max;
                    }
                } else {
                    this.column_isnumeric = false;
                    this.column_iscategorical = true;
                    for (const value in analysis["value_counts"]) {
                        this.input_column_values.push("" + value);
                    }
                }
            }
        }
    }

    refresh_controls() {
        if (!this.elt) {
            return;
        }
        let value_selector = this.elt.getElementById("value_selector");
        let range_selector = this.elt.getElementById("range_selector");
        if (this.column_isnumeric) {
            value_selector.setAttribute("style","display:none;");
            range_selector.setAttribute("style","display:flex;");
            this.column_value_min_control.setAttribute("value",""+this.min_value);
            this.column_value_max_control.setAttribute("value",""+this.max_value);
        } else if (this.column_iscategorical) {
            value_selector.setAttribute("style","display:flex;");
            range_selector.setAttribute("style","display:none;");
            this.set_options(this.column_value_control, this.input_column_values);
        } else {
            value_selector.setAttribute("style","display:none;");
            range_selector.setAttribute("style","display:none;");
        }
        this.set_options(this.column_name_control, this.input_column_names);
    }

    set_options(sel, names) {
        let options = [["",""]];
        names.forEach(name => options.push([name,name]));
        const s = JSON.stringify(options);
        sel.setAttribute("options", s);
    }

    valid() {
        if (!this.input_column_names.includes(this.column_name)) {
            return false;
        }
        if (this.column_isnumeric) {
            return true;
        } else if (this.column_iscategorical) {
            for (const idx in this.column_values) {
                const value = this.column_values[idx];
                if (!this.input_column_values.includes(value)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    open(elt) {
        this.elt = elt;
        this.column_name_control = this.elt.getElementById("column_name");
        this.column_name_control.setAttribute("value",""+this.column_name);
        this.column_value_control = this.elt.getElementById("column_values");
        this.column_value_min_control = this.elt.getElementById("min_value");
        this.column_value_max_control = this.elt.getElementById("max_value");
        this.reset_button = this.elt.getElementById("reset");

        this.column_name_control.addEventListener("change", e => {
            this.column_name = e.target.value;
            this.column_changed();
            this.refresh_controls();
            this.node_service.request_execution();
        });

        this.column_value_control.addEventListener("change", e => {
            this.column_values = [e.target.value];
            this.update_status();
            this.node_service.request_execution();
        });

        this.column_value_min_control.addEventListener("change", e => {
            this.min_value = Number.parseFloat(e.target.value);
            this.update_status();
            this.node_service.request_execution();
        });

        this.column_value_max_control.addEventListener("change", e => {
            this.max_value = Number.parseFloat(e.target.value);
            this.update_status();
            this.node_service.request_execution();
        });

        this.reset_button.addEventListener("click", e => {
            this.min_value = null;
            this.max_value = null;
            this.collect_input_column_values(); // this should load the min_value/max_value from data
            this.refresh_controls();
            this.update_status();
            this.node_service.request_execution();
        });

        this.refresh_controls();
    }

    close() {
        this.elt = null;
        this.column_name_control = null;
        this.column_value_control = null;
        this.column_value_min_control = null;
        this.column_value_max_control = null;
    }



    reset_execution() {
        this.dataset = null;
        this.is_reset_execution = true;
        this.input_changed();
    }

    async execute(inputs) {
        this.is_reset_execution = false;
        if (inputs["data_in"]) {
            this.dataset = inputs["data_in"][0];
            this.input_changed();
            if (this.valid()) {
                if (this.column_isnumeric) {
                    return {"data_out": this.dataset.filter(aq.escape(r => this.min_value <= r[this.column_name] && this.max_value >= r[this.column_name]))};
                } else {
                    return {"data_out": this.dataset.filter(aq.escape(r => this.column_values.includes(String(r[this.column_name]))))};
                }
            }
        }
        return undefined;
    }
}

