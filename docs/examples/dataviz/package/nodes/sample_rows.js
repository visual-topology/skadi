/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.SampleRowsNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.elt = null;
        this.sample_size_control = null;
        this.update_status();
    }

    get sample_size() { return this.node_service.get_property("sample_size",100); }
    set sample_size(v) { this.node_service.set_property("sample_size",v); }

    update_status() {
        this.node_service.set_status_info(""+this.sample_size);
    }

    open(elt) {
        this.elt = elt;
        this.sample_size_control = elt.getElementById("sample_size");
        this.sample_size_control.setAttribute("value",""+this.sample_size);

        this.sample_size_control.addEventListener("change", e => {
            this.sample_size = Number.parseInt(e.target.value);
            this.update_status();
            this.node_service.request_execution();
        });
    }

    close() {
        this.elt = null;
        this.sample_size_control = null;
    }

    async execute(inputs) {
        if (inputs["data_in"]) {
            let dataset = inputs["data_in"][0];
            return {"data_out":dataset.sample(this.sample_size)};
        } else {
            return {};
        }
    }
}

