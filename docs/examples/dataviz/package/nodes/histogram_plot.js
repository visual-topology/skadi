/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.HistogramPlotNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.dataset = null;
        this.width = null;
        this.height = null;
        this.is_open = false;

        this.node_service.page_set_attributes("use_custom",{"value":""+this.use_custom_settings});
        this.node_service.page_add_event_handler("use_custom","change", (v) => {
            this.use_custom_settings = v;
            this.update_custom_controls();
            if (this.valid()) {
                this.draw();
            }
        },"(evt) => { return evt.target.checked; }");

        this.node_service.page_set_attributes("custom_band_width",{"value":""+this.custom_band_width});
        this.node_service.page_add_event_handler("custom_band_width", "change", (v) => {
            this.custom_band_width = Number.parseFloat(v);
            this.node_service.page_set_attributes("custom_band_width",{"value":""+this.custom_band_width});
            if (this.valid()) {
                this.draw();
            }
        });

        this.create_column_selector("x_axis", this.x_col);
        this.create_column_selector("hue", this.h_col);
        this.update_status();
    }

    get x_col() { return this.node_service.get_property("x_col",""); }
    set x_col(v) { this.node_service.set_property("x_col",v); }

    get h_col() { return this.node_service.get_property("h_col",""); }
    set h_col(v) { this.node_service.set_property("h_col",v); }

    get use_custom_settings() { return this.node_service.get_property("use_custom_settings",false); }
    set use_custom_settings(v) { this.node_service.set_property("use_custom_settings",v); }

    get custom_band_width() { return this.node_service.get_property("custom_band_width",1); }
    set custom_band_width(v) { this.node_service.set_property("custom_band_width",v); }

    set_options(sel_id, names) {
        let options = [["",""]];
        names.forEach(name => options.push([name,name]));
        this.node_service.page_set_attributes(sel_id,{"options": JSON.stringify(options)});
    }

    create_column_selector(control_name,initial_value) {
        this.set_options(control_name,[]);
        if (initial_value != null) {
           this.node_service.page_set_attributes(control_name,{"value":initial_value});
        }
        this.node_service.page_add_event_handler(control_name, "change", v => this.update_selected_column(control_name,v));
    }

    update_selected_column(control_name,column_name) {
        switch(control_name) {
            case "x_axis":
                this.x_col = column_name;
                this.node_service.page_set_attributes("x_axis",{"value": column_name});
                break;
            case "hue":
                this.h_col = column_name;
                this.node_service.page_set_attributes("hue",{"value": column_name});
                break;
        }
        this.update_status();
        this.node_service.request_execution();
    }

    valid() {
        if (this.dataset) {
            let column_names = this.dataset.columnNames();
            if (column_names.includes(this.x_col)) {
                if (this.h_col == "" || column_names.includes(this.h_col)) {
                    return true;
                }
            }
        }
        return false;
    }

    update_status() {
        if (this.dataset) {
            if (this.valid()) {
                this.node_service.set_status_info("OK");
            } else {
                this.node_service.set_status_info("Select Column(s)");
            }
        } else {
            this.node_service.set_status_warning("No Input Data");
        }
    }

    refresh() {
        let column_names = [];
        if (this.dataset) {
            column_names = this.dataset.columnNames();
        }
        this.set_options("x_axis", column_names);
        this.set_options("hue", column_names);
        this.node_service.page_set_attributes("x_axis", {"value": this.x_col});
        this.node_service.page_set_attributes("hue", {"value": this.h_col});

        this.update_status();

        if (this.valid()) {
            this.draw();
        } else {
            this.clear();
        }
    }

    draw() {
        let msg = {
                "dataset": this.dataset.toCSV(),
                "x_col": this.x_col,
                "h_col": this.h_col,
                "width": this.width,
                "height": this.height,
                "use_custom_settings": this.use_custom_settings,
                "custom_band_width": this.custom_band_width,
                "theme": this.node_service.get_configuration().get_theme()
            };
        this.node_service.page_send_message(msg);
    }

    clear() {
        this.node_service.page_send_message({});
    }

    page_open() {
        this.is_open = true;
        this.update_custom_controls();
        if (this.valid()) {
            this.draw();
        }
    }

    update_custom_controls() {
        this.node_service.page_set_attributes("custom_band_width",{"disabled":""+!this.use_custom_settings});
    }

    page_resize(width,height) {
        this.width = width;
        this.height = height;
        this.refresh();
    }

    page_close() {
        this.is_open = false;
        this.width = null;
        this.height = null;
    }

    async execute(inputs) {
        if (inputs["data_in"]) {
            this.dataset = inputs["data_in"][0];
        } else {
            this.dataset = null;
        }
        this.refresh();
        if (this.valid()) {
            return {};
        }
        return undefined;
    }
}

