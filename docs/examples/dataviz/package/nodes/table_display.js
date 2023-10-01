/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.TableDisplayNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.dataset = null;
        this.is_open = false;
        this.refresh();
    }

    refresh() {
        if (this.dataset) {
            this.node_service.set_status_info(""+this.dataset.numRows()+" Rows");
            if (this.is_open) {
                this.node_service.page_send_message({"html":this.dataset.toHTML({"limit":1e6})});
            }
        } else {
            if (this.is_open) {
                this.node_service.page_send_message({"html":""});
            }
            this.node_service.set_status_warning("Waiting for input data");
        }
    }

    page_open() {
        this.is_open = true;
        this.refresh();
    }

    page_close() {
        this.is_open = false;
    }

    reset_execution() {
        this.dataset = null;
        this.refresh();
    }

    async execute(inputs) {
        if (inputs["data_in"]) {
            this.dataset = inputs["data_in"][0];
        } else {
            this.dataset = null;
        }
        this.refresh();
        if (this.dataset) {
            return {};
        }
        return undefined;
    }

}

