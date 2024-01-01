/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.Core = class {

    constructor(l10n_utils, schema, element_id, topology_store, node_factory, configuration_factory) {
        this.l10n_utils = l10n_utils;
        this.topology_store = topology_store;
        this.node_factory = node_factory;
        this.configuration_factory = configuration_factory;

        this.autosave_id = undefined;

        this.schema = schema;

        this.graph_executor = null;
        this.node_event_handlers = {};
        this.link_event_handlers = {};
        this.design_event_handlers = {};

        this.network = new skadi.Network({});
        this.id = this.next_id("top");

        this.div = skadi.x3.select("#" + element_id);

        this.metadata = {
            "name": "New Topology",
            "description": "",
            "filename": this.topology_store ? this.topology_store.get_default_filename() : "",
            "authors": "",
            "version": "0.1"
        };

        this.language = "en";
    }

    get_id() {
        return this.id;
    }

    get_autosave_id() {
        return this.autosave_id;
    }

    set_autosave_id(autosave_id) {
        this.autosave_id = autosave_id;
    }

    get_language() {
        return this.language;
    }

    set_language(language) {
        this.language = language;
    }

    localise(text) {
        return this.l10n_utils.localise(text);
    }

    get_schema() {
        return this.schema;
    }

    get_l10n_utils() {
        return this.l10n_utils;
    }

    set_graph_executor(executor) {
        this.graph_executor = executor;
    }

    /* Access the topology store and node/configuration factories */

    get_topology_store() {
        return this.topology_store;
    }

    get_node_factory() {
        return this.node_factory;
    }

    get_configuration_factory() {
        return this.configuration_factory;
    }

    get_network() {
        return this.network;
    }

    create_node_service(node) {
        if (this.graph_executor) {
            return this.graph_executor.create_node_service(node);
        } else {
            let service = new skadi.NodeService(node);
            let wrapper = new skadi.Wrapper(node, service, node.get_type().get_package_type().get_l10n_utils());
            service.set_wrapper(wrapper);
            return service;
        }
    }

    /* event handling - add/remove event handlers */

    add_node_event_handler(node_event_type, callback) {
        this.add_event_handler(this.node_event_handlers, node_event_type, callback);
    }

    remove_node_event_handler(node_event_type, callback) {
        this.remove_event_handler(this.node_event_handlers, node_event_type, callback);
    }

    add_link_event_handler(link_event_type, callback) {
        this.add_event_handler(this.link_event_handlers, link_event_type, callback);
    }

    remove_link_event_handler(link_event_type, callback) {
        this.remove_event_handler(this.link_event_handlers, link_event_type, callback);
    }

    add_design_event_handler(design_event_type, callback) {
        this.add_event_handler(this.design_event_handlers, design_event_type, callback);
    }

    remove_design_event_handler(design_event_type, callback) {
        this.remove_event_handler(this.design_event_handlers, design_event_type, callback);
    }

    add_event_handler(listeners, event_type, callback) {
        if (!(event_type in listeners)) {
            listeners[event_type] = [];
        }
        listeners[event_type].push(callback);
    }

    remove_event_handler(listeners, event_type, callback) {
        if (!(event_type in listeners)) {
            return;
        }
        listeners[event_type] = listeners[event_type].filter(c => c != callback);
    }

    request_execution(node_id) {
        if (this.graph_executor) {
            this.graph_executor.request_execution(node_id);
        }
    }

    /* event firing */

    fire_node_event(node_event_type, node) {
        if (node_event_type in this.node_event_handlers) {
            let callbacks = this.node_event_handlers[node_event_type];
            for (let idx = 0; idx < callbacks.length; idx++) {
                if (node_event_type == "add") {
                    callbacks[idx](node.get_id(), node.get_type().get_id(), node.get_position(), node.get_metadata());
                } else if (node_event_type == "remove") {
                    callbacks[idx](node.get_id(), node.get_type().get_id());
                } else if (node_event_type == "update_position") {
                    callbacks[idx](node.get_id(), node.get_position());
                } else if (node_event_type == "update_metadata") {
                    callbacks[idx](node.get_id(), node.get_metadata());
                }
            }
        }
    }

    fire_link_event(link_event_type, link) {
        let link_id = link.get_id();
        let link_type = link.get_link_type().get_id();
        let from_node_id = link.get_from_node().get_id();
        let from_port_name = link.get_from_port_name();
        let to_node_id = link.get_to_node().get_id();
        let to_port_name = link.get_to_port_name();
        if (link_event_type in this.link_event_handlers) {
            let callbacks = this.link_event_handlers[link_event_type];
            for (let idx = 0; idx < callbacks.length; idx++) {
                callbacks[idx](link_id, link_type, from_node_id, from_port_name, to_node_id, to_port_name);
            }
        }
    }

    fire_design_event(design_event_type, aux_info) {
        if (design_event_type in this.design_event_handlers) {
            let callbacks = this.design_event_handlers[design_event_type];
            for (let idx = 0; idx < callbacks.length; idx++) {
                callbacks[idx](aux_info);
            }
        }
    }

    /* configuration related */

    get_configuration(package_id) {
        return this.network.get_configuration(package_id);
    }

    add_configuration(configuration) {
        this.network.add_configuration(configuration);
    }

    update_configuration_status(package_id, state, status_message) {
        // TODO
    }

    create_configurations() {
        // load up configurations for any packages that specify them
        for(let package_id in this.schema.package_types) {
            let package_type = this.schema.package_types[package_id];
            if (package_type.get_configuration_classname()) {
                let conf = new skadi.Configuration(this,package_type,{});
                conf.create_instance();
                this.add_configuration(conf);
            }
        }
    }

    /* node related */

    create_node(node_id, node_type, x, y, metadata, suppress_event) {
        x = Math.round(x / skadi.GRID_SNAP) * skadi.GRID_SNAP;
        y = Math.round(y / skadi.GRID_SNAP) * skadi.GRID_SNAP;
        let id = node_id || this.next_id("nl");
        let node = new skadi.CoreNode(this, node_type, id, x, y, true, metadata, {});
        this.add_node(node, suppress_event);
        node.create_instance();
        return id;
    }

    add_node(node, suppress_event) {
        this.network.add_node(node);
        if (!suppress_event) {
            this.fire_node_event("add", node);
        }
    }

    get_node(node_id) {
        return this.network.get_node(node_id);
    }

    update_execution_state(node_id, state) {
        let node = this.network.get_node(node_id);
        if (node) {
            node.update_execution_state(state);
            if (state === skadi.Api.EXECUTION_STATE_EXECUTING) {
                let upstream_node_ids = this.network.get_upstream_nodes(node_id);
                for (let idx in upstream_node_ids) {
                    this.network.get_node(upstream_node_ids[idx]).update_execution_state(skadi.Api.EXECUTION_STATE_EXECUTED);
                }
            }
        }
    }

    execution_complete() {
        let node_ids = this.network.get_node_list();
        for(let idx in node_ids) {
            let node = this.network.get_node(node_ids[idx]);
            if (node.execution_state !== skadi.Api.EXECUTION_STATE_FAILED && node.execution_state !== skadi.Api.EXECUTION_STATE_PENDING) {
                node.update_execution_state(skadi.Api.EXECUTION_STATE_CLEAR);
            }
        }
    }

    update_metadata(node_id, metadata, suppress_event) {
        let node = this.network.get_node(node_id);
        if (node) {
            node.update_metadata(metadata);
        }
        if (!suppress_event) {
            this.fire_node_event("update_metadata", node);
        }
    }

    update_design_metadata(metadata, suppress_event) {
        for(let key in metadata) {
            this.metadata[key] = metadata[key];
        }
        if (!suppress_event) {
            this.fire_design_event("update_metadata", this.metadata);
        }
    }

    get_design_metadata() {
        let copy = {};
        for(let key in this.metadata) {
            copy[key] = this.metadata[key];
        }
        return copy;
    }

    update_node_status(id, state, status_message) {
        let node = this.get_node(id);
        if (node) {
            node.update_status(status_message, state);
        }
    }

    update_node_execution_state(id, state) {
        this.update_execution_state(id, state);
    }

    /* link/port related */

    create_link(fromPort, toPort, link_type_id, link_id) {
        let id = link_id || this.next_id("ch");
        let link_type = this.schema.get_link_type(link_type_id);
        let link = new skadi.CoreLink(this, id, fromPort.get_node(), fromPort.get_port_name(), link_type, toPort.get_node(), toPort.get_port_name());
        this.add_link(link, link_id != undefined);
        return id;
    }

    add_link(link, suppress_event) {
        this.network.add_link(link);
        if (!suppress_event) {
            this.fire_link_event("add", link);
        }
    }

    get_link(id) {
        return this.network.get_link(id);
    }

    /* design metadata */

    get_metadata() {
        return this.metadata;
    }

    /* provide unique IDs */

    next_id(prefix) {
        function fix(n,l) {
            let s = n.toString(16);
            if (s.length > l) {
                return s.slice(s.length-l,s.length);
            } else {
                while (s.length < l) {
                    s = "0" + s;
                }
                return s;
            }
        }
        while (true) {
            let id = prefix + fix(new Date().getTime(),6) + "_" + fix(Math.floor(Math.random()*256*256*256),6);
            if (!this.network.contains_id(id)) {
                return id;
            }
        }
    }

    /* clear or remove from the network */

    clear(suppress_event) {
        this.network.clear();
        if (!suppress_event) {
            this.fire_design_event("clear", null);
        }
        this.autosave();
    }

    remove(id, suppress_event) {
        let node = this.network.get_node(id);
        if (node) {
            // cascade to any links connected to the node to remove
            let removed_links = [];
            for (let link_id in this.network.links) {
                let link = this.network.get_link(link_id);
                if (link.fromPort.node == node || link.toPort.node == node) {
                    removed_links.push(link_id);
                }
            }
            for (let idx = 0; idx < removed_links.length; idx++) {
                this.remove(removed_links[idx],suppress_event);
            }
            this.network.remove(id);
            if (!suppress_event) {
                this.fire_node_event("remove", node);
            }
        }
        let link = this.network.get_link(id);
        if (link) {
            this.network.remove(id);
            if (!suppress_event) {
                this.fire_link_event("remove", link);
            }
        }
        this.autosave();
    }


    /* load/save */

    serialise() {
        let snodes = {};
        let slinks = {};

        let node_ids = this.network.get_node_list();
        for (let idx in node_ids) {
            let node_id = node_ids[idx];
            snodes[node_id] = this.network.get_node(node_id).serialise();
        }

        let link_ids = this.network.get_link_list();
        for (let idx in link_ids) {
            let link_id = link_ids[idx];
            let link = this.network.get_link(link_id);
            slinks[link_id] = link.serialise();
        }
        return {"nodes": snodes, "links": slinks, "metadata": this.metadata };
    }

    deserialise(from_obj, suppress_events, autosave_id) {

        if (this.graph_executor) {
            this.graph_executor.pause();
        }
        if (autosave_id) {
            this.set_autosave_id(autosave_id);
        }
        for (let node_id in from_obj.nodes) {
            let node = skadi.CoreNode.deserialise(this, node_id, from_obj.nodes[node_id]);
            this.add_node(node, suppress_events);
        }
        for (let link_id in from_obj.links) {
            let link = skadi.CoreLink.deserialise(this, link_id, from_obj.links[link_id]);
            this.add_link(link, suppress_events);
        }
        let package_properties = from_obj.package_properties || {};
        for (let package_id in package_properties) {
            let configuration = skadi.CoreConfiguration.deserialise(this, package_id, package_properties[package_id]);
            this.add_configuration(configuration);
        }
        this.metadata = from_obj["metadata"];
        if (this.graph_executor) {
            this.graph_executor.resume();
        }
    }

    autosave() {
        let autosave_id = this.get_autosave_id();
        if (autosave_id) {
            let folder = new skadi.DirectoryLike("/skadi/storage/",false);
            let path = folder.add_file(autosave_id);
            let fl = new skadi.FileLike(path + "/topology.json", "w", false);
            fl.write(JSON.stringify(this.serialise()));
        }
    }
}


