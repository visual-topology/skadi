/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiApi {

    /**
     * Create a skadi graphical editor
     *
     * @param {string} element_id - the name of the document element into which skadi will be loaded
     * @param {Number} canvas_width - the width of the canvas area
     * @param {Number} canvas_height - the height of the canvas area
     * @param {Boolean} is_acyclic - true iff the graph must be acyclic
     * @param {Object} topology_store - optional, object implementing the TopologyStore interface
     * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using backend=>classname from the schema
     * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using backend=>classname from the schema
     */
    constructor(element_id, canvas_width, canvas_height, is_acyclic, topology_store,
                node_factory, configuration_factory) {
        topology_store = topology_store || new TopologyStore(this);
        this.design = new SkadiDesign(element_id, canvas_width, canvas_height, is_acyclic, topology_store,
            node_factory, configuration_factory);
        this.schema = null;
    }

    /**
     * Load schemas into skadi
     *
     * @param {Array} package_urls - an array of urls pointing to schema files
     */
    async load_schema(package_urls) {
        async function loadPackageFromUrl(url,schema) {
            return await fetch(url)
                .then(response => response.json())
                .then(schema_config => schema.loadPackage(url, schema_config));
        }

        this.schema = new SkadiSchema();
        let packages = [];
        for (let idx = 0; idx < package_urls.length; idx++) {
            packages.push(await loadPackageFromUrl(package_urls[idx],this.schema));
        }
        this.design.set_schema(this.schema);
        return packages;
    }

    get_schema() {
        return this.schema;
    }

    set_graph_executor(executor) {
        this.design.set_graph_executor(executor);
    }

    load(from_obj, supress_events) {
        this.design.clear(supress_events);
        this.design.deserialise(from_obj ,supress_events);
    }

    save() {
        return this.design.serialise();
    }

    update_metadata(node_id, metadata) {
        this.design.update_metadata(node_id,metadata);
    }

    set_status(node_id, status_msg, state) {
        this.design.update_node_status(node_id, state, status_msg);
    }

    update_execution_state(node_id, state) {
        this.design.update_execution_state(node_id, state);
    }

    execution_complete() {
        this.design.execution_complete();
    }

    add_node(node_id, node_type_name, xc, yc, metadata) {
        let node_type = this.schema.get_node_type(node_type_name);
        this.design.create_node(node_id, node_type, xc, yc, metadata, true);
    }

    move_node(id, xc, yc) {
        this.design.update_node_position(id, xc, yc, true);
    }

    add_link(link_id, link_type, from_node_id, from_port, to_node_id, to_port) {
        let fromNode = this.design.get_node(from_node_id);
        let fromPort = fromNode.get_port(from_port);
        let toNode = this.design.get_node(to_node_id);
        let toPort = toNode.get_port(to_port);
        this.design.create_link(fromPort, toPort, link_type, link_id);
    }

    remove(id) {
        this.design.remove(id,true);
    }

    clear() {
        this.design.clear(true);
    }

    add_node_event_handler(node_event_type, handler) {
        switch(node_event_type) {
            case "add":
                this.design.add_node_event_handler(node_event_type,function(node_id,node_type, position, metadata) {
                    handler(node_id,node_type, position, metadata);
                });
                break;
            case "remove":
                this.design.add_node_event_handler(node_event_type,function(node_id,node_type) {
                    handler(node_id,node_type);
                });
                break;
            case "update_position":
                this.design.add_node_event_handler(node_event_type,function(node_id,position) {
                    handler(node_id,position);
                });
                break;
            case "update_metadata":
                this.design.add_node_event_handler(node_event_type,function(node_id,metadata) {
                    handler(node_id,metadata);
                });
                break;
            default:
                console.warn("Unhandled event type: "+node_event_type);

        }
    }

    add_link_event_handler(link_event_type, handler) {
        this.design.add_link_event_handler(link_event_type,function(link_id,link_type,from_node_id,from_port,to_node_id,to_port) {
            handler(link_id,link_type,from_node_id,from_port,to_node_id,to_port,link_type);
        });
    }

    add_design_event_handler(design_event_type, handler) {
        this.design.add_design_event_handler(design_event_type, handler);
    }

    get_version() {
        return "${SKADI-VERSION}"; // placeholder substituted with actual version by the build.py script
    }

    get_node(node_id) {
        return this.design.get_node(node_id);
    }

}

SkadiApi.STATUS_STATE_INFO = "info";
SkadiApi.STATUS_STATE_WARNING = "warning";
SkadiApi.STATUS_STATE_ERROR = "error";
SkadiApi.STATUS_STATE_CLEAR = "";

SkadiApi.EXECUTION_STATE_PENDING = "pending";
SkadiApi.EXECUTION_STATE_EXECUTING = "executing";
SkadiApi.EXECUTION_STATE_EXECUTED = "executed";
SkadiApi.EXECUTION_STATE_FAILED = "failed";
SkadiApi.EXECUTION_STATE_CLEAR = "";

SkadiApi.DEFAULT_CANVAS_WIDTH = 4000;
SkadiApi.DEFAULT_CANVAS_HEIGHT = 2000;


