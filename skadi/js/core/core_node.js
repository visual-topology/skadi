/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

class SkadiCoreNode {

    constructor(core, node_type, id, x, y, metadata, properties) {
        this.core = core;

        this.node_type = node_type;
        this.metadata = metadata;
        this.node_service = null;
        this.wrapper = null;
        this.properties = properties;

        this.id = id;

        // coordinates on canvas
        this.x = x;
        this.y = y;

        this.status_message = "";
        this.status_state = "";
        this.status_content = null;
        this.status_content_rect = null;

        this.execution_state = SkadiApi.EXECUTION_STATE_EXECUTED;

        this.input_ports = [];
        this.output_ports = [];
    }


    create_instance() {


        // unfortunately looks like eval is needed to construct ES6 class instances from the classname
        try {
            this.node_service = this.core.create_node_service(this);
            this.wrapper = this.node_service.wrapper;
            let node_factory = this.core.get_node_factory();
            if (node_factory) {
                let o = node_factory(this.node_service);
                this.wrapper.set_instance(o);
            } else {
                let classname = this.node_type.get_classname();
                let cls = eval(classname);
                let o = new cls(this.node_service);
                this.wrapper.set_instance(o);
            }
        } catch (e) {
            console.error(e);
            return false;
        }


        return true;
    }

    get_wrapper() {
        return this.wrapper;
    }

    get_label() {
        let label = this.metadata.name;
        if (!label) {
            label = "";
        }
        return label;
    }

    get_position() {
        return {
            "x": this.x,
            "y": this.y
        };
    }

    get_id() {
        return this.id;
    }


    update_metadata(new_metadata) {
        for (let key in new_metadata) {
            this.metadata[key] = new_metadata[key];
        }
    }

    get_metadata() {
        return this.metadata;
    }

    update_status(status_message, status_state) {
        this.status_message = status_message;
        this.status_state = status_state;
    }

    update_execution_state(new_execution_state) {
        this.execution_state = new_execution_state;
    }

    remove() {
    }

    serialise() {
        return {
            "x": this.x,
            "y": this.y,
            "node_type": this.node_type.get_id(),
            "metadata": this.metadata,
            "properties": this.properties
        };
    }

    get_type() {
        return this.node_type;
    }
}

SkadiCoreNode.deserialise = function (core, id, obj) {
    let node_type = core.get_schema().get_node_type(obj.node_type);
    let node = new SkadiCoreNode(core, node_type, id, obj.x, obj.y, obj.metadata, obj.properties);
    node.create_instance();
    return node;
}
