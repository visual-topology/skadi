/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var DataVizExample = DataVizExample || {};

DataVizExample.ChartNode = class {

    constructor(node_service, label_control_names, column_selector_control_names) {
        this.node_service = node_service;
        this.label_control_names = label_control_names;
        this.column_selector_control_names = column_selector_control_names;
        this.dataset = null;
        this.data_uploaded = false;
        this.is_open = false;
        this.configuration_update_callback = () => {
            this.redraw();
        }
        this.node_service.get_configuration().register_update_callback(this.configuration_update_callback);
        this.update_status();
    }

    get title_label() { return this.node_service.get_property("title_label",""); }
    set title_label(v) { this.node_service.set_property("title_label",v); }

    get x_axis_label() { return this.node_service.get_property("x_axis_label",""); }
    set x_axis_label(v) { this.node_service.set_property("x_axis_label",v); }

    get y_axis_label() { return this.node_service.get_property("y_axis_label",""); }
    set y_axis_label(v) { this.node_service.set_property("y_axis_label",v); }

    get_input_dataset() {
        return this.dataset;
    }

    bind_controls() {
        this.label_control_names.forEach(control_name => {
            this.bind_label_control(control_name, this.node_service.get_property(control_name,""));
        });
        this.column_selector_control_names.forEach(control_name => {
            this.bind_column_selector_control(control_name, this.node_service.get_property(control_name,null));
        });
    }

    update_input_data() {
        this.data_uploaded = false;
        this.refresh_controls();
        this.update_status();
        this.redraw();
    }

    update_status() {
        if (this.dataset) {
            if (this.valid()) {
                this.node_service.set_status_info("OK");
            } else {
                this.node_service.set_status_warning("Select Column(s)");
            }
        } else {
            this.node_service.set_status_warning("No Input Data");
        }
    }

    bind_column_selector_control(control_name, initial_value) {
        this.set_selector_options(pcontrol_name, []);
        if (initial_value != null) {
            this.page_service.set_attributes(control_name, {"value": initial_value});
        }
        this.page_service.add_event_handler(control_name, "change", v => {
            this.node_service.set_property(control_name, v);
            this.update_status();
            this.redraw();
        });
    }

    set_selector_options(sel_id, names) {
        let options = [["",""]];
        names.forEach(name => options.push([name,name]));
        this.page_service.set_attributes(sel_id,{"options": JSON.stringify(options)});
    }

    bind_label_control(control_name, initial_value) {
        this.page_service.set_attributes(control_name,{"value":initial_value});
        this.page_service.add_event_handler(control_name, "change", new_value => {
            this.node_service.set_property(control_name,new_value);
            this.redraw();
        });
    }

    page_open(page_id, page_service) {
        this.page_service = page_service;
        this.bind_controls();
        this.refresh_controls();
        this.redraw();
    }

    page_close(page_id, page_service) {
        this.page_service = null;
        this.data_uploaded = false;
    }

    page_is_open() {
        return (this.page_service !== null);
    }

    upload() {
        if (this.page_is_open() && !this.data_uploaded) {
            this.page_service.send_message({"dataset": this.dataset.toCSV()});
            this.data_uploaded = true;
        }
    }

    redraw() {
        if (this.page_is_open()) {
            if (this.dataset && this.valid()) {
                this.draw();
            } else {
                this.clear();
            }
        }
    }

    clear() {
        this.page_service.send_message({});
    }

    reset_execution() {
        this.dataset = null;
        this.data_uploaded = false;
        this.redraw();
    }

    async execute(inputs) {
        if (inputs["data_in"]) {
            this.dataset = inputs["data_in"][0];
        } else {
            this.dataset = null;
        }
        this.update_input_data();
    }

    remove() {
        this.node_service.get_configuration().unregister_update_callback(this.configuration_update_callback);
    }

    valid() {
        /* implement in subclass - return true iff chart can be drawn */
    }

    refresh_controls() {
        /* update controls from dataset and node properties */
    }

    draw() {
        /* implement in subclass - draw contents */
    }

}