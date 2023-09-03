/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let GRID_SNAP = 20;

class SkadiDesign {

    constructor(element_id, width, height, is_acyclic, topology_store, node_factory, configuration_factory) {
        this.width = width;
        this.height = height;
        this.is_acyclic = is_acyclic;
        this.topology_store = topology_store;
        this.node_factory = node_factory;
        this.configuration_factory = configuration_factory;
        this.id = "design";
        this.schema = null;
        this.windows = {};
        this.graph_executor = null;
        this.node_event_handlers = {};
        this.link_event_handlers = {};
        this.design_event_handlers = {};
        this.paused = false;

        this.network = new SkadiNetwork({});

        this.transform = [1, 0, 0, 1, 0, 0];

        let that = this;

        this.div = Skadi.x3.select("#" + element_id);

        this.svg = this.div.append("svg")
            .attr("width","100%")
            .attr("height", "100%");

        this.group = this.svg.append("g").attr("id", "viewport");
        this.group.append("rect").attr("class", "background").attr("width", width + "px")
            .attr("height", height + "px").attr("x", "0").attr("y", "0");
        this.node_connector_group = this.group.append("g");
        this.btn_group = this.svg.append("g");

        this.fixed_div = Skadi.x3.select("#" + element_id).append("div").attr("width", "100%").attr("height", "100%").attr("class",
            "design_fixed").style("position", "fixed").style("top", 0).style("left", 0);

        this.fixed_svg = this.fixed_div.append("svg").attr("class", "fixed_svg")
            .attr("width", this.width)
            .attr("height", this.height);

        this.div.node().addEventListener("wheel", function (event) {
            event.preventDefault();
            event.stopPropagation();
            that.wheel(event);
        }, {"passive": false, "capture": true});

        this.svg_dialogue_group = this.fixed_svg.append("g").attr("class", "fixed_dialogue_group");

        this.svg_tooltip_group = this.fixed_svg.append("g").attr("class", "fixed_tooltip_group");


        this.button_size = 64;
        this.button_margin = 10;
        let button_x = this.button_margin + this.button_size/2;
        let button_y = this.button_margin + this.button_size/2;

        this.palette_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_palette_purple, function() { that.open_palette(); }, "Open Palette");
        this.palette_btn.set_fill("white");
        this.palette_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.home_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_home_purple, function() { that.go_home(); }, "Reset View Pan/Zoom");
        this.home_btn.set_fill("white");
        this.home_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.pause_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size, icon_pause,
            function() { that.toggle_pause(); }, "Pause/Restart Execution");
        this.pause_btn.set_fill("white");
        this.pause_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.file_upload_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_file_upload_purple, function() { that.open_load(); }, "Upload Design");
        this.file_upload_btn.set_fill("white");
        this.file_upload_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.file_download_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_file_download_purple, function() {
            that.open_save();
        }, "Download Design");

        this.file_download_btn.set_fill("white");
        this.file_download_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.help_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_help_purple, function() { that.open_about(); }, "Help/About");
        this.help_btn.set_fill("white");
        this.help_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.clear_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_delete, function() { that.open_clear(); }, "Clear Design");
        this.clear_btn.set_fill("white");
        this.clear_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.edit_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_edit_purple, function() { that.open_edit_design_metadata(); }, "Edit Design Metadata");
        this.edit_btn.set_fill("white");
        this.edit_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.configuration_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_configuration_purple, function() { that.open_edit_design_configuration(); }, "Edit Configurations");
        this.configuration_btn.set_fill("white");
        this.configuration_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.drag_div = this.fixed_svg.append("rect").attr("x", "0").attr("y", "0")
            .attr("width", 0).attr("height", 0).attr("opacity", 0.1)
            .attr("id", "drag_overlay").attr("fill", "#FFF");

        this.ports = {};

        this.transition = 500;

        this.metadata = {
            "name": "New Topology",
            "description": "",
            "filename": "topology.json",
            "authors": "",
            "version": "0.1"
        };

        this.node_group = this.group.append("g");

        let pos = Skadi.x3.get_node_pos(this.div.node());
        this.offset_x = pos.x;
        this.offset_y = pos.y;

        this.drag = Skadi.x3.drag();

        this.drag
            .on("start", function (x, y) {
                that.drag.start_dragging = true;
            })
            .on("drag", function (x, y) {
                if (that.drag.start_dragging) {
                    that.drag.start_x = x;
                    that.drag.start_y = y;
                    that.drag.start_dragging = false;
                } else {
                    let dx = x - that.drag.start_x;
                    let dy = y - that.drag.start_y;
                    that.drag.start_x = x;
                    that.drag.start_y = y;
                    that.panzoom(dx, dy, 1);
                }
            })
            .on("end", function (x, y) {
                let dx = x - that.drag.start_x;
                let dy = y - that.drag.start_y;
                that.panzoom(dx, dy, 1);
            });
        this.div.call(this.drag);

        this.design_metadata_dialogue = null;
        this.design_configuration_dialogue = null;
        this.about_dialogue = null;
        this.clear_dialogue = null;
        this.palette_dialogue = null;
        this.load_dialogue = null;
        this.save_dialogue = null;
    }

    toggle_pause() {
        this.paused = !this.paused;
        if (this.paused) {
            this.pause_btn.set_url(icon_play);
        } else {
            this.pause_btn.set_url(icon_pause);
        }
        this.fire_design_event("pause", this.paused);
    }

    get_id() {
        return this.id;
    }

    /* Get/Set Schema and Executor */

    set_schema(schema) {
        this.schema = schema;
    }

    get_schema() {
        return this.schema;
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

    /* Get various SVG group selections */

     get_group() {
        return this.group;
    }

    get_skadi_svg_dialogue_group() {
        return this.svg_dialogue_group;
    }

    get_svg_tooltip_group() {
        return this.svg_tooltip_group;
    }

    get_node_group() {
        return this.node_group;
    }

    get_node_connector_group() {
        return this.node_connector_group;
    }

    create_node_service(node) {
        if (this.graph_executor) {
            return this.graph_executor.create_node_service(node);
        } else {
            let service = new SkadiNodeService(node);
            let wrapper = new SkadiWrapper(node, service);
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
        let from_node_id = link.get_from_port().get_node().get_id();
        let from_port_name = link.get_from_port().get_portName();
        let to_node_id = link.get_to_port().get_node().get_id();
        let to_port_name = link.get_to_port().get_portName();
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

    /* canvas zoom support */

    to_canvas_coords(x, y) {
        let cnv_x = (x - this.transform[4]) / this.transform[0];
        let cnv_y = (y - this.transform[5]) / this.transform[3];
        return {"x": cnv_x, "y": cnv_y};
    }

    wheel(evt) {
        if (evt.deltaY < 0) {
            this.panzoom(0, 0, 0.9);
        } else {
            this.panzoom(0, 0, 1.1);
        }
    }

    panzoom(dx, dy, zoom_by) {
        let n = this.group;

        this.transform[4] += dx;
        this.transform[5] += dy;

        let cs = this.div.node().getBoundingClientRect();
        let w = cs["width"];
        let h = cs["height"];

        let cx = w * 0.5;
        let cy = h * 0.5;

        if (zoom_by != 1) {
            for (let i = 0; i < 6; i++) {
                this.transform[i] *= zoom_by;
            }
            this.transform[4] += (1 - zoom_by) * cx;
            this.transform[5] += (1 - zoom_by) * cy;
        }

        let t = "matrix(" + this.transform.join(' ') + ")";
        n.attr("transform", t);

        this.fire_design_event("panzoom", null);
    }

    go_home() {
        this.transform = [1, 0, 0, 1, 0, 0];
        let t = "matrix(" + this.transform.join(' ') + ")";
        this.group.attr("transform", t);
        this.fire_design_event("panzoom", null);
    }

    get_transition() {
        return this.transition;
    }

    /* window management */

    open_node_window(node_id, command_id, open_callback, close_callback, x, y, width, height, resize_callback) {
        let key = node_id + "_" + command_id;
        if (key in this.windows) {
            let oldw = this.windows[key];
            if (!(oldw instanceof SkadiFrameDialogue)) {
                oldw.close();
            } else {
                return;
            }
        }
        let node = this.network.get_node(node_id);
        let title = node.get_type().get_label();
        let ifd = new SkadiFrameDialogue(key, this, title, x, y, width, height, () => {
                delete this.windows[key];
                if (close_callback) {
                    close_callback();
                }
            }, true, null, open_callback, resize_callback);
        ifd.set_parent_node(node);
        this.windows[key] = ifd;
    }

    close_windows_for_node(node_id) {
        let window_keys_to_remove = [];
        for(let key in this.windows) {
            if (key.startsWith(node_id)) {
                window_keys_to_remove.push(key);
            }
        }

        window_keys_to_remove.forEach(key => {
            this.windows[key].close();
            delete this.windows[key];
        });
    }

    open_node_window_url(node_id, command_id, open_url, x, y, width, height) {
        let key = node_id + "_" + command_id;
        if (key in this.windows) {
            return; // already open
        }
        let node = this.network.get_node(node_id);
        let title = node.get_type().get_label();
        let ifd = new SkadiFrameDialogue(key, this, title, x, y, width, height, () => {
                delete this.windows[key];
            }, true, open_url, null);
        this.windows[key] = ifd;
    }

    open_node_windowTab(node_id, command_id, open_url, open_callback, close_callback, resize_callback) {
        let key = node_id + "_open";
        if (key in this.windows) {
            let oldw = this.windows[key];
            if (oldw instanceof SkadiFrameDialogue) {
                oldw.close();
            } else {
                return;
            }
        }
        let w = window.open(open_url);
        if (w) {
            this.windows[key] = w;
            if (open_callback) {
                w.addEventListener("load", (event) => {
                    open_callback(w);
                    if (resize_callback) {
                        w.addEventListener("resize", (event) => {
                            if (resize_callback) {
                                resize_callback(w.innerWidth, w.innerHeight);
                            }
                        });
                    }

                    w.addEventListener("unload", (event) => {
                        if (this.windows[key] == w) {
                            delete this.windows[key];
                        }
                        if (close_callback) {
                            close_callback();
                        }
                    });
                });

            }

        }
    }

    open_palette() {
        let that = this;
        if (!this.palette_dialogue) {
            this.palette_dialogue = new SkadiPalette(this, "car0", function () {
                that.palette_dialogue = null;
            });
            this.palette_dialogue.open();
        }
    }

    open_about() {
        let that = this;
        if (!this.about_dialogue) {
           this.about_dialogue = new SkadiFrameDialogue("about0", this, "About", 100, 100, 600, 400, function () {
                that.about_dialogue = null;
            }, true, null, function(elt) {
               skadi_populate_about(that, elt);
               }, null);
        }
    }

    open_save() {
        let that = this;
        if (!this.save_dialogue) {
           this.save_dialogue = new SkadiFrameDialogue("save0", this, "Save", 100, 100, 600, 300, function () {
                that.save_dialogue = null;
            }, true, null, function(elt) {
               skadi_populate_save(that, elt);
               }, null);
        }
    }

    open_load() {
        let that = this;
        if (!this.load_dialogue) {
           this.load_dialogue = new SkadiFrameDialogue("load0", this, "Load", 100, 100, 600, 300, function () {
                that.load_dialogue = null;
            }, true, null, function(elt) {
               skadi_populate_load(that, elt);
               }, null);
        }
    }

    open_clear() {
        let that = this;
        if (!this.clear_dialogue) {
           this.clear_dialogue = new SkadiFrameDialogue("clear0", this, "Clear Design", 100, 100, 600, 400, function () {
                that.clear_dialogue = null;
            }, true, null, function(elt) {
               skadi_populate_clear(that, elt, function() {
                        that.clear_dialogue.close();
                    });
               }, null);
        }
    }

    open_edit_design_metadata() {
        if (!this.design_metadata_dialogue) {
           this.design_metadata_dialogue = new SkadiFrameDialogue("design_meta0", this, "Design Metadata", 100, 100, 600, 600,
                () => {
                    this.design_metadata_dialogue = null;
                }, true, null,
               (elt) => {
                    skadi_populate_design_metadata(this, elt, function() {
                        this.design_metadata_dialogue.close();
               });
           }, null);
        }
    }

    open_edit_design_configuration() {
        if (!this.design_configuration_dialogue) {
           this.design_configuration_dialogue = new SkadiFrameDialogue("design_configuration0", this, "Design Configuration", 100, 100, 600, 600,
                () => {
                    this.design_configuration_dialogue = null;
                }, true, null,
               (elt) => {
                    skadi_populate_design_configuration(this, elt, function() {
                        this.design_configuration_dialogue.close();
               });
           }, null);
        }
    }

    /* node related */

    create_node(node_id, node_type, x, y, metadata, suppress_event) {
        x = Math.round(x / GRID_SNAP) * GRID_SNAP;
        y = Math.round(y / GRID_SNAP) * GRID_SNAP;
        let id = node_id || this.next_id("nl");

        let node = new SkadiNode(this, node_type, id, x, y, true, metadata, {});
        node.create_instance();
        this.add_node(node, suppress_event);
        node.set_display_tooltips(false);
        return id;
    }

    add_node(node, suppress_event) {
        this.network.add_node(node);
        node.draw();
        if (!suppress_event) {
            this.fire_node_event("add", node);
        }
    }

    get_node(node_id) {
        return this.network.get_node(node_id);
    }

    get_configuration(package_id) {
        return this.network.get_configuration(package_id);
    }

    add_configuration(configuration) {
        this.network.add_configuration(configuration);
    }

    start_node_drag(node_id, startx, starty) {
        this.nodedrag = {
            "target": {
                "id": node_id,
                "ox": startx,
                "oy": starty
            }
        }
    }

    stop_node_drag(node_id) {
        this.nodedrag = null;
    }

    update_execution_state(node_id, state) {
        let node = this.network.get_node(node_id);
        node.update_execution_state(state);
        if (state === SkadiApi.EXECUTION_STATE_EXECUTING) {
            let upstream_node_ids = this.network.get_upstream_nodes(node_id);
            console.log(JSON.stringify(upstream_node_ids));
            for (let idx in upstream_node_ids) {
                this.network.get_node(upstream_node_ids[idx]).update_execution_state(SkadiApi.EXECUTION_STATE_EXECUTED);
            }
        }
    }

    execution_complete() {
        let node_ids = this.network.get_node_list();
        for(let idx in node_ids) {
            let node = this.network.get_node(node_ids[idx]);
            if (node.execution_state !== SkadiApi.EXECUTION_STATE_FAILED && node.execution_state !== SkadiApi.EXECUTION_STATE_PENDING) {
                node.update_execution_state(SkadiApi.EXECUTION_STATE_CLEAR);
            }
        }
    }

    update_node_position(id, x, y, suppress_event) {
        let node = this.network.get_node(id);
        node.update_position(x, y);
        if (!suppress_event) {
            this.fire_node_event("update_position", node);
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

    update_configuration_status(id, state, status_message) {
        let configuration = this.get_configuration(id);
        if (configuration) {
            configuration.update_status(status_message, state);
        }
    }

    update_node_execution_state(id, state) {
        this.update_execution_state(id, state);
    }

    /* link/port related */

    create_link(fromPort, toPort, link_type_id, link_id) {
        let id = link_id || this.next_id("ch");
        let link_type = this.schema.get_link_type(link_type_id);
        let link = new SkadiLink(this, id, fromPort, link_type, toPort);
        this.add_link(link, link_id != undefined);
        return id;
    }

    add_link(link, suppress_event) {
        this.network.add_link(link);
        link.draw();
        if (!suppress_event) {
            this.fire_link_event("add", link);
        }
    }

    get_link(id) {
        return this.network.get_link(id);
    }

    find_port(x, y, link_type_id) {
        for (let k in this.ports) {
            let port = this.ports[k];
            let coords = port.get_position();
            let dx = x - coords.x;
            let dy = y - coords.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= port.r && port.link_type_id == link_type_id) {
                return port;
            }
        }
        return null;
    }

    register_port(port) {
        this.ports[port.id] = port;
    }

    unregister_port(port) {
        delete this.ports[port.id];
    }

    get_port(port_id) {
        return this.ports[port_id];
    }

    already_connected(fromPort, toPort) {
        for (let link_id in this.network.links) {
            let link = this.network.get_link(link_id);
            if (link.fromPort == fromPort && link.toPort == toPort) {
                return true;
            }
        }
        return false;
    }

    check_allowed_to_connect(from_node_id, to_node_id) {
        if (this.is_acyclic) {
            // check that connecting would not introduce a cycle
            return !(this.network.get_downstream_nodes(to_node_id).includes(from_node_id));
        } else {
            return true;
        }
    }

    /* design metadata */

    get_metadata() {
        return this.network.get_metadata();
    }

    set_metadata(metadata) {
        this.network.set_metadata(metadata);
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
        this.network.get_node_list().forEach(node_id => { this.close_windows_for_node(node_id); });
        this.network.clear();
        if (!suppress_event) {
            this.fire_design_event("clear", null);
        }
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
            this.close_windows_for_node(id);
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
        return {"nodes": snodes, "links": slinks, "metadata": this.metadata};
    }

    deserialise(from_obj, suppress_events) {

        if (this.graph_executor) {
            this.graph_executor.pause();
        }
        for (let node_id in from_obj.nodes) {
            let node = SkadiNode.deserialise(this, node_id, from_obj.nodes[node_id]);
            this.add_node(node, suppress_events);
        }
        for (let link_id in from_obj.links) {
            let link = SkadiLink.deserialise(this, link_id, from_obj.links[link_id]);
            this.add_link(link, suppress_events);
        }
        let package_properties = from_obj.package_properties || {};
        for (let package_id in package_properties) {
            let configuration = SkadiConfiguration.deserialise(this, package_id, package_properties[package_id]);
            this.add_configuration(configuration);
        }
        if ("metadata" in from_obj) {
            this.metadata = from_obj["metadata"];
        }
        if (this.graph_executor) {
            this.graph_executor.resume();
        }
    }
}


