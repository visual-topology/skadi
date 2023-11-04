/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.SelectRowsNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.dataset = null;
        this.input_column_names = [];
        this.input_column_values = [];
        this.column_isnumeric = undefined;
        this.column_iscategorical = undefined;
        this.is_reset_execution = false;
        this.update_status();
    }

    get column_name() { return this.node_service.get_property("column_name",""); }
    set column_name(v) { this.node_service.set_property("column_name",v); }

    get column_value() { return this.node_service.get_property("column_value",[]); }
    set column_value(v) { this.node_service.set_property("column_value",v); }

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
        if (this.column_isnumeric) {
            this.node_service.page_set_attributes("value_selector",{"style":"display:none;"});
            this.node_service.page_set_attributes("range_selector",{"style":"display:flex;"});
            this.node_service.page_set_attributes("min_value",{"value":""+this.min_value});
            this.node_service.page_set_attributes("max_value",{"value":""+this.max_value});
        } else if (this.column_iscategorical) {
            this.node_service.page_set_attributes("value_selector",{"style":"display:flex;"});
            this.node_service.page_set_attributes("range_selector",{"style":"display:none;"});
            this.set_options("column_values", this.input_column_values, this.column_value);
        } else {
            this.node_service.page_set_attributes("value_selector",{"style":"display:none;"});
            this.node_service.page_set_attributes("range_selector",{"style":"display:none;"});
        }
        this.set_options("column_name", this.input_column_names, this.column_name);
    }

    set_options(sel, names, value) {
        let options = [["",""]];
        names.forEach(name => options.push([name,name]));
        const s = JSON.stringify(options);
        this.node_service.page_set_attributes(sel,{"options":s,"value":value});
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

    page_open() {
        this.node_service.page_set_attributes("column_name",{"value":""+this.column_name});

        this.node_service.page_add_event_handler("column_name","change", v => {
            this.column_name = v;
            this.column_changed();
            this.refresh_controls();
            this.node_service.request_execution();
        });

        this.node_service.page_add_event_handler("column_values","change", v => {
            this.column_value = v;
            this.update_status();
            this.node_service.request_execution();
        });

        this.node_service.page_add_event_handler("min_value","change", v => {
            this.min_value = Number.parseFloat(v);
            this.update_status();
            this.node_service.request_execution();
        });

        this.node_service.page_add_event_handler("max_value","change", v => {
            this.max_value = Number.parseFloat(v);
            this.update_status();
            this.node_service.request_execution();
        });

        this.node_service.page_add_event_handler("reset","click", v => {
            this.min_value = null;
            this.max_value = null;
            this.collect_input_column_values(); // this should load the min_value/max_value from data
            this.refresh_controls();
            this.update_status();
            this.node_service.request_execution();
        });

        this.refresh_controls();
    }

    page_close() {

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
                    return {"data_out": this.dataset.filter(aq.escape(r => r[this.column_name] === this.column_value))};
                }
            }
        }
        return undefined;
    }
}

