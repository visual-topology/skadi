/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.SampleRowsNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.update_status();
    }

    page_open(page_id, page_service) {
        page_service.set_attributes("sample_size",{"value":""+this.sample_size});
        page_service.add_event_handler("sample_size","change", v => {
            this.sample_size = Number.parseInt(v);
            this.update_status();
            this.node_service.request_execution();
        });
    }

    get sample_size() { return this.node_service.get_property("sample_size",100); }
    set sample_size(v) { this.node_service.set_property("sample_size",v); }

    update_status() {
        this.node_service.set_status_info(""+this.sample_size);
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

