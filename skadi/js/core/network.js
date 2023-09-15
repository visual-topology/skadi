/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiNetwork {

    constructor() {
        this.nodes = {};
        this.links = {};
        this.configurations = {};
        this.metadata = { "name":"", "description":"" };
    }

    clear() {
        for(let id in this.links) {
            this.links[id].remove();
        }
        this.links = {};

        for(let id in this.nodes) {
            this.nodes[id].remove();
        }
        this.nodes = {};
    }

    get_metadata() {
        return this.metadata;
    }

    get_downstream_nodes(from_node_id) {
        let nodes = [];
        let start_nodes = [from_node_id];
        do {
            let next_gen = [];
            for(let id in this.links) {
                let link = this.links[id];
                let from_node_id = link.get_from_node().get_id();
                let to_node_id = link.get_to_node().get_id();
                if (start_nodes.includes(from_node_id)) {
                    if (!nodes.includes(to_node_id)) {
                        nodes.push(to_node_id);
                        next_gen.push(to_node_id);
                    }
                }
            }
            start_nodes = next_gen;
        } while(start_nodes.length > 0);
        return nodes;
    }

    get_upstream_nodes(from_node_id) {
        let nodes = [];
        let start_nodes = [from_node_id];
        do {
            let next_gen = [];
            for(let id in this.links) {
                let link = this.links[id];
                let from_node_id = link.get_from_node().get_id();
                let to_node_id = link.get_to_node().get_id();
                if (start_nodes.includes(to_node_id)) {
                    if (!nodes.includes(from_node_id)) {
                        nodes.push(from_node_id);
                        next_gen.push(from_node_id);
                    }
                }
            }
            start_nodes = next_gen;
        } while(start_nodes.length > 0);
        return nodes;
    }

    set_metadata(metadata) {
        this.metadata = metadata;
    }

    /* configurations */

    add_configuration(configuration) {
        this.configurations[configuration.get_id()] = configuration;
    }

    get_configuration(id) {
        return this.configurations[id];
    }

    get_configuration_list() {
        let list = [];
        for(let id in this.configurations) {
            list.push(id);
        }
        return list;
    }

    /* nodes */

    add_node(node) {
        this.nodes[node.get_id()] = node;
    }

    get_node(id) {
        return this.nodes[id];
    }

    get_node_list() {
        let list = [];
        for(let id in this.nodes) {
            list.push(id);
        }
        return list;
    }

    remove_node(id) {
        // links to/from this node should have already been removed in Design.remove
        let node = this.nodes[id];
        delete this.nodes[id];
        node.remove();
    }

    /* links */

    get_link(id) {
        return this.links[id];
    }

    add_link(link) {
        this.links[link.get_id()] = link;
    }

    remove_link(id) {
        let link = this.links[id];
        delete this.links[id];
        link.remove();
    }

    get_link_list() {
        let linklist = [];
        for(let link_id in this.links) {
            linklist.push(link_id);
        }
        return linklist;
    }

    extract_address(s) {
        let obj = {};
        let split = s.split(":");
        obj["node"] = split[0];
        obj["port"] = split[1];
        return obj;
    }

    contains_id(id) {
        return (id in this.nodes || id in this.links);
    }

    remove(id) {
        if (id in this.nodes) {
            this.remove_node(id);
        }
        if (id in this.links) {
            this.remove_link(id);
        }
    }
  }
