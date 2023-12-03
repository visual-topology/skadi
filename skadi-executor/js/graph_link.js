/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.GraphLink = class {

    constructor(executor, from_node_id, from_port, to_node_id, to_port) {
        this.executor = executor;
        this.from_node_id = from_node_id;
        this.from_port = from_port;
        this.to_node_id = to_node_id;
        this.to_port = to_port;
        this.value = null;
    }

    has_value() {
        if (this.from_node_id in this.executor.node_outputs) {
            let outputs = this.executor.node_outputs[this.from_node_id];
            if (outputs && this.from_port in outputs) {
                return true;
            }
        }
        return false;
    }

    get_value() {
        if (this.from_node_id in this.executor.node_outputs) {
            let outputs = this.executor.node_outputs[this.from_node_id];
            if (outputs && this.from_port in outputs) {
                return outputs[this.from_port];
            }
        }
        return null;
    }
}
