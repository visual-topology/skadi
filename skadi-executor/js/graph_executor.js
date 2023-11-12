/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.GraphExecutor = class {

    constructor() {

    }

    bind(skadi) {

        this.skadi = skadi;

        this.nodes = {}; // node-id => node-instance
        this.links = {}; // link-id => GraphLink
        this.out_links = {}; // node-id => output-port => [link]
        this.in_links = {};  // node-id => input-port => link

        this.dirty_nodes = {}; // node-id => True
        this.executing_nodes = {}; // node-id => True
        this.execution_limit = 4;
        this.node_outputs = {}; // node-id => output-port => value

        this.paused = true;

        // hook up to skadi events
        skadi.add_node_event_handler("add", (node_id, node_type_id) => {
            this.add_node(node_id, node_type_id);
        });

        skadi.add_node_event_handler("remove", async (node_id, node_type_id) => {
            this.remove_node(node_id);
        });

        skadi.add_link_event_handler("add", (link_id, link_type, from_node_id, from_port,
                                          to_node_id, to_port) => {
            this.add_link(link_id, from_node_id, from_port, to_node_id, to_port);
        });

        skadi.add_link_event_handler("remove", (link_id, link_type, from_node_id, from_port,
                                             to_node_id, to_port) => {
            this.remove_link(link_id);
        });

        skadi.add_design_event_handler("clear", async () => {
            this.clear();
        });

        skadi.add_design_event_handler("pause", (is_paused) => {
            if (is_paused) {
                this.pause();
            } else {
                this.resume();
            }
        });

        let network = skadi.get_network();
        let node_ids = network.get_node_list();
        node_ids.map(node_id => {
           this.add_node(node_id);
        });

        let link_ids = network.get_link_list();
        link_ids.map(link_id => {
            let link = network.get_link(link_id);
            this.add_link(link_id,link.get_from_node().get_id(),link.get_from_port_name(),link.get_to_node().get_id(), link.get_to_port_name());
        });

        this.skadi.set_graph_executor(this);
        this.paused = false;
        this.dispatch();
    }

    get executing_node_count() {
        return Object.keys(this.executing_nodes).length;
    }

    async sleep_for(milliseconds) {
        await new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    create_node_service(node) {
        let service = new skadi.ExecutableNodeService(node, this);
        let wrapper = new skadi.ExecutableNodeWrapper(node, service);
        service.set_wrapper(wrapper);
        return service;
    }

    clear() {
        this.nodes = {};
        this.links = {};

        this.out_links = {};
        this.in_links = {};

        this.executing_nodes = {};
        this.dirty_nodes = {};
        this.node_outputs = {};
    }

    valid_node(node_id) {
        return (node_id in this.nodes);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
        this.dispatch().then(r => {});
    }

    mark_dirty(node_id) {
        if (node_id in this.dirty_nodes) {
            return;
        }

        delete this.node_outputs[node_id];
        this.dirty_nodes[node_id] = true;
        this.reset_execution(node_id);

        /* mark all downstream nodes as dirty */
        for (let out_port in this.out_links[node_id]) {
            let outgoing_links = this.out_links[node_id][out_port];
            outgoing_links.map((link) => this.mark_dirty(link.to_node_id));
        }
    }

    reset_execution(node_id) {
        if (!(node_id in this.nodes)) {
            return;
        }
        let node = this.nodes[node_id];
        this.skadi.update_execution_state(node_id,skadi.Api.EXECUTION_STATE_PENDING);
        node.get_wrapper().reset_execution();
    }

    async dispatch() {
        if (this.paused) {
            return;
        }
        let launch_nodes = [];
        let launch_limit = (this.execution_limit - this.executing_node_count);
        if (launch_limit > 0) {
            for (let node_id in this.dirty_nodes) {
                if (this.can_execute(node_id)) {
                    launch_nodes.push(node_id);
                }
                if (launch_nodes.length >= launch_limit) {
                    break;
                }
            }
        }

        if (launch_nodes.length == 0 && this.executing_node_count == 0) {
            this.skadi.execution_complete();
        }

        for(let idx=0; idx<launch_nodes.length; idx++) {
            let node_id = launch_nodes[idx];
            this.launch_execution(node_id);
        }
    }

    can_execute(node_id) {
        for(let in_port in this.in_links[node_id]) {
            let in_links = this.in_links[node_id][in_port];
            for(let idx in in_links) {
                let in_link = in_links[idx];
                if (!in_link.has_value()) {
                    return false;
                }
            }
        }
        return true;
    }

    launch_execution(node_id) {
        if (!(node_id in this.nodes)) {
            return;
        }
        console.log("executing: "+node_id);
        delete this.dirty_nodes[node_id];
        this.executing_nodes[node_id] = true;
        let node = this.nodes[node_id];
        let inputs = {};
        for(let in_port in this.in_links[node_id]) {
            let in_links = this.in_links[node_id][in_port];
            inputs[in_port] = [];
            for(let idx in in_links) {
                let in_link = in_links[idx];
                inputs[in_port].push(in_link.get_value());
            }
        }

        this.skadi.update_execution_state(node_id,skadi.Api.EXECUTION_STATE_EXECUTING);

        node.get_wrapper().execute(inputs).then(
            (outputs) => this.executed(node_id, outputs),
            (reason) => this.executed(node_id, null, reason)).then(
                () => this.dispatch()
        );
    }

    executed(node_id,outputs,reject_reason) {
        if (!this.valid_node(node_id)) {
            return; // node has been deleted since it started executing
        }
        delete this.executing_nodes[node_id];
        if (reject_reason) {
            this.skadi.update_execution_state(node_id,skadi.Api.EXECUTION_STATE_FAILED);
            console.error("Execution of "+node_id+" failed with reason: "+ reject_reason);
            if (reject_reason.stack) {
                console.error(reject_reason.stack);
            }
        } else {
            this.skadi.update_execution_state(node_id, skadi.Api.EXECUTION_STATE_EXECUTED);
            this.node_outputs[node_id] = outputs;
        }
    }

    add_node(node_id) {
        this.nodes[node_id] = this.skadi.get_network().get_node(node_id);
        this.in_links[node_id] = {};
        this.out_links[node_id] = {};
        this.node_outputs[node_id] = {};
        this.mark_dirty(node_id);
        this.dispatch().then(r => {});
    }

    add_link(link_id,from_node_id,from_port,to_node_id,to_port) {
        let link = new skadi.GraphLink(this,from_node_id,from_port,to_node_id,to_port);
        this.links[link_id] = link;

        if (!(from_port in this.out_links[from_node_id])) {
            this.out_links[from_node_id][from_port] = [];
        }

        if (!(from_port in this.in_links[to_node_id])) {
            this.in_links[to_node_id][to_port] = [];
        }

        this.out_links[from_node_id][from_port].push(link);
        this.in_links[to_node_id][to_port].push(link);

        this.mark_dirty(to_node_id);

        this.dispatch().then(r => {});
    }

    remove_link(link_id) {
        let link = this.links[link_id];
        delete this.links[link_id];

        let arr_out = this.out_links[link.from_node_id][link.from_port];
        arr_out.splice(arr_out.indexOf(link),1);

        let arr_in = this.in_links[link.to_node_id][link.to_port];
        arr_in.splice(arr_in.indexOf(link),1);

        this.mark_dirty(link.to_node_id);

        this.dispatch().then(r => {});
    }

    remove_node(node_id) {
        delete this.executing_nodes[node_id];
        delete this.dirty_nodes[node_id];
        delete this.nodes[node_id];
        delete this.node_outputs[node_id];
    }

    request_execution(node_id) {
        this.mark_dirty(node_id);
        this.dispatch().then(r => {});
    }

}