/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

/* skadi/js/utils/resource_loader.js */

class ResourceLoader {

    constructor(js_parent, css_parent) {
        this.loading_resources = {}; // resource_name -> true
        this.loaded_resources = {}; // resource name -> true|false
        this.js_parent = js_parent || document.head;
        this.css_parent = css_parent || document.head;
    }

    async css_load(resource) {
        let that = this;
        await fetch(resource).then(r => r.text(), e => that.notify(resource,false)).then(txt => {
            let ele = document.createElement("style");
            ele.appendChild(document.createTextNode(txt));
            this.css_parent.appendChild(ele);
            that.notify(resource,true);
        });
    }

    async js_load(resource) {
        let script = document.createElement("script");
        script.onload = (evt) => this.notify(resource, true);
        script.setAttribute("src",resource);
        document.head.appendChild(script);
        while(true) {
            await new Promise(r => setTimeout(r, 100));
            if (resource in this.loaded_resources) {
                break;
            }
        }

    }

    async load(resource) {
        // start new load
        this.loading_resources[resource] = true;
        console.log(resource);
        if (resource.endsWith(".js")) {
            await this.js_load(resource);
        } else if (resource.endsWith(".css")) {
            await this.css_load(resource);
        }
    }

    notify(resource,success) {
        delete this.loading_resources[resource];
        this.loaded_resources[resource] = success;
    }

    async load_resources(resource_list) {
        let load_tasks = [];
        for(let idx=0; idx<resource_list.length; idx++) {
            let resource = resource_list[idx];
            if (resource in this.loading_resources || resource in this.loaded_resources) {
                /* resource already loaded or failed to load */
            } else {
                load_tasks.push(await this.load(resource));
            }
        }
        if (load_tasks.length > 0) {
            await Promise.all(load_tasks);
        }
        let results = {};
        for(let idx=0; idx<resource_list.length; idx++) {
            let resource = resource_list[idx];
            results[resource] = this.loaded_resources[resource];
        }
        return results;
    }
}



/* skadi/js/services/status_states.js */

class SkadiStatusStates {
    static get info() { return "info" };
    static get warning() { return "warning" };
    static get error() { return "error" };
    static get clear() { return "" };
}

/* skadi/js/utils/topology_store.js */

class TopologyStore {

    constructor(skadi) {
        this.skadi = skadi;
    }

    async getSaveLink() {
       return "data:application/json;base64," + btoa(JSON.stringify(this.skadi.save()));
    }

    get_example_links() {
        return [];
    }

    async loadFrom(file) {
        file.text().then(t => {
            this.skadi.load(JSON.parse(t),false);
        });
    }
}

/* skadi/js/core/design.js */

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




/* skadi/js/dialogs/about.js */

function skadi_populate_about(design, elt) {

    function tableize(rowdata) {
        let tbl = document.createElement("table");
        tbl.setAttribute("class", "exo-border");
        rowdata.forEach(rowitem => {
            let row = document.createElement("tr");
            rowitem.forEach(item => {
                let cell = document.createElement("td");
                cell.appendChild(item);
                row.appendChild(cell);
            });
            tbl.appendChild(row);
        });
        return tbl;
    }

    function tn(txt) {
        return document.createTextNode(txt);
    }

    function mklink(url) {
        let a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("target", "_new");
        a.appendChild(document.createTextNode(url));
        return a;
    }
    let rowdata = [
        [tn("Description"),tn("Version"),tn("Link")],
        [tn("Skadi"), tn("0.0.1"), mklink("https://github.com/visualtopology/skadi")]];

    let package_types = design.get_schema().get_package_types();
    package_types.forEach(package_type_id => {
        let pt = design.get_schema().get_package_type(package_type_id);
        let metadata = pt.get_metadata();
        rowdata.push([tn(metadata.description), tn(metadata.version), mklink(pt.get_resource_url(metadata.link))]);
    });
    elt.appendChild(tableize(rowdata));
}

/* skadi/js/dialogs/save.js */

let skadi_download_html = `
<span aria-describedby="edit-metadata-tooltip">
    Download Topology
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         Use this form to download a topology from the designer
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            File:
        </div>
        <div class="exo-2-cell">
            <div class="exo-button exo-dark-blue-fg exo-light-blue-bg">
                <a id="skadi_designer_download_file" download=""
                     href="">
                    Download
                </a>
            </div>
        </div>
    </div>
</div>`

function skadi_populate_save(design, elt) {
    elt.innerHTML = skadi_download_html;
    let link = document.getElementById("skadi_designer_download_file");
    link.appendChild(document.createTextNode("Preparing Download..."));
    design.get_topology_store().getSaveLink().then(url => {
        link.innerHTML = "Download";
        link.setAttribute("href", url);
        const filename = design.metadata.filename || "topology.json";
        link.setAttribute("download", filename);
    });
}

/* skadi/js/dialogs/load.js */

let skadi_upload_html = `
<span aria-describedby="edit-metadata-tooltip">
    Upload Topology
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         Use this form to upload a topology to the designer
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            File:
        </div>
        <div class="exo-2-cell">
            <input class="exo-dark-blue-fg exo-light-blue-bg" type="file" id="skadi_designer_upload_file">
        </div>
    </div>
</div>`

function skadi_populate_load(design, elt, close_fn) {
    elt.innerHTML = skadi_upload_html;
    let input = document.getElementById("skadi_designer_upload_file");
    input.addEventListener("change", async function() {
        let file = input.files[0];
        await design.get_topology_store().loadFrom(file);
        design.metadata.filename = file.name;
        close_fn();
    });
}

/* skadi/js/dialogs/clear.js */

let skadi_clear_html = `
<span aria-describedby="clear-tooltip">
    Really Clear
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="clear-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
        Press the clear button to remove all nodes and links from the design.  Press cancel or close this window to leave the design unchanged.
    </div>
</div>
<div>
<input id="clear_confirm" type="button" value="Clear All">
<input id="clear_cancel" type="button" value="Cancel">
</div>
`

function skadi_populate_clear(design, elt, close_window) {
    elt.innerHTML = skadi_clear_html;
    let confirm = document.getElementById("clear_confirm");
    confirm.addEventListener("click", function() {
        design.clear(false);
        close_window();
    });
    let cancel = document.getElementById("clear_cancel");
    cancel.addEventListener("click", function() {
        close_window();
    });
}

/* skadi/js/dialogs/configuration.js */

let skadi_design_configuration_html = `
<h1>Configuration</h1>
`

function skadi_populate_design_configuration(design, elt, close_window) {
    elt.innerHTML = skadi_design_configuration_html;
}

/* skadi/js/dialogs/design_metadata.js */

let skadi_design_metadata_html = `
<span aria-describedby="edit-metadata-tooltip">
    Edit Design Metadata
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         Use this form to update the metadata associated with the design being edited
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            Name:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_name" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            Filename:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_filename" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            Description:
        </div>
        <div class="exo-2-cell">
            <textarea id="edit_metadata_description" rows="10" class="exo-full-width"></textarea>
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            Author(s):
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_authors" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            Version:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_version" type="text" value="" class="exo-full-width">
        </div>
    </div>
</div>
`

function skadi_populate_design_metadata(design, elt, close_window) {
    elt.innerHTML = skadi_design_metadata_html;
    let edit_metadata_name = document.getElementById("edit_metadata_name");
    let edit_metadata_description = document.getElementById("edit_metadata_description");
    let edit_metadata_filename = document.getElementById("edit_metadata_filename");
    let edit_metadata_authors = document.getElementById("edit_metadata_authors");
    let edit_metadata_version = document.getElementById("edit_metadata_version");
    let design_metadata = design.get_design_metadata();
    edit_metadata_name.value = design_metadata["name"] || "";
    edit_metadata_description.value = design_metadata["description"] || "";
    edit_metadata_filename.value = design_metadata["filename"] || "";
    edit_metadata_authors.value = design_metadata["authors"] || "";
    edit_metadata_version.value = design_metadata["version"] || "";
    edit_metadata_name.addEventListener("change", (evt) => {
       design_metadata["name"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_description.addEventListener("change", (evt) => {
       design_metadata["description"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_filename.addEventListener("change", (evt) => {
       design_metadata["filename"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_authors.addEventListener("change", (evt) => {
       design_metadata["authors"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_version.addEventListener("change", (evt) => {
       design_metadata["version"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
}

/* skadi/js/common/icons.js */

/* skadi/icons/close_purple.svg*/
let icon_close_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaGVpZ2h0PSIyNHB4IgogICB2aWV3Qm94PSIwIDAgMjQgMjQiCiAgIHdpZHRoPSIyNHB4IgogICBmaWxsPSIjMDAwMDAwIgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc2IgogICBzb2RpcG9kaTpkb2NuYW1lPSJjbG9zZV9wdXJwbGUuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjAuMiAoMS4wLjIrcjc1KzEpIj4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGExMiI+CiAgICA8cmRmOlJERj4KICAgICAgPGNjOldvcmsKICAgICAgICAgcmRmOmFib3V0PSIiPgogICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2Uvc3ZnK3htbDwvZGM6Zm9ybWF0PgogICAgICAgIDxkYzp0eXBlCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz4KICAgICAgPC9jYzpXb3JrPgogICAgPC9yZGY6UkRGPgogIDwvbWV0YWRhdGE+CiAgPGRlZnMKICAgICBpZD0iZGVmczEwIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBvYmplY3R0b2xlcmFuY2U9IjEwIgogICAgIGdyaWR0b2xlcmFuY2U9IjEwIgogICAgIGd1aWRldG9sZXJhbmNlPSIxMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iNzUwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjQ4MCIKICAgICBpZD0ibmFtZWR2aWV3OCIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMzUuOTE2NjY3IgogICAgIGlua3NjYXBlOmN4PSIxMiIKICAgICBpbmtzY2FwZTpjeT0iMTIiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc2IiAvPgogIDxwYXRoCiAgICAgZD0iTTAgMGgyNHYyNEgwVjB6IgogICAgIGZpbGw9Im5vbmUiCiAgICAgaWQ9InBhdGgyIiAvPgogIDxwYXRoCiAgICAgZD0iTTE4LjMgNS43MWMtLjM5LS4zOS0xLjAyLS4zOS0xLjQxIDBMMTIgMTAuNTkgNy4xMSA1LjdjLS4zOS0uMzktMS4wMi0uMzktMS40MSAwLS4zOS4zOS0uMzkgMS4wMiAwIDEuNDFMMTAuNTkgMTIgNS43IDE2Ljg5Yy0uMzkuMzktLjM5IDEuMDIgMCAxLjQxLjM5LjM5IDEuMDIuMzkgMS40MSAwTDEyIDEzLjQxbDQuODkgNC44OWMuMzkuMzkgMS4wMi4zOSAxLjQxIDAgLjM5LS4zOS4zOS0xLjAyIDAtMS40MUwxMy40MSAxMmw0Ljg5LTQuODljLjM4LS4zOC4zOC0xLjAyIDAtMS40eiIKICAgICBpZD0icGF0aDQiCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MCIgLz4KPC9zdmc+Cg==';

/* skadi/icons/drag_indicator_purple.svg*/
let icon_drag_indicator_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaGVpZ2h0PSIyNHB4IgogICB2aWV3Qm94PSIwIDAgMjQgMjQiCiAgIHdpZHRoPSIyNHB4IgogICBmaWxsPSIjMDAwMDAwIgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc2IgogICBzb2RpcG9kaTpkb2NuYW1lPSJkcmFnX2luZGljYXRvcl9wdXJwbGUuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjAuMiAoMS4wLjIrcjc1KzEpIj4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGExMiI+CiAgICA8cmRmOlJERj4KICAgICAgPGNjOldvcmsKICAgICAgICAgcmRmOmFib3V0PSIiPgogICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2Uvc3ZnK3htbDwvZGM6Zm9ybWF0PgogICAgICAgIDxkYzp0eXBlCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz4KICAgICAgPC9jYzpXb3JrPgogICAgPC9yZGY6UkRGPgogIDwvbWV0YWRhdGE+CiAgPGRlZnMKICAgICBpZD0iZGVmczEwIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBvYmplY3R0b2xlcmFuY2U9IjEwIgogICAgIGdyaWR0b2xlcmFuY2U9IjEwIgogICAgIGd1aWRldG9sZXJhbmNlPSIxMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iNzUwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjQ4MCIKICAgICBpZD0ibmFtZWR2aWV3OCIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMzUuOTE2NjY3IgogICAgIGlua3NjYXBlOmN4PSIxMiIKICAgICBpbmtzY2FwZTpjeT0iMTIiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc2IiAvPgogIDxwYXRoCiAgICAgZD0iTTAgMGgyNHYyNEgwVjB6IgogICAgIGZpbGw9Im5vbmUiCiAgICAgaWQ9InBhdGgyIiAvPgogIDxwYXRoCiAgICAgZD0iTTExIDE4YzAgMS4xLS45IDItMiAycy0yLS45LTItMiAuOS0yIDItMiAyIC45IDIgMnptLTItOGMtMS4xIDAtMiAuOS0yIDJzLjkgMiAyIDIgMi0uOSAyLTItLjktMi0yLTJ6bTAtNmMtMS4xIDAtMiAuOS0yIDJzLjkgMiAyIDIgMi0uOSAyLTItLjktMi0yLTJ6bTYgNGMxLjEgMCAyLS45IDItMnMtLjktMi0yLTItMiAuOS0yIDIgLjkgMiAyIDJ6bTAgMmMtMS4xIDAtMiAuOS0yIDJzLjkgMiAyIDIgMi0uOSAyLTItLjktMi0yLTJ6bTAgNmMtMS4xIDAtMiAuOS0yIDJzLjkgMiAyIDIgMi0uOSAyLTItLjktMi0yLTJ6IgogICAgIGlkPSJwYXRoNCIKICAgICBzdHlsZT0iZmlsbDojODAwMDgwIiAvPgo8L3N2Zz4K';

/* skadi/icons/home_purple.svg*/
let icon_home_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaGVpZ2h0PSIyNHB4IgogICB2aWV3Qm94PSIwIDAgMjQgMjQiCiAgIHdpZHRoPSIyNHB4IgogICBmaWxsPSIjMDAwMDAwIgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc2IgogICBzb2RpcG9kaTpkb2NuYW1lPSJob21lX3B1cnBsZV8yNGRwLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS4wLjIgKDEuMC4yK3I3NSsxKSI+CiAgPG1ldGFkYXRhCiAgICAgaWQ9Im1ldGFkYXRhMTIiPgogICAgPHJkZjpSREY+CiAgICAgIDxjYzpXb3JrCiAgICAgICAgIHJkZjphYm91dD0iIj4KICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL3N2Zyt4bWw8L2RjOmZvcm1hdD4KICAgICAgICA8ZGM6dHlwZQogICAgICAgICAgIHJkZjpyZXNvdXJjZT0iaHR0cDovL3B1cmwub3JnL2RjL2RjbWl0eXBlL1N0aWxsSW1hZ2UiIC8+CiAgICAgICAgPGRjOnRpdGxlPjwvZGM6dGl0bGU+CiAgICAgIDwvY2M6V29yaz4KICAgIDwvcmRmOlJERj4KICA8L21ldGFkYXRhPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMxMCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxMCIKICAgICBncmlkdG9sZXJhbmNlPSIxMCIKICAgICBndWlkZXRvbGVyYW5jZT0iMTAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjkyNSIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI0ODAiCiAgICAgaWQ9Im5hbWVkdmlldzgiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjM1LjkxNjY2NyIKICAgICBpbmtzY2FwZTpjeD0iMTIiCiAgICAgaW5rc2NhcGU6Y3k9IjEyIgogICAgIGlua3NjYXBlOndpbmRvdy14PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy15PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjAiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnNiIgLz4KICA8cGF0aAogICAgIGQ9Ik0wIDBoMjR2MjRIMFYweiIKICAgICBmaWxsPSJub25lIgogICAgIGlkPSJwYXRoMiIgLz4KICA8cGF0aAogICAgIGQ9Im0gMTAsMTkgdiAtNSBoIDQgdiA1IGMgMCwwLjU1IDAuNDUsMSAxLDEgaCAzIGMgMC41NSwwIDEsLTAuNDUgMSwtMSB2IC03IGggMS43IGMgMC40NiwwIDAuNjgsLTAuNTcgMC4zMywtMC44NyBMIDEyLjY3LDMuNiBDIDEyLjI5LDMuMjYgMTEuNzEsMy4yNiAxMS4zMywzLjYgTCAyLjk3LDExLjEzIEMgMi42MywxMS40MyAyLjg0LDEyIDMuMywxMiBoIDEuNzAwMDAwMSB2IDcgQyA1LjAwMDAwMDEsMTkuNTUgNS40NSwyMCA2LDIwIEggOS4wMDAwMDAxIEMgOS41NSwyMCAxMCwxOS41NSAxMCwxOSBaIgogICAgIGlkPSJwYXRoNCIKICAgICBzdHlsZT0iZmlsbDojODAwMDgwO3N0cm9rZS13aWR0aDowLjk5OTk5OSIgLz4KPC9zdmc+Cg==';

/* skadi/icons/file_upload_purple.svg*/
let icon_file_upload_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjQgMjQiCiAgIGhlaWdodD0iMjQiCiAgIHZpZXdCb3g9IjAgMCAyNCAyNCIKICAgd2lkdGg9IjI0IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxNiIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZmlsZV91cGxvYWRfcHVycGxlLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS4yLjIgKDE6MS4yLjIrMjAyMjEyMDUxNTUwK2IwYTg0ODY1NDEpIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMyMCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzE4IgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxLjAiCiAgICAgaW5rc2NhcGU6c2hvd3BhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iI2QxZDFkMSIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMzUuNDE2NjY3IgogICAgIGlua3NjYXBlOmN4PSIxMC45ODM1MjkiCiAgICAgaW5rc2NhcGU6Y3k9IjEyIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTI4MCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI5ODciCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjI2NyIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzE2IiAvPgogIDxnCiAgICAgaWQ9Imc0Ij4KICAgIDxyZWN0CiAgICAgICBmaWxsPSJub25lIgogICAgICAgaGVpZ2h0PSIyNCIKICAgICAgIHdpZHRoPSIyNCIKICAgICAgIGlkPSJyZWN0MiIgLz4KICA8L2c+CiAgPGcKICAgICBpZD0iZzE0IgogICAgIHN0eWxlPSJmaWxsOiM4MDAwODAiPgogICAgPGcKICAgICAgIGlkPSJnMTIiCiAgICAgICBzdHlsZT0iZmlsbDojODAwMDgwIj4KICAgICAgPHBvbHlnb24KICAgICAgICAgb3BhY2l0eT0iLjMiCiAgICAgICAgIHBvaW50cz0iOS44Myw4IDExLDggMTEsMTQgMTMsMTQgMTMsOCAxNC4xNyw4IDEyLDUuODMiCiAgICAgICAgIGlkPSJwb2x5Z29uNiIKICAgICAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MCIgLz4KICAgICAgPHJlY3QKICAgICAgICAgaGVpZ2h0PSIyIgogICAgICAgICB3aWR0aD0iMTQiCiAgICAgICAgIHg9IjUiCiAgICAgICAgIHk9IjE4IgogICAgICAgICBpZD0icmVjdDgiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4MDAwODAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGQ9Ik01LDEwaDR2Nmg2di02aDRsLTctN0w1LDEweiBNMTMsOHY2aC0yVjhIOS44M0wxMiw1LjgzTDE0LjE3LDhIMTN6IgogICAgICAgICBpZD0icGF0aDEwIgogICAgICAgICBzdHlsZT0iZmlsbDojODAwMDgwIiAvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg==';

/* skadi/icons/file_download_purple.svg*/
let icon_file_download_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjQgMjQiCiAgIGhlaWdodD0iMjQiCiAgIHZpZXdCb3g9IjAgMCAyNCAyNCIKICAgd2lkdGg9IjI0IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmcxNiIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZmlsZV9kb3dubG9hZF9wdXJwbGUuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjIuMiAoMToxLjIuMisyMDIyMTIwNTE1NTArYjBhODQ4NjU0MSkiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnMKICAgICBpZD0iZGVmczIwIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3MTgiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIzNS40MTY2NjciCiAgICAgaW5rc2NhcGU6Y3g9IjEwLjk4MzUyOSIKICAgICBpbmtzY2FwZTpjeT0iMTIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMjgwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijk4NyIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iMjY3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnMTYiIC8+CiAgPGcKICAgICBpZD0iZzQiPgogICAgPHJlY3QKICAgICAgIGZpbGw9Im5vbmUiCiAgICAgICBoZWlnaHQ9IjI0IgogICAgICAgd2lkdGg9IjI0IgogICAgICAgaWQ9InJlY3QyIiAvPgogIDwvZz4KICA8ZwogICAgIGlkPSJnMTQiCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MCI+CiAgICA8ZwogICAgICAgaWQ9ImcxMiIKICAgICAgIHN0eWxlPSJmaWxsOiM4MDAwODAiPgogICAgICA8cG9seWdvbgogICAgICAgICBvcGFjaXR5PSIuMyIKICAgICAgICAgcG9pbnRzPSIxNC4xNywxMSAxMywxMSAxMyw1IDExLDUgMTEsMTEgOS44MywxMSAxMiwxMy4xNyIKICAgICAgICAgaWQ9InBvbHlnb242IgogICAgICAgICBzdHlsZT0iZmlsbDojODAwMDgwIiAvPgogICAgICA8cmVjdAogICAgICAgICBoZWlnaHQ9IjIiCiAgICAgICAgIHdpZHRoPSIxNCIKICAgICAgICAgeD0iNSIKICAgICAgICAgeT0iMTgiCiAgICAgICAgIGlkPSJyZWN0OCIKICAgICAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgZD0iTTE5LDloLTRWM0g5djZINWw3LDdMMTksOXogTTExLDExVjVoMnY2aDEuMTdMMTIsMTMuMTdMOS44MywxMUgxMXoiCiAgICAgICAgIGlkPSJwYXRoMTAiCiAgICAgICAgIHN0eWxlPSJmaWxsOiM4MDAwODAiIC8+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4K';

/* skadi/icons/help_purple.svg*/
let icon_help_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSIyNCIKICAgdmlld0JveD0iMCAwIDI0IDI0IgogICB3aWR0aD0iMjQiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2ZzYiCiAgIHNvZGlwb2RpOmRvY25hbWU9ImhlbHBfcHVycGxlLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS4yLjIgKDE6MS4yLjIrMjAyMjEyMDUxNTUwK2IwYTg0ODY1NDEpIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMxMCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzgiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIzNS40MTY2NjciCiAgICAgaW5rc2NhcGU6Y3g9IjEwLjk4MzUyOSIKICAgICBpbmtzY2FwZTpjeT0iMTIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMjgwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijk4NyIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iMjY3IgogICAgIGlua3NjYXBlOndpbmRvdy15PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnNiIgLz4KICA8cGF0aAogICAgIGQ9Ik0wIDBoMjR2MjRIMFYweiIKICAgICBmaWxsPSJub25lIgogICAgIGlkPSJwYXRoMiIgLz4KICA8cGF0aAogICAgIGQ9Ik0xMSAxNmgydjJoLTJ6bTEtMTRDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4em0wLTE0Yy0yLjIxIDAtNCAxLjc5LTQgNGgyYzAtMS4xLjktMiAyLTJzMiAuOSAyIDJjMCAyLTMgMS43NS0zIDVoMmMwLTIuMjUgMy0yLjUgMy01IDAtMi4yMS0xLjc5LTQtNC00eiIKICAgICBpZD0icGF0aDQiCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MCIgLz4KPC9zdmc+Cg==';

/* skadi/icons/palette_purple.svg*/
let icon_palette_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMjQgMjQiCiAgIGhlaWdodD0iMjRweCIKICAgdmlld0JveD0iMCAwIDI0IDI0IgogICB3aWR0aD0iMjRweCIKICAgZmlsbD0iIzAwMDAwMCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnMTAiCiAgIHNvZGlwb2RpOmRvY25hbWU9InBhbGV0dGVfcHVycGxlXzI0ZHAuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjAuMiAoMS4wLjIrcjc1KzEpIj4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGExNiI+CiAgICA8cmRmOlJERj4KICAgICAgPGNjOldvcmsKICAgICAgICAgcmRmOmFib3V0PSIiPgogICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2Uvc3ZnK3htbDwvZGM6Zm9ybWF0PgogICAgICAgIDxkYzp0eXBlCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz4KICAgICAgICA8ZGM6dGl0bGU+PC9kYzp0aXRsZT4KICAgICAgPC9jYzpXb3JrPgogICAgPC9yZGY6UkRGPgogIDwvbWV0YWRhdGE+CiAgPGRlZnMKICAgICBpZD0iZGVmczE0IiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMSIKICAgICBvYmplY3R0b2xlcmFuY2U9IjEwIgogICAgIGdyaWR0b2xlcmFuY2U9IjEwIgogICAgIGd1aWRldG9sZXJhbmNlPSIxMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMCIKICAgICBpbmtzY2FwZTpwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTkyMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSIxMDQzIgogICAgIGlkPSJuYW1lZHZpZXcxMiIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMzUuOTE2NjY3IgogICAgIGlua3NjYXBlOmN4PSIxMiIKICAgICBpbmtzY2FwZTpjeT0iMTIiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmcxMCIgLz4KICA8ZwogICAgIGlkPSJnNCI+CiAgICA8cmVjdAogICAgICAgZmlsbD0ibm9uZSIKICAgICAgIGhlaWdodD0iMjQiCiAgICAgICB3aWR0aD0iMjQiCiAgICAgICBpZD0icmVjdDIiIC8+CiAgPC9nPgogIDxnCiAgICAgaWQ9Imc4IgogICAgIHN0eWxlPSJmaWxsOiM4MDAwODAiPgogICAgPHBhdGgKICAgICAgIGQ9Ik0xMiwyQzYuNDksMiwyLDYuNDksMiwxMnM0LjQ5LDEwLDEwLDEwYzEuMzgsMCwyLjUtMS4xMiwyLjUtMi41YzAtMC42MS0wLjIzLTEuMi0wLjY0LTEuNjdjLTAuMDgtMC4xLTAuMTMtMC4yMS0wLjEzLTAuMzMgYzAtMC4yOCwwLjIyLTAuNSwwLjUtMC41SDE2YzMuMzEsMCw2LTIuNjksNi02QzIyLDYuMDQsMTcuNTEsMiwxMiwyeiBNMTcuNSwxM2MtMC44MywwLTEuNS0wLjY3LTEuNS0xLjVjMC0wLjgzLDAuNjctMS41LDEuNS0xLjUgczEuNSwwLjY3LDEuNSwxLjVDMTksMTIuMzMsMTguMzMsMTMsMTcuNSwxM3ogTTE0LjUsOUMxMy42Nyw5LDEzLDguMzMsMTMsNy41QzEzLDYuNjcsMTMuNjcsNiwxNC41LDZTMTYsNi42NywxNiw3LjUgQzE2LDguMzMsMTUuMzMsOSwxNC41LDl6IE01LDExLjVDNSwxMC42Nyw1LjY3LDEwLDYuNSwxMFM4LDEwLjY3LDgsMTEuNUM4LDEyLjMzLDcuMzMsMTMsNi41LDEzUzUsMTIuMzMsNSwxMS41eiBNMTEsNy41IEMxMSw4LjMzLDEwLjMzLDksOS41LDlTOCw4LjMzLDgsNy41QzgsNi42Nyw4LjY3LDYsOS41LDZTMTEsNi42NywxMSw3LjV6IgogICAgICAgaWQ9InBhdGg2IgogICAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MCIgLz4KICA8L2c+Cjwvc3ZnPgo=';

/* skadi/icons/status_error.svg*/
let icon_status_error = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaGVpZ2h0PSI0OCIKICAgd2lkdGg9IjQ4IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc0IgogICBzb2RpcG9kaTpkb2NuYW1lPSJzdGF0dXNfZXJyb3Iuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjAuMiAoMS4wLjIrcjc1KzEpIj4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGExMCI+CiAgICA8cmRmOlJERj4KICAgICAgPGNjOldvcmsKICAgICAgICAgcmRmOmFib3V0PSIiPgogICAgICAgIDxkYzpmb3JtYXQ+aW1hZ2Uvc3ZnK3htbDwvZGM6Zm9ybWF0PgogICAgICAgIDxkYzp0eXBlCiAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz4KICAgICAgPC9jYzpXb3JrPgogICAgPC9yZGY6UkRGPgogIDwvbWV0YWRhdGE+CiAgPGRlZnMKICAgICBpZD0iZGVmczgiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIG9iamVjdHRvbGVyYW5jZT0iMTAiCiAgICAgZ3JpZHRvbGVyYW5jZT0iMTAiCiAgICAgZ3VpZGV0b2xlcmFuY2U9IjEwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxNTI4IgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjgzNiIKICAgICBpZD0ibmFtZWR2aWV3NiIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMTQuMjA4MzMzIgogICAgIGlua3NjYXBlOmN4PSIyNCIKICAgICBpbmtzY2FwZTpjeT0iMjQiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjcyIgogICAgIGlua3NjYXBlOndpbmRvdy15PSIyNyIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzQiIC8+CiAgPHBhdGgKICAgICBkPSJNMjQuMiAyNi4zNXEuNiAwIDEuMDI1LS40MjUuNDI1LS40MjUuNDI1LTEuMDc1di05LjdxMC0uNi0uNDUtMS4wMjUtLjQ1LS40MjUtMS4wNS0uNDI1LS42NSAwLTEuMDc1LjQyNS0uNDI1LjQyNS0uNDI1IDEuMDc1djkuN3EwIC42LjQ1IDEuMDI1LjQ1LjQyNSAxLjEuNDI1Wk0yNCAzNHEuNyAwIDEuMTc1LS40NzUuNDc1LS40NzUuNDc1LTEuMTc1IDAtLjctLjQ3NS0xLjE3NVEyNC43IDMwLjcgMjQgMzAuN3EtLjcgMC0xLjE3NS40NzUtLjQ3NS40NzUtLjQ3NSAxLjE3NSAwIC43LjQ3NSAxLjE3NVEyMy4zIDM0IDI0IDM0Wm0wIDEwcS00LjI1IDAtNy45LTEuNTI1LTMuNjUtMS41MjUtNi4zNS00LjIyNS0yLjctMi43LTQuMjI1LTYuMzVRNCAyOC4yNSA0IDI0cTAtNC4yIDEuNTI1LTcuODVRNy4wNSAxMi41IDkuNzUgOS44cTIuNy0yLjcgNi4zNS00LjI1UTE5Ljc1IDQgMjQgNHE0LjIgMCA3Ljg1IDEuNTVRMzUuNSA3LjEgMzguMiA5LjhxMi43IDIuNyA0LjI1IDYuMzVRNDQgMTkuOCA0NCAyNHEwIDQuMjUtMS41NSA3LjktMS41NSAzLjY1LTQuMjUgNi4zNS0yLjcgMi43LTYuMzUgNC4yMjVRMjguMiA0NCAyNCA0NFptMC0yMFptMCAxN3E3IDAgMTItNXQ1LTEycTAtNy01LTEyVDI0IDdxLTcgMC0xMiA1VDcgMjRxMCA3IDUgMTJ0MTIgNVoiCiAgICAgaWQ9InBhdGgyIgogICAgIHN0eWxlPSJmaWxsOiNmZjAwMDAiIC8+Cjwvc3ZnPgo=';

/* skadi/icons/status_info.svg*/
let icon_status_info = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaGVpZ2h0PSI0OCIKICAgd2lkdGg9IjQ4IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc0IgogICBzb2RpcG9kaTpkb2NuYW1lPSJzdGF0dXNfaW5mby5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMC4yICgxLjAuMityNzUrMSkiPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTEwIj4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZGVmcwogICAgIGlkPSJkZWZzOCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxMCIKICAgICBncmlkdG9sZXJhbmNlPSIxMCIKICAgICBndWlkZXRvbGVyYW5jZT0iMTAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9Ijc1MCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI0ODAiCiAgICAgaWQ9Im5hbWVkdmlldzYiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjE0LjIwODMzMyIKICAgICBpbmtzY2FwZTpjeD0iMjQiCiAgICAgaW5rc2NhcGU6Y3k9IjI0IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3MiIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMjciCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc0IiAvPgogIDxwYXRoCiAgICAgZD0iTTI0LjE1IDM0cS42NSAwIDEuMDc1LS40MjUuNDI1LS40MjUuNDI1LTEuMDc1di05LjA1cTAtLjYtLjQ1LTEuMDI1UTI0Ljc1IDIyIDI0LjE1IDIycS0uNjUgMC0xLjA3NS40MjUtLjQyNS40MjUtLjQyNSAxLjA3NXY5LjA1cTAgLjYuNDUgMS4wMjUuNDUuNDI1IDEuMDUuNDI1Wk0yNCAxOC4zcS43IDAgMS4xNzUtLjQ1LjQ3NS0uNDUuNDc1LTEuMTV0LS40NzUtMS4yUTI0LjcgMTUgMjQgMTVxLS43IDAtMS4xNzUuNS0uNDc1LjUtLjQ3NSAxLjJ0LjQ3NSAxLjE1cS40NzUuNDUgMS4xNzUuNDVaTTI0IDQ0cS00LjI1IDAtNy45LTEuNTI1LTMuNjUtMS41MjUtNi4zNS00LjIyNS0yLjctMi43LTQuMjI1LTYuMzVRNCAyOC4yNSA0IDI0cTAtNC4yIDEuNTI1LTcuODVRNy4wNSAxMi41IDkuNzUgOS44cTIuNy0yLjcgNi4zNS00LjI1UTE5Ljc1IDQgMjQgNHE0LjIgMCA3Ljg1IDEuNTVRMzUuNSA3LjEgMzguMiA5LjhxMi43IDIuNyA0LjI1IDYuMzVRNDQgMTkuOCA0NCAyNHEwIDQuMjUtMS41NSA3LjktMS41NSAzLjY1LTQuMjUgNi4zNS0yLjcgMi43LTYuMzUgNC4yMjVRMjguMiA0NCAyNCA0NFptMC0yMFptMCAxN3E3IDAgMTItNXQ1LTEycTAtNy01LTEyVDI0IDdxLTcgMC0xMiA1VDcgMjRxMCA3IDUgMTJ0MTIgNVoiCiAgICAgaWQ9InBhdGgyIgogICAgIHN0eWxlPSJmaWxsOiMwMDgwMDAiIC8+Cjwvc3ZnPgo=';

/* skadi/icons/status_warning.svg*/
let icon_status_warning = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIgogICB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgaGVpZ2h0PSI0OCIKICAgd2lkdGg9IjQ4IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc0IgogICBzb2RpcG9kaTpkb2NuYW1lPSJzdGF0dXNfd2FybmluZy5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMC4yICgxLjAuMityNzUrMSkiPgogIDxtZXRhZGF0YQogICAgIGlkPSJtZXRhZGF0YTEwIj4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZGVmcwogICAgIGlkPSJkZWZzOCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgb2JqZWN0dG9sZXJhbmNlPSIxMCIKICAgICBncmlkdG9sZXJhbmNlPSIxMCIKICAgICBndWlkZXRvbGVyYW5jZT0iMTAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9Ijc1MCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI0ODAiCiAgICAgaWQ9Im5hbWVkdmlldzYiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjE0LjIwODMzMyIKICAgICBpbmtzY2FwZTpjeD0iMjQiCiAgICAgaW5rc2NhcGU6Y3k9IjI0IgogICAgIGlua3NjYXBlOndpbmRvdy14PSI3MiIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMjciCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc0IiAvPgogIDxwYXRoCiAgICAgZD0iTTI0LjA1IDI0LjQ1Wk00LjYgNDJxLS44NSAwLTEuMy0uNzUtLjQ1LS43NSAwLTEuNWwxOS40LTMzLjVxLjQ1LS43NSAxLjMtLjc1Ljg1IDAgMS4zLjc1bDE5LjQgMzMuNXEuNDUuNzUgMCAxLjV0LTEuMy43NVptMTkuNi0yMi42cS0uNjUgMC0xLjA3NS40MjUtLjQyNS40MjUtLjQyNSAxLjA3NXY4LjJxMCAuNjUuNDI1IDEuMDc1LjQyNS40MjUgMS4wNzUuNDI1LjY1IDAgMS4wNzUtLjQyNS40MjUtLjQyNS40MjUtMS4wNzV2LTguMnEwLS42NS0uNDI1LTEuMDc1LS40MjUtLjQyNS0xLjA3NS0uNDI1Wm0wIDE2Ljc1cS42NSAwIDEuMDc1LS40MjUuNDI1LS40MjUuNDI1LTEuMDc1IDAtLjY1LS40MjUtMS4wNzUtLjQyNS0uNDI1LTEuMDc1LS40MjUtLjY1IDAtMS4wNzUuNDI1UTIyLjcgMzQgMjIuNyAzNC42NXEwIC42NS40MjUgMS4wNzUuNDI1LjQyNSAxLjA3NS40MjVaTTcuMiAzOWgzMy42TDI0IDEwWiIKICAgICBpZD0icGF0aDIiCiAgICAgc3R5bGU9ImZpbGw6IzAwMDBmZiIgLz4KPC9zdmc+Cg==';

/* skadi/icons/play.svg*/
let icon_play = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSI0OCIKICAgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiCiAgIHdpZHRoPSI0OCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnNCIKICAgc29kaXBvZGk6ZG9jbmFtZT0icGxheS5zdmciCiAgIGlua3NjYXBlOnZlcnNpb249IjEuMi4yICgxOjEuMi4yKzIwMjIxMjA1MTU1MCtiMGE4NDg2NTQxKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcwogICAgIGlkPSJkZWZzOCIgLz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzYiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpzaG93cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjAiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjZDFkMWQxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTp6b29tPSIxNy43MDgzMzMiCiAgICAgaW5rc2NhcGU6Y3g9IjIwLjYxMTc2NSIKICAgICBpbmtzY2FwZTpjeT0iMjQiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMDI0IgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjczMSIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iNTIyIgogICAgIGlua3NjYXBlOndpbmRvdy15PSIwIgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnNCIgLz4KICA8cGF0aAogICAgIGQ9Im0zODMtMzEwIDI2Ny0xNzAtMjY3LTE3MHYzNDBabTk3IDIzMHEtODIgMC0xNTUtMzEuNXQtMTI3LjUtODZRMTQzLTI1MiAxMTEuNS0zMjVUODAtNDgwcTAtODMgMzEuNS0xNTZ0ODYtMTI3UTI1Mi04MTcgMzI1LTg0OC41VDQ4MC04ODBxODMgMCAxNTYgMzEuNVQ3NjMtNzYzcTU0IDU0IDg1LjUgMTI3VDg4MC00ODBxMCA4Mi0zMS41IDE1NVQ3NjMtMTk3LjVxLTU0IDU0LjUtMTI3IDg2VDQ4MC04MFptMC02MHExNDIgMCAyNDEtOTkuNVQ4MjAtNDgwcTAtMTQyLTk5LTI0MXQtMjQxLTk5cS0xNDEgMC0yNDAuNSA5OVQxNDAtNDgwcTAgMTQxIDk5LjUgMjQwLjVUNDgwLTE0MFptMC0zNDBaIgogICAgIGlkPSJwYXRoMiIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJmaWxsOiM4MDAwODA7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjAuODI1NTU2IgogICAgIGQ9Ik0gMjIuNTg4MjM1LDQzLjkyNTYyNyBDIDIwLjQ3NTQxNCw0My43MjYyNDQgMTkuMjcyOTA2LDQzLjQ4MjIxIDE3LjYzMDg4NSw0Mi45MTk1OTMgMTMuMjQ5OTE3LDQxLjQxODUxNCA5LjUyNjcwODcsMzguNDYwNzk4IDcuMDU0ODk2MSwzNC41MTgwMyA2LjYxMTU5NSwzMy44MTA5MjQgNS44MjcwMDY3LDMyLjI4NzQ5OSA1LjUwOTMwNCwzMS41MTY5NzQgMy43MzAyMzQ0LDI3LjIwMjE5MiAzLjU0NDE4MzMsMjIuMjUzMTYxIDQuOTk1MzE2NSwxNy44NDQ3MDYgNi4zOTI1NTA3LDEzLjU5OTk5MiA5LjEyMDE5NzUsOS45ODE1MTM2IDEyLjc5MDU4OCw3LjUwMzU0NjQgYyAyLjc1Nzk4MSwtMS44NjE5NzggNS42OTMyMzIsLTIuOTYxMDAyMSA4Ljk3ODgyNCwtMy4zNjE4NzQ4IDAuODI2OTY2LC0wLjEwMDg5NzUgMy42OTA5MTIsLTAuMTAxNTQ2NiA0LjQ4OTQxMiwtMC4wMDEwMiAzLjA3NzQzNCwwLjM4NzQ0MTcgNS42NTYzNjksMS4yODY1MjY4IDguMjM4MzUyLDIuODcyMTA5IDIuMjEzOTk5LDEuMzU5NjA0MiA0LjI1MjU1LDMuMjYwODA2NCA1LjcyNjQ1NSw1LjM0MDYzMTQgMC44MzE3ODUsMS4xNzM3MzIgMS42ODI4NjYsMi42OTk0NDggMi4yNDQxNjcsNC4wMjMwNzYgMS45NzI5Myw0LjY1MjQ1IDIuMDAwMDIxLDEwLjI3OTQ3MyAwLjA3MjMyLDE1LjAyMTE3NiAtMi4yMjkwNzEsNS40ODMwMDcgLTYuNjM3NTMsOS42NTQwOTIgLTEyLjIxNTQxMywxMS41NTc2NzIgLTEuMzY0NDg3LDAuNDY1NjYyIC0zLjA1ODIxMSwwLjgxNDMzNiAtNC42MDIzNTMsMC45NDc0NTEgLTAuNjE3MTQyLDAuMDUzMiAtMi42NTUwNjUsMC4wNjgwNiAtMy4xMzQxMTgsMC4wMjI4NiB6IG0gMi44NTc2ODIsLTIuOTU4MjE0IGMgNC4zNjgyOCwtMC4zNTA3NDEgOC4wNTc2NjMsLTIuMTQ0MTcgMTEuMDQ4MzU1LC01LjM3MDY2MiAyLjYzMDI5NywtMi44Mzc2ODMgNC4wNjgyNzEsLTYuMDEyNzE1IDQuNDQ2NTQ2LC05LjgxNzkyNyAwLjA3NjI1LC0wLjc2NzA2OCAwLjA3NTY5LC0yLjg1MzUyOSAtOS43N2UtNCwtMy42MTQxMTggLTAuMzMzMDg2LC0zLjMwNDQyMiAtMS40OTIwODEsLTYuMTc0NDE0IC0zLjUzNDcxOCwtOC43NTI5NDEgLTAuNTI4NjU2LC0wLjY2NzM1IC0yLjE5MTUxOCwtMi4zMTk3OCAtMi44ODk0MDgsLTIuODcxMjgzIEMgMzIuMTA2MzE0LDguNjM2NDczNiAyOS40NDkxNDMsNy41MjczNjU2IDI2LjI4NzA1OSw3LjEwNTgyNzMgMjUuMjQ5NTQ0LDYuOTY3NTE2IDIyLjczODIyMyw2Ljk2OTExNjIgMjEuNzEyOTQxLDcuMTA4NzQyIGMgLTMuOTgzNDkzLDAuNTQyNDgzNCAtNy4yNTU1OSwyLjIwOTU5NzYgLTEwLjAzOTkzOSw1LjExNTI5IC0yLjY5ODE2MjEsMi44MTU3NSAtNC4yMjY0OTYxLDYuMTA5MjkxIC00LjYxMjg2NzYsOS45NDA2NzQgLTAuMDg5OTA3LDAuODkxNTQ3IC0wLjA3NDc1NywyLjk3OTk0NyAwLjAyODE3NCwzLjg4MzU2OSAwLjQwODQ4MDYsMy41ODYwNDIgMS43ODc2MTUzLDYuNjE0NzQyIDQuMjU4MzY1Niw5LjM1MTc0MyAyLjc5NTg5NSwzLjA5NzE4MSA2LjM5NTIzMyw1LjAwMDA5OSAxMC4zNjYyNjcsNS40ODA0OTIgMS4yNDU3MjIsMC4xNTA3IDIuNTU3OTU2LDAuMTgxMjQ5IDMuNzMyOTc2LDAuMDg2OSB6IgogICAgIGlkPSJwYXRoOTE0IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDIwLDAsMCwyMCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzAwZmYwMDtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0ibSAxOS4xNzE3NjUsMjQgYyAwLC02LjA5OTU5MSAwLjAxNzE3LC04LjQzODQwNyAwLjA2MTc1LC04LjQxMDg1NyAwLjc3Njc4OSwwLjQ4MDA4MiAxMy4xMzUzNTcsOC4zNjYyNDcgMTMuMTUzOTY1LDguMzkzNzE5IDAuMDE4NDQsMC4wMjcyMiAtMTEuNTUyOTksNy40NDE1NDUgLTEzLjE0NTEyMyw4LjQyMjY1OCAtMC4wNTYzNSwwLjAzNDcyIC0wLjA3MDU5LC0xLjY2MDc1MyAtMC4wNzA1OSwtOC40MDU1MiB6IgogICAgIGlkPSJwYXRoMTc4MCIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJmaWxsOiM4MDAwODA7c3Ryb2tlLXdpZHRoOjAuODI1NTU2IgogICAgIGQ9Im0gMTkuMjI5NjM0LDMxLjk3NjQ3MSBjIC0wLjA0ODc3LC0wLjQ4MDQzMSAtMC4wMTE2LC0xNi4yMjk4MjYgMC4wMzg0MiwtMTYuMjc5ODMyIDAuMDM5NDQsLTAuMDM5NDMgMS43NzA5NzIsMS4wNTE3NSA4Ljc2OTU5MSw1LjUyNjQxNyAxLjk4Nzc2NCwxLjI3MDkwNiAzLjc2MDIzNSwyLjQwMjg1NyAzLjkzODgyMywyLjUxNTQ0NiAwLjE3ODU4OCwwLjExMjU4OSAwLjMyNDcwNiwwLjIyMTY3MiAwLjMyNDcwNiwwLjI0MjQwNyAwLDAuMDUxNTkgLTIuNDY3ODY2LDEuNjUwNzcxIC04LjEzMTc2NSw1LjI2OTQwMyAtMy4xNjM0OCwyLjAyMTEyOCAtNC44MzgzNTQsMy4wNzkxIC00Ljg3NDUyLDMuMDc5MSAtMC4wMTYxOSwwIC0wLjA0NTU1LC0wLjE1ODgyMyAtMC4wNjUyNiwtMC4zNTI5NDEgeiIKICAgICBpZD0icGF0aDg1OCIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJmaWxsOiM4MDAwODA7c3Ryb2tlLXdpZHRoOjAuODI1NTU2IgogICAgIGQ9Im0gMTkuMjkyMTMxLDMyLjIzMzMwOCBjIC0wLjA1MDQsLTAuMDUwNCAtMC4wNDI5LC0xNi4zNTEwMTggMC4wMDc2LC0xNi40MzAwNTcgMC4wNTU2NSwtMC4wODcxNiAxLjAwNzQxNiwwLjUxMDI3MyAxMS44MDE0ODgsNy40MDc5MjUgMC42Mjg5NDEsMC40MDE5MDggMS4xNDM1MjksMC43NDc1NzMgMS4xNDM1MjksMC43NjgxNDQgMCwwLjA1MjM4IC0xLjcxNjExNSwxLjE2ODQwMSAtNi44MDQ3MDYsNC40MjUyMiAtMy4yOTA4NzIsMi4xMDYyMzYgLTUuNzk5MjY3LDMuNjk2OTQ3IC01Ljk5NDQxNiwzLjgwMTM4NyAtMC4wNjQ3OSwwLjAzNDY3IC0wLjEzMzg0LDAuMDQ2OTkgLTAuMTUzNDUzLDAuMDI3MzggeiIKICAgICBpZD0icGF0aDg2MCIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KPC9zdmc+Cg==';

/* skadi/icons/pause.svg*/
let icon_pause = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSI0OCIKICAgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiCiAgIHdpZHRoPSI0OCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnNCIKICAgc29kaXBvZGk6ZG9jbmFtZT0icGF1c2Uuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjIuMiAoMToxLjIuMisyMDIyMTIwNTE1NTArYjBhODQ4NjU0MSkiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnMKICAgICBpZD0iZGVmczgiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXc2IgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxLjAiCiAgICAgaW5rc2NhcGU6c2hvd3BhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iI2QxZDFkMSIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMTcuNzA4MzMzIgogICAgIGlua3NjYXBlOmN4PSIyMS45NjcwNTkiCiAgICAgaW5rc2NhcGU6Y3k9IjI0IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTAyNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI3MzEiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjUyMiIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzQiIC8+CiAgPHBhdGgKICAgICBkPSJNNDAwLjE3NS0zMjBxMTIuODI1IDAgMjEuMzI1LTguNjI1VDQzMC0zNTB2LTI2MHEwLTEyLjc1LTguNjc1LTIxLjM3NS04LjY3Ni04LjYyNS0yMS41LTguNjI1LTEyLjgyNSAwLTIxLjMyNSA4LjYyNVQzNzAtNjEwdjI2MHEwIDEyLjc1IDguNjc1IDIxLjM3NSA4LjY3NiA4LjYyNSAyMS41IDguNjI1Wm0xNjAgMHExMi44MjUgMCAyMS4zMjUtOC42MjVUNTkwLTM1MHYtMjYwcTAtMTIuNzUtOC42NzUtMjEuMzc1LTguNjc2LTguNjI1LTIxLjUtOC42MjUtMTIuODI1IDAtMjEuMzI1IDguNjI1VDUzMC02MTB2MjYwcTAgMTIuNzUgOC42NzUgMjEuMzc1IDguNjc2IDguNjI1IDIxLjUgOC42MjVaTTQ4MC4yNjYtODBxLTgyLjczNCAwLTE1NS41LTMxLjV0LTEyNy4yNjYtODZxLTU0LjUtNTQuNS04Ni0xMjcuMzQxUTgwLTM5Ny42ODEgODAtNDgwLjVxMC04Mi44MTkgMzEuNS0xNTUuNjU5UTE0My03MDkgMTk3LjUtNzYzdDEyNy4zNDEtODUuNVEzOTcuNjgxLTg4MCA0ODAuNS04ODBxODIuODE5IDAgMTU1LjY1OSAzMS41UTcwOS04MTcgNzYzLTc2M3Q4NS41IDEyN1E4ODAtNTYzIDg4MC00ODAuMjY2cTAgODIuNzM0LTMxLjUgMTU1LjVUNzYzLTE5Ny42ODRxLTU0IDU0LjMxNi0xMjcgODZRNTYzLTgwIDQ4MC4yNjYtODBabS4yMzQtNjBRNjIyLTE0MCA3MjEtMjM5LjV0OTktMjQxUTgyMC02MjIgNzIxLjE4OC03MjEgNjIyLjM3NS04MjAgNDgwLTgyMHEtMTQxIDAtMjQwLjUgOTguODEyUTE0MC02MjIuMzc1IDE0MC00ODBxMCAxNDEgOTkuNSAyNDAuNXQyNDEgOTkuNVptLS41LTM0MFoiCiAgICAgaWQ9InBhdGgyIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0ibSAyMi41ODgyMzUsNDMuOTI5MzcxIGMgLTAuMTA4NzA2LC0wLjAxMjMyIC0wLjQ3NzE3NiwtMC4wNTAyNCAtMC44MTg4MjMsLTAuMDg0MjYgLTIuMTg5NTc5LC0wLjIxODA3OCAtNC41MTg3NSwtMC45MDg2MjkgLTYuNjEyNzE3LC0xLjk2MDUzNSBDIDkuNTExNTUzNSwzOS4wNDg3MzEgNS41MzE5NTYyLDMzLjgwMTM1NiA0LjM1NTQyNzUsMjcuNjQyMzUzIDMuOTQ2MjczNiwyNS41MDA0NzUgMy45MzQ3MTY4LDIyLjc0ODk4MyA0LjMyNTMwNDgsMjAuNDcwNTg4IDQuOTg1NzA2NywxNi42MTgzMDMgNi45Nzk0MzMyLDEyLjgwODUxNyA5LjgyMzMzNTUsOS45NjQ0NzA4IDEzLjAzNjcwMiw2Ljc1MDk0MzEgMTcuMDUwNzE5LDQuNzY2MjY2NyAyMS41NDM1MjksNC4xNjk1ODEgYyAwLjk0MTI4MiwtMC4xMjUwMTA3IDMuODA5MzcsLTAuMTQxODg1NiA0Ljc0MzUzLC0wLjAyNzkwOSAzLjI2MTI0MiwwLjM5NzkwMTcgNi4wMjMzLDEuNDE5Nzc0NSA4LjgwOTQxMiwzLjI1OTE5OTUgMS4xNDUzNjQsMC43NTYxODM1IDEuOTAzNTI3LDEuMzg0Mjg3MiAzLjAyNDcyNSwyLjUwNTg0NzggMS42MTE3ODcsMS42MTIzMDc3IDIuNjQwNjY4LDMuMDI1NzMwNyAzLjY2MTMzNSw1LjAyOTc1MTcgMC41Nzc2NDcsMS4xMzQxNzYgMC44NTcwMDEsMS43OTg5MjUgMS4yMjIxNTIsMi45MDgyMzUgMS40MDM4NTYsNC4yNjQ4MjggMS4yNzQ2MDksOS4xMjQwNjkgLTAuMzUyOTczLDEzLjI3MDU4OCAtMS44NTIyMDQsNC43MTg3ODEgLTUuMjI1Njc2LDguNDUwMTIzIC05LjY3MzU4MywxMC42OTk3OTQgLTIuMTU3NzY5LDEuMDkxMzYgLTQuMDQ2MTYyLDEuNjgwNjg1IC02LjQzNjk1MSwyLjAwODgyOCAtMC42MTQ3MDYsMC4wODQzNyAtMy40NjczOTksMC4xNjA0NzMgLTMuOTUyOTQxLDAuMTA1NDU1IHogbSAyLjkwODIzNiwtMi45NjI4NjUgYyAyLjYzMDc1OCwtMC4yMjU5ODQgNC44ODIwNjMsLTAuOTExNDMzIDYuOTQyMTU2LC0yLjExMzY1OCAxLjQxNjI4MSwtMC44MjY1MSAyLjM2MTQ2MSwtMS41NjQwMjUgMy42MTc4NDQsLTIuODIyOTY5IDIuODg5ODY3LC0yLjg5NTc1OSA0LjQ4OTgxNCwtNi4yNTAxNDkgNC44ODE2MTUsLTEwLjIzNDYyIDAuMDc5OTQsLTAuODEyOTc5IDAuMDc5ODUsLTIuODM0OTE0IC0xLjY5ZS00LC0zLjY0ODcxIEMgNDAuNTQ2MDc3LDE4LjE2MTUxIDM4LjkxMjE3MiwxNC43NTM4NjQgMzYuMDEyNDksMTEuODc0MTYyIDMyLjYyMzQzOSw4LjUwODQ2MjkgMjguMzYwNTUyLDYuODQ2MjU0NSAyMy40OTE3NjUsNi45OTIwMTI3IGMgLTQuNjk4OTU0LDAuMTQwNjczOSAtOC41Mjk3OSwxLjgzMzIyMiAtMTEuODAzMTA3LDUuMjE0ODczMyAtMi43MTc4MiwyLjgwNzc3MiAtNC4yNDU1MDA3LDYuMDkzODAxIC00LjYyOTQwNjksOS45NTc4MiAtMC4wODkwODgsMC44OTY2NzMgLTAuMDczNDc1LDIuOTgzNDQ0IDAuMDI5MDU3LDMuODgzNTY5IDAuNDA4NDgwNiwzLjU4NjA0MiAxLjc4NzYxNTMsNi42MTQ3NDIgNC4yNTgzNjU5LDkuMzUxNzQzIDIuOTY2NTEzLDMuMjg2MTg2IDYuNzc2NzA3LDUuMTk1NDc4IDExLjEwMDM4NSw1LjU2MjQxNSAwLjgxNzUzOCwwLjA2OTM4IDIuMjY2NjA1LDAuMDcxMzIgMy4wNDk0MTIsMC4wMDQxIHoiCiAgICAgaWQ9InBhdGg4NjAiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMjAsMCwwLDIwLDAsLTk2MCkiIC8+CiAgPHBhdGgKICAgICBzdHlsZT0iZmlsbDojZmYwMDAwO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDowLjgyNTU1NiIKICAgICBkPSJtIDE5LjUyMDM0MywzMS44ODYxOTQgYyAtMC4zNTA0MDcsLTAuMTI0NzMzIC0wLjcxMjQyNywtMC40NDgzNzggLTAuODYyMzA1LC0wLjc3MDkgLTAuMTAwNDc5LC0wLjIxNjIxOSAtMC4xMDUwMjIsLTAuNTIwMDg0IC0wLjEwNjIxLC03LjEwMjk5IC0wLjAwMTEsLTYuMDQ4ODkzIDAuMDA5MiwtNi45MDIwMjYgMC4wODUyMSwtNy4wODQwMTkgMC4xMzg3ODEsLTAuMzMyMTQ5IDAuMzMwNTkzLC0wLjU0MzE1MSAwLjY1NDk5MiwtMC43MjA1MjEgMC4yNTM2MDEsLTAuMTM4NjYgMC4zNjgyNDYsLTAuMTY1OTA3IDAuNzAwMTA5LC0wLjE2NjM5NiAwLjMzOTA0NSwtNC45OGUtNCAwLjQ0MTg1OSwwLjAyNDcgMC43MDU4ODIsMC4xNzMwMzUgMC4zOTE3MDUsMC4yMjAwNjQgMC42NDkxODcsMC41NTEwMjggMC43Mjk0NDIsMC45Mzc2MTcgMC4wNDMzMSwwLjIwODYzMiAwLjA1NzI4LDIuMzExNjg4IDAuMDQ2Niw3LjAxNzY1MSAtMC4wMTY4NSw3LjQyOTY3NSAwLjAxMTI3LDYuODg0MDMgLTAuMzc3NzIxLDcuMzI3MDcxIC0wLjM3MDAwNiwwLjQyMTQxMyAtMS4wMjg4NDUsMC41ODQyMjEgLTEuNTc2MDA0LDAuMzg5NDUyIHoiCiAgICAgaWQ9InBhdGgxMDU0IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDIwLDAsMCwyMCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6I2ZmMDAwMDtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0ibSAyNy42NjExLDMxLjkzOTQ3NiBjIC0wLjUxMjUzNSwtMC4xMzA4NDIgLTAuOTQ3MDA0LC0wLjU1MzMyNCAtMS4wNzQ1MDcsLTEuMDQ0ODYgLTAuMDk2NTQsLTAuMzcyMTc2IC0wLjEwODg3NSwtMTMuMzAzNjM5IC0wLjAxMzExLC0xMy43NTAxNTMgMC4yMzAzMDUsLTEuMDczODc2IDEuNTg0MDIsLTEuNDgwMDggMi40MDg4MDEsLTAuNzIyOCAwLjUwNjI5NywwLjQ2NDg2MiAwLjQ2NDQ4OSwtMC4yMTQwNzggMC40NjU4OTMsNy41NjYwMzMgMC4wMDEzLDcuNDY1MTcgMC4wMTkxOSw3LjAzMDY2OSAtMC4zMDYyMTMsNy40NTcyOTEgLTAuMjkxNDgxLDAuMzgyMTUyIC0wLjk5NzQ2LDAuNjE3ODkyIC0xLjQ4MDg1OSwwLjQ5NDQ4OSB6IgogICAgIGlkPSJwYXRoMTA1NiIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJmaWxsOiM4MDAwODA7c3Ryb2tlLXdpZHRoOjAuODI1NTU2IgogICAgIGQ9Ik0gMTkuNDU0MTE4LDMxLjgyODY2OCBDIDE5LjE1NzE5MiwzMS42OTMzMTQgMTguODk3OTksMzEuNDcwMjQ1IDE4LjczNzI1LDMxLjIxMTczNCBMIDE4LjYwNzA1OSwzMS4wMDIzNTQgMTguNTg5MTAyLDI0LjQ4IGMgLTAuMDA5OSwtMy41ODcyOTQgLTAuMDAxMywtNi43NTU3OTUgMC4wMTkxMiwtNy4wNDExMTQgMC4wNDQyLC0wLjYxODQyOSAwLjE2NjYwMiwtMC44NTEzOTMgMC42MDQyNTIsLTEuMTUwMDQzIDAuMjQ2NzAzLC0wLjE2ODM0OSAwLjMzNjYzNiwtMC4xOTU5MDEgMC42OTkyMDYsLTAuMjE0MjEgMC4zNDQ2ODEsLTAuMDE3NDEgMC40NTc0MTcsMi42OWUtNCAwLjY1NjkxMSwwLjEwMjk4OSAwLjMxMTE4MywwLjE2MDIyOSAwLjU4NjQ5OCwwLjQyMzMzNyAwLjczOTg4OSwwLjcwNzA4NCBsIDAuMTIyMTExLDAuMjI1ODgzIDAuMDE2NzgsNS43NiBjIDAuMDE4NjMsNi4zOTQ1OTggLTAuMDIxMDksOC4wOTY2MTkgLTAuMTk1OTI4LDguMzk1OTgyIC0wLjEzODc4NywwLjIzNzYzNSAtMC41MjU4MiwwLjUzMzM1NiAtMC43OTYzOTQsMC42MDg1MDEgLTAuMzE4NTk1LDAuMDg4NDggLTAuNzQ4NzgxLDAuMDY4NTQgLTEuMDAwOTI3LC0wLjA0NjQgeiIKICAgICBpZD0icGF0aDg1OSIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJmaWxsOiM4MDAwODA7c3Ryb2tlLXdpZHRoOjAuODI1NTU2IgogICAgIGQ9Im0gMjcuNDY0NzczLDMxLjg1NTk0MyBjIC0wLjI4MDU0MSwtMC4xMjc2MTggLTAuNjQ4NjIyLC0wLjQ5MTY5MSAtMC43NzczNDksLTAuNzY4ODg0IC0wLjExNzE4MywtMC4yNTIzMzMgLTAuMTE4MTM2LC0wLjI5OTMxIC0wLjEzNTc2NywtNi42OTE3NjQgLTAuMDEwNDUsLTMuNzg3OTU2IDAuMDA0MywtNi42NTUwNDUgMC4wMzU3NSwtNi45NjU4MzMgMC4wNDQ3MSwtMC40NDEzMTEgMC4wODA0MiwtMC41NjY0ODIgMC4yMTcxNDgsLTAuNzYxMDE3IDAuMjUyMjAyLC0wLjM1ODgzOSAwLjYxNTQzOSwtMC41NTUzNjMgMS4wODkxMjQsLTAuNTg5MjU1IDAuMzQ2MTc1LC0wLjAyNDc3IDAuNDMyMzk5LC0wLjAwOTggMC43MDE5MDUsMC4xMjIwODYgMC40MjEyOTUsMC4yMDYxMiAwLjY5MTk5MSwwLjUxNzA3NyAwLjc1MDg4MSwwLjg2MjU2MiAwLjAyNTU2LDAuMTQ5OTQ4IDAuMDQ2NDcsMy4zMjIwNDUgMC4wNDY0Nyw3LjA0OTEwNCAwLDUuMzQxNDAzIC0wLjAxNTIyLDYuODE5MzIxIC0wLjA3MTg2LDYuOTc4ODE0IC0wLjA4OTQsMC4yNTE3MzEgLTAuMzU5MDYxLDAuNTMyNDk1IC0wLjY1OTI3MSwwLjY4NjQwOCAtMC4yOTM2MDEsMC4xNTA1MjUgLTAuOTQ0MTk1LDAuMTkyNzk3IC0xLjE5NzAzOSwwLjA3Nzc4IHoiCiAgICAgaWQ9InBhdGg4NjEiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMjAsMCwwLDIwLDAsLTk2MCkiIC8+Cjwvc3ZnPgo=';

/* skadi/icons/delete.svg*/
let icon_delete = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSI0OCIKICAgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiCiAgIHdpZHRoPSI0OCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnNCIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZGVsZXRlLnN2ZyIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS4yLjIgKDE6MS4yLjIrMjAyMjEyMDUxNTUwK2IwYTg0ODY1NDEpIgogICB4bWxuczppbmtzY2FwZT0iaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZSIKICAgeG1sbnM6c29kaXBvZGk9Imh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkIgogICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM4IiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0ibmFtZWR2aWV3NiIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMS4wIgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIyIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMCIKICAgICBpbmtzY2FwZTpkZXNrY29sb3I9IiNkMWQxZDEiCiAgICAgc2hvd2dyaWQ9ImZhbHNlIgogICAgIGlua3NjYXBlOnpvb209IjE3LjcwODMzMyIKICAgICBpbmtzY2FwZTpjeD0iMjAuODk0MTE4IgogICAgIGlua3NjYXBlOmN5PSIyMC4xNiIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjEwMjQiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iNzMxIgogICAgIGlua3NjYXBlOndpbmRvdy14PSI1MjIiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc0IiAvPgogIDxwYXRoCiAgICAgZD0iTTI2MS0xMjBxLTI0IDAtNDItMTh0LTE4LTQydi01NzBoLTExcS0xMi43NSAwLTIxLjM3NS04LjY3NS04LjYyNS04LjY3Ni04LjYyNS0yMS41IDAtMTIuODI1IDguNjI1LTIxLjMyNVQxOTAtODEwaDE1OHEwLTEzIDguNjI1LTIxLjVUMzc4LTg0MGgyMDRxMTIuNzUgMCAyMS4zNzUgOC42MjVUNjEyLTgxMGgxNThxMTIuNzUgMCAyMS4zNzUgOC42NzUgOC42MjUgOC42NzYgOC42MjUgMjEuNSAwIDEyLjgyNS04LjYyNSAyMS4zMjVUNzcwLTc1MGgtMTF2NTcwcTAgMjQtMTggNDJ0LTQyIDE4SDI2MVptMC02MzB2NTcwaDQzOHYtNTcwSDI2MVptMTA2IDQ1NHEwIDEyLjc1IDguNjc1IDIxLjM3NSA4LjY3NiA4LjYyNSAyMS41IDguNjI1IDEyLjgyNSAwIDIxLjMyNS04LjYyNVQ0MjctMjk2di0zMzlxMC0xMi43NS04LjY3NS0yMS4zNzUtOC42NzYtOC42MjUtMjEuNS04LjYyNS0xMi44MjUgMC0yMS4zMjUgOC42MjVUMzY3LTYzNXYzMzlabTE2NiAwcTAgMTIuNzUgOC42NzUgMjEuMzc1IDguNjc2IDguNjI1IDIxLjUgOC42MjUgMTIuODI1IDAgMjEuMzI1LTguNjI1VDU5My0yOTZ2LTMzOXEwLTEyLjc1LTguNjc1LTIxLjM3NS04LjY3Ni04LjYyNS0yMS41LTguNjI1LTEyLjgyNSAwLTIxLjMyNSA4LjYyNVQ1MzMtNjM1djMzOVpNMjYxLTc1MHY1NzAtNTcwWiIKICAgICBpZD0icGF0aDIiIC8+CiAgPHBhdGgKICAgICBzdHlsZT0iZmlsbDojODAwMDgwO3N0cm9rZS13aWR0aDowLjgyNTU1NiIKICAgICBkPSJtIDE5LjYxMDUxNCwzNC42Mzc0OTkgYyAtMC41MzI5NDksLTAuMDc4OTggLTEuMDMzOTM1LC0wLjUwNTU5NiAtMS4xNzAyOTEsLTAuOTk2NTczIC0wLjAzOTEsLTAuMTQwOCAtMC4wNTgxMSwtMy4xMDQwMjggLTAuMDU3NDksLTguOTYzMjc5IDkuMTdlLTQsLTguNjgwNjY2IDAuMDAxOSwtOC43NTUwMzkgMC4xMTU4MjEsLTkuMDA3MDU5IDAuMTQwNzMxLC0wLjMxMTI1OCAwLjQwNDQ0MywtMC41OTQ0MjUgMC42OTExOTEsLTAuNzQyMTg0IDAuNzIyMTkzLC0wLjM3MjEzOSAxLjY4MjY4MSwtMC4wMTc3MSAyLjAwOTI1OCwwLjc0MTQ0IGwgMC4xMjAwMjksMC4yNzkwMTcgLTAuMDE0ODEsOC44NTM4MDUgLTAuMDE0ODEsOC44NTM4MDUgLTAuMTIxODg3LDAuMjI1ODgyIGMgLTAuMzExNzE5LDAuNTc3NjggLTAuODgzNDM3LDAuODU0OTYyIC0xLjU1NzAxMSwwLjc1NTE0NiB6IgogICAgIGlkPSJwYXRoMzA2IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDIwLDAsMCwyMCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0ibSAyNy45MjQ3MDYsMzQuNjQ0Mzg5IGMgLTAuNTE2ODc2LC0wLjA2Mjg3IC0xLjA0NjkxNCwtMC41MTIzNTQgLTEuMTgzMzA3LC0xLjAwMzQ2MyAtMC4wODgyMSwtMC4zMTc2MjkgLTAuMDgxMSwtMTcuNTczMDMgMC4wMDc0LC0xNy44NjgzMDQgMC4wODQsLTAuMjgwMzUzIDAuNDQ0OTIsLTAuNjkzNjg1IDAuNzM0OTE4LC0wLjg0MTYzIDAuNzMyNTMxLC0wLjM3MzcxIDEuNjg4NTgxLC0wLjAyMzQxIDIuMDE2NDk3LDAuNzM4ODUyIGwgMC4xMjAwMywwLjI3OTAxNyAtMC4wMTQ4MSw4Ljg1MzgwNSAtMC4wMTQ4MSw4Ljg1MzgwNSAtMC4xMjE4ODcsMC4yMjU4ODIgYyAtMC4zMDc4NTYsMC41NzA1MjIgLTAuODYzNTg2LDAuODQ0ODAyIC0xLjU0Mzk5NSwwLjc2MjAzNiB6IgogICAgIGlkPSJwYXRoMzA4IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDIwLDAsMCwyMCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0iTSAxMi41MzY0NzEsNDEuOTI4MTY5IEMgMTEuMzg0OTUzLDQxLjY5NzAzNiAxMC4zNDg0NTQsNDAuNjc1NDM0IDEwLjEzNzY0LDM5LjU2MzgxMyAxMC4wOTkzOCwzOS4zNjIwNjcgMTAuMDgsMzQuNDIwOTIxIDEwLjA4LDI0Ljg2NzU4NiBWIDEwLjQ3NTI5NCBIIDkuNjYzNTcwNSBjIC0wLjcxNjM0NDYsMCAtMS4yMDMyMzI2LC0wLjI2NTc3MyAtMS40NzA4OTcsLTAuODAyOTA1OSBDIDguMDI5ODE1LDkuMzQ1NTczNyA3Ljk5Nzg0NDIsOC44NzM4Mzc3IDguMTEyNTk2Miw4LjQ5MDgyOTcgOC4yMDU0MjI4LDguMTgxMDAyMSA4LjUyODgzMzksNy44MjgzNTM1IDguODYyNzQyMSw3LjY3Mjg2NzggTCA5LjE0ODIzNTMsNy41Mzk5MjY5IDEzLjI3NzAzLDcuNTM5Mzc1MiAxNy40MDU4MjUsNy41Mzg4MjM1IDE3LjQ0MDY4LDcuMjg0NTI1MiBDIDE3LjQ4Nzg4LDYuOTQwMTY3MSAxNy42NTAwODEsNi42NDAyNTM2IDE3LjkyMTk1OCw2LjM5NDYyOSAxOC4zNTgyMjUsNi4wMDA0ODgxIDE4LjE0MDUxNSw2LjAxNDExNzYgMjQsNi4wMTQxMTc2IGMgNS45ODA3NzEsMCA1LjY1NzIyMywtMC4wMjM0NDkgNi4xMjQ1NTQsMC40NDM4ODE2IDAuMjYyNzg4LDAuMjYyNzg4NCAwLjQ1NDI3LDAuNjYzMTA0IDAuNDU0MjcsMC45NDk3MDc1IHYgMC4xMzExMTY4IGggNC4xMzk1IDQuMTM5NTAxIGwgMC4yOTIxMTUsMC4xNDU1NjcyIGMgMC41MjQ0NjksMC4yNjEzNTQxIDAuNzk5NzIsMC43MTY0NzU1IDAuODAxNzYxLDEuMzI1Njk4MSA5LjZlLTQsMC4yODY3MTM5IC0wLjAzMTcxLDAuNDM2MjE2MSAtMC4xNDUwMzIsMC42NjM2MTgyIC0wLjI3MjA0NCwwLjU0NTkyMyAtMC43NDE5MTgsMC44MDE1ODcgLTEuNDczMTk5LDAuODAxNTg3IEggMzcuOTIgdiAxNC4zOTIyOTIgYyAwLDkuMzQyNTU4IC0wLjAxOTc5LDE0LjQ5OTAxOCAtMC4wNTY0LDE0LjY5NjQ3MSAtMC4yMDI2MDksMS4wOTI2NzUgLTEuMjg3MjE3LDIuMTYxNDg3IC0yLjM5NjMyMiwyLjM2MTQyMiAtMC4zOTk2MjMsMC4wNzIwNCAtMjIuNTcyMzQ2LDAuMDc0NjQgLTIyLjkzMDgwNSwwLjAwMjcgeiBNIDM0Ljk4MzUyOSwyNC43NjIzNTMgViAxMC40NzUyOTQgSCAyNCAxMy4wMTY0NzEgViAyNC43NjIzNTMgMzkuMDQ5NDEyIEggMjQgMzQuOTgzNTI5IFoiCiAgICAgaWQ9InBhdGgzNjQiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMjAsMCwwLDIwLDAsLTk2MCkiIC8+Cjwvc3ZnPgo=';

/* skadi/icons/edit_purple.svg*/
let icon_edit_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSI0OCIKICAgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiCiAgIHdpZHRoPSI0OCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnNCIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZWRpdF9wdXJwbGUuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjIuMiAoMToxLjIuMisyMDIyMTIwNTE1NTArYjBhODQ4NjU0MSkiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnMKICAgICBpZD0iZGVmczgiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXc2IgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxLjAiCiAgICAgaW5rc2NhcGU6c2hvd3BhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iI2QxZDFkMSIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMiIKICAgICBpbmtzY2FwZTpjeD0iMTgiCiAgICAgaW5rc2NhcGU6Y3k9Ijk2IgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTAyNCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI3MzEiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjUyMiIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzQiIC8+CiAgPHBhdGgKICAgICBkPSJNNDgwLTEyMHYtNzFsMjE2LTIxNiA3MSA3MS0yMTYgMjE2aC03MVpNMTIwLTMzMHYtNjBoMzAwdjYwSDEyMFptNjkwLTQ5LTcxLTcxIDI5LTI5cTgtOCAyMS04dDIxIDhsMjkgMjlxOCA4IDggMjF0LTggMjFsLTI5IDI5Wk0xMjAtNDk1di02MGg0NzB2NjBIMTIwWm0wLTE2NXYtNjBoNDcwdjYwSDEyMFoiCiAgICAgaWQ9InBhdGgyIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0iTSA2LjAxNDExNzYsMjEuNzY5NDEyIFYgMjAuMzAxMTc2IEggMTcuNzMxNzY1IDI5LjQ0OTQxMiB2IDEuNDY4MjM2IDEuNDY4MjM1IEggMTcuNzMxNzY1IDYuMDE0MTE3NiBaIgogICAgIGlkPSJwYXRoMzA2IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDIwLDAsMCwyMCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MC44MjU1NTYiCiAgICAgZD0iTSA2LjAxNDExNzYsMTMuNDk2NDcxIFYgMTIgSCAxNy43MzE3NjUgMjkuNDQ5NDEyIHYgMS40OTY0NzEgMS40OTY0NyBIIDE3LjczMTc2NSA2LjAxNDExNzYgWiIKICAgICBpZD0icGF0aDMwOCIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KICA8cGF0aAogICAgIHN0eWxlPSJmaWxsOiM4MDAwODA7c3Ryb2tlLXdpZHRoOjE0LjYxOTIiCiAgICAgZD0ibSAyNC41LDQwLjIxNTg0IGMgMCwtMC43MDYyODggMi4zODA4NTEsLTMuNjM1NDM3IDUuMjkwNzgxLC02LjUwOTIyIEMgMzMuOTUwMzEzLDI5LjU5ODc1NyAzNS4zNDIwODIsMjguNzQyMDgyIDM2LjMsMjkuNyBjIDAuOTU3OTE4LDAuOTU3OTE4IDAuMTAxMjQzLDIuMzQ5Njg3IC00LjAwNjYyMSw2LjUwOTIxOSBDIDI3LjE2OTcyLDQxLjM5NzMyNCAyNC41LDQyLjc2OTg0MyAyNC41LDQwLjIxNTg0IFoiCiAgICAgaWQ9InBhdGgzMTAiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMjAsMCwwLDIwLDAsLTk2MCkiIC8+CiAgPHBhdGgKICAgICBzdHlsZT0iZmlsbDojODAwMDgwO3N0cm9rZS13aWR0aDoxNC42MTkyIgogICAgIGQ9Ik0gMzguOTU4ODgxLDI2LjQzMzQ2OSBDIDM4LjU5NjM0OCwyNS44NDY4NzcgMzguNTM5ODUxLDI1LjEyNjgxNiAzOC44MzMzMzMsMjQuODMzMzMzIDM5LjU0OTY0NiwyNC4xMTcwMjEgNDEuNSwyNS4zNzkxNTcgNDEuNSwyNi41NTkwMTcgYyAwLDEuMjc3OTcyIC0xLjcyNjQxMSwxLjE5MjY3NiAtMi41NDExMTksLTAuMTI1NTQ4IHoiCiAgICAgaWQ9InBhdGgzMTIiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMjAsMCwwLDIwLDAsLTk2MCkiIC8+CiAgPHBhdGgKICAgICBzdHlsZT0iZmlsbDojODAwMDgwO3N0cm9rZS13aWR0aDoxNC42MTkyIgogICAgIGQ9Im0gNi41LDMwIGMgMCwtMS4xOTA0NzYgMS40NDQ0NDQ0LC0xLjUgNywtMS41IDUuNTU1NTU2LDAgNywwLjMwOTUyNCA3LDEuNSAwLDEuMTkwNDc2IC0xLjQ0NDQ0NCwxLjUgLTcsMS41IC01LjU1NTU1NTYsMCAtNywtMC4zMDk1MjQgLTcsLTEuNSB6IgogICAgIGlkPSJwYXRoMzE0IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDIwLDAsMCwyMCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MTQuNjE5MiIKICAgICBkPSIiCiAgICAgaWQ9InBhdGgzMTYiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMjAsMCwwLDIwLDAsLTk2MCkiIC8+CiAgPHBhdGgKICAgICBzdHlsZT0iZmlsbDojODAwMDgwO3N0cm9rZS13aWR0aDo3LjMwOTYxIgogICAgIGQ9Im0gMzkuMzUsMjYuNjUgYyAtMC43OTQ2MjksLTAuNzk0NjI5IC0wLjc2NTU0LC0xLjkgMC4wNSwtMS45IDAuODM2MTUzLDAgMS44NSwxLjAxMzg0NiAxLjg1LDEuODUgMCwwLjgxNTU0IC0xLjEwNTM3MSwwLjg0NDYyOSAtMS45LDAuMDUgeiIKICAgICBpZD0icGF0aDMxOCIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgyMCwwLDAsMjAsMCwtOTYwKSIgLz4KPC9zdmc+Cg==';

/* skadi/icons/configuration_purple.svg*/
let icon_configuration_purple = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgaGVpZ2h0PSIyNCIKICAgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiCiAgIHdpZHRoPSIyNCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnNCIKICAgc29kaXBvZGk6ZG9jbmFtZT0iY29uZmlndXJhdGlvbl9wdXJwbGUuc3ZnIgogICBpbmtzY2FwZTp2ZXJzaW9uPSIxLjIuMiAoMToxLjIuMisyMDIyMTIwNTE1NTArYjBhODQ4NjU0MSkiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnMKICAgICBpZD0iZGVmczgiIC8+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXc2IgogICAgIHBhZ2Vjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJjb2xvcj0iIzY2NjY2NiIKICAgICBib3JkZXJvcGFjaXR5PSIxLjAiCiAgICAgaW5rc2NhcGU6c2hvd3BhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAuMCIKICAgICBpbmtzY2FwZTpwYWdlY2hlY2tlcmJvYXJkPSIwIgogICAgIGlua3NjYXBlOmRlc2tjb2xvcj0iI2QxZDFkMSIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6em9vbT0iMjcuOTE2NjY3IgogICAgIGlua3NjYXBlOmN4PSI4LjQxNzkxMDQiCiAgICAgaW5rc2NhcGU6Y3k9IjEyLjAxNzkxIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTUyOCIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI4MzYiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjcyIgogICAgIGlua3NjYXBlOndpbmRvdy15PSIyNyIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzQiIC8+CiAgPHBhdGgKICAgICBkPSJtMzcwLTgwLTE2LTEyOHEtMTMtNS0yNC41LTEyVDMwNy0yMzVsLTExOSA1MEw3OC0zNzVsMTAzLTc4cS0xLTctMS0xMy41di0yN3EwLTYuNSAxLTEzLjVMNzgtNTg1bDExMC0xOTAgMTE5IDUwcTExLTggMjMtMTV0MjQtMTJsMTYtMTI4aDIyMGwxNiAxMjhxMTMgNSAyNC41IDEydDIyLjUgMTVsMTE5LTUwIDExMCAxOTAtMTAzIDc4cTEgNyAxIDEzLjV2MjdxMCA2LjUtMiAxMy41bDEwMyA3OC0xMTAgMTkwLTExOC01MHEtMTEgOC0yMyAxNXQtMjQgMTJMNTkwLTgwSDM3MFptMTEyLTI2MHE1OCAwIDk5LTQxdDQxLTk5cTAtNTgtNDEtOTl0LTk5LTQxcS01OSAwLTk5LjUgNDFUMzQyLTQ4MHEwIDU4IDQwLjUgOTl0OTkuNSA0MVptMC04MHEtMjUgMC00Mi41LTE3LjVUNDIyLTQ4MHEwLTI1IDE3LjUtNDIuNVQ0ODItNTQwcTI1IDAgNDIuNSAxNy41VDU0Mi00ODBxMCAyNS0xNy41IDQyLjVUNDgyLTQyMFptLTItNjBabS00MCAzMjBoNzlsMTQtMTA2cTMxLTggNTcuNS0yMy41VDYzOS0zMjdsOTkgNDEgMzktNjgtODYtNjVxNS0xNCA3LTI5LjV0Mi0zMS41cTAtMTYtMi0zMS41dC03LTI5LjVsODYtNjUtMzktNjgtOTkgNDJxLTIyLTIzLTQ4LjUtMzguNVQ1MzMtNjk0bC0xMy0xMDZoLTc5bC0xNCAxMDZxLTMxIDgtNTcuNSAyMy41VDMyMS02MzNsLTk5LTQxLTM5IDY4IDg2IDY0cS01IDE1LTcgMzB0LTIgMzJxMCAxNiAyIDMxdDcgMzBsLTg2IDY1IDM5IDY4IDk5LTQycTIyIDIzIDQ4LjUgMzguNVQ0MjctMjY2bDEzIDEwNloiCiAgICAgaWQ9InBhdGgyIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MC41MjM2NzMiCiAgICAgZD0ibSA5LjI1OTcwMTUsMjEuOTczMzcyIGMgMCwtMC4wNTAwNyAtMC4zOTczMzE1LC0zLjE4MjM0OCAtMC40MDQyMzU2LC0zLjE4NjcwMSAtMC4wMDQyNCwtMC4wMDI3IC0wLjExNjQwMTgsLTAuMDU0OTQgLTAuMjQ5MjU0LC0wLjExNjE1OCBDIDguNDczMzU5OCwxOC42MDkyOTkgOC4yMTM5NzgxLDE4LjQ2MTYgOC4wMjk4MDc5LDE4LjM0MjI5NCA3Ljg0NTYzNzYsMTguMjIyOTg3IDcuNjc5NjI0MiwxOC4xMjUzNzMgNy42NjA4ODg4LDE4LjEyNTM3MyBjIC0wLjAxODczNSwwIC0wLjY4NTQ3MjIsMC4yNzQyMDEgLTEuNDgxNjM3NSwwLjYwOTMzNiAtMS4xNDkzOTM4LDAuNDgzODIyIC0xLjQ1NjIxNjUsMC42MDAwMzUgLTEuNDg5NTM0OCwwLjU2NDE3OSAtMC4wODUyNjYsLTAuMDkxNzYgLTIuNzA0MjU3NywtNC42NTA3NzUgLTIuNjg3Mzg1OSwtNC42NzgwNzQgMC4wMDk2MiwtMC4wMTU1NyAwLjU4MjQ1NzQsLTAuNDU0NDU4IDEuMjcyOTY2NSwtMC45NzUzMDcgbCAxLjI1NTQ3MTIsLTAuOTQ3IEwgNC41MzA4NjE1LDEyIDQuNTMwOTU0NiwxMS4zMDE0OTMgMy4yNzUxMDczLDEwLjM1NDAzOCBDIDIuNTg0Mzk0MSw5LjgzMjkzNzIgMi4wMTE1MzU2LDkuMzk0MDc5NiAyLjAwMjA5MTMsOS4zNzg3OTg0IDEuOTg5ODc3OSw5LjM1OTAzNjggNC42MDUyNzA0LDQuNzgxNTMxMiA0LjY5NzgzNjQsNC42NjA2NTg2IGMgMC4wMDU4OCwtMC4wMDc2OCAwLjY2Nzk5MzUsMC4yNjI0MDIgMS40NzEzNTU3LDAuNjAwMTg3OCAwLjgwMzM2MjQsMC4zMzc3ODU4IDEuNDc0MjE3NiwwLjYxNDA3MTcgMS40OTA3ODk0LDAuNjEzOTY4MiAwLjAxNjU3MiwtMS4wNzVlLTQgMC4xOTk5NDE1LC0wLjEwNjc4MzIgMC40MDc0ODc4LC0wLjIzNzA2NjcgMC4yMDc1NDU5LC0wLjEzMDI4MzMgMC40NjgwMTcxLC0wLjI3Nzc1MDEgMC41Nzg4MjQxLC0wLjMyNzcwNCAwLjExMDgwNzMsLTAuMDQ5OTU0IDAuMjA0OTM0OSwtMC4wOTMyNDMgMC4yMDkxNzI1LC0wLjA5NjE5OSAwLjAwNjkyLC0wLjAwNDgzIDAuNDA0MjM1NiwtMy4xMzc0NzU1IDAuNDA0MjM1NiwtMy4xODcyMTYzIDAsLTAuMDExMzYyIDEuMjMzMTM0NSwtMC4wMjA2NTkgMi43NDAyOTg1LC0wLjAyMDY1OSAxLjUwNzE2NCwwIDIuNzQwMjk5LDAuMDA5MyAyLjc0MDI5OSwwLjAyMDY1OSAwLDAuMDUwMDczIDAuMzk3MzMxLDMuMTgyMzQ3MyAwLjQwNDIzNSwzLjE4NjcwMDQgMC4wMDQyLDAuMDAyNjcgMC4xMTY0MDIsMC4wNTQ5NDMgMC4yNDkyNTQsMC4xMTYxNTc0IDAuMTMyODUyLDAuMDYxMjE1IDAuMzkyMjM0LDAuMjA4OTEzNiAwLjU3NjQwNCwwLjMyODIxOTkgMC4xODQxNywwLjExOTMwNjUgMC4zNDk1MDMsMC4yMTcwOSAwLjM2NzQwNiwwLjIxNzI5NyAwLjAxNzksMi4xNWUtNCAwLjY5MDEzMiwtMC4yNzU3OTQzIDEuNDkzODQxLC0wLjYxMzMzNjUgMC44MDM3MSwtMC4zMzc1NDI0IDEuNDY1ODA3LC0wLjYwNzcxMTkgMS40NzEzMjYsLTAuNjAwMzc2NyAwLjA5ODMxLDAuMTMwNjQwMSAyLjcwNzUwMSw0LjY5NzUxMzEgMi42OTUyMDIsNC43MTc0MTM4IC0wLjAwOTYsMC4wMTU1MjYgLTAuNTgyMywwLjQ1NDUwNDUgLTEuMjcyNjc3LDAuOTc1NTA5MSBsIC0xLjI1NTIzMSwwLjk0NzI4IC0wLjAwNjEsMC42NTM3MzEgYyAtMC4wMDMzLDAuMzU5NTUyIC0wLjAwNzcsMC42NzMzMDcgLTAuMDA5NywwLjY5NzIzMyAtMC4wMDIsMC4wMjM5MyAwLjQ3MTk0MSwwLjQwMzg1NCAxLjA1MzEzNSwwLjg0NDI4NCAwLjU4MTE5NCwwLjQ0MDQzIDEuMTU0NzUsMC44NzYyMjggMS4yNzQ1NywwLjk2ODQzOSBsIDAuMjE3ODU0LDAuMTY3NjU2IC0xLjMzODk3OSwyLjMxMDQ0OCBjIC0wLjczNjQzOSwxLjI3MDc0NiAtMS4zNTE4MTgsMi4zMzIxNzQgLTEuMzY3NTA5LDIuMzU4NzI5IC0wLjAyMjEzLDAuMDM3NDUgLTAuMzQ1MjgzLC0wLjA4NjE0IC0xLjQ0MDA2OCwtMC41NTA3MzkgLTAuNzc2MzQ3LC0wLjMyOTQ2MSAtMS40Mzg2NzIsLTAuNjA2NjY3IC0xLjQ3MTgzMywtMC42MTYwMTMgLTAuMDM0NjksLTAuMDA5OCAtMC4yMjI5NjEsMC4wODUxMiAtMC40NDMzMDksMC4yMjM0MzkgLTAuMjEwNjU4LDAuMTMyMjM3IC0wLjQ3MzY3NSwwLjI4MTMwMiAtMC41ODQ0ODIsMC4zMzEyNTYgLTAuMTEwODA4LDAuMDQ5OTUgLTAuMjA0OTM1LDAuMDkzMjQgLTAuMjA5MTczLDAuMDk2MiAtMC4wMDY5LDAuMDA0OCAtMC40MDQyMzUsMy4xMzc0NzYgLTAuNDA0MjM1LDMuMTg3MjE3IDAsMC4wMTEzNiAtMS4yMzMxMzUsMC4wMjA2NiAtMi43NDAyOTksMC4wMjA2NiAtMS41MDcxNjQsMCAtMi43NDAyOTg1LC0wLjAwOTMgLTIuNzQwMjk4NSwtMC4wMjA2NiB6IG0gMy43NDIxMjY1LC0yLjA2NTkwOSBjIDAuMDExLC0wLjA2NDAzIDAuMDg0NDEsLTAuNjE2MTIgMC4xNjMxMzksLTEuMjI2ODY2IDAuMDc4NzMsLTAuNjEwNzQ2IDAuMTU1MDg0LC0xLjE1NjY1MyAwLjE2OTY4MywtMS4yMTMxMjYgMC4wMjM3NSwtMC4wOTE4OSAwLjA2MDQyLC0wLjExMzcwNCAwLjM0ODkzMiwtMC4yMDc2MjIgMC43MTU3ODEsLTAuMjMzMDAxIDEuNDk5MTU5LC0wLjY4NTQ1OCAyLjAyMzkxOCwtMS4xNjg5NTcgbCAwLjI2ODYxOSwtMC4yNDc0OTkgMS4wOTI1MzgsMC40NTMxNzQgYyAwLjYwMDg5NSwwLjI0OTI0NiAxLjE2MDI1MSwwLjQ4MDE1NCAxLjI0MzAxMiwwLjUxMzEyOSBsIDAuMTUwNDc0LDAuMDU5OTUgMC40OTIzNTgsLTAuODYzMDE1IGMgMC40MTg3MywtMC43MzM5NTggMC40ODQzMDksLTAuODY5MDY2IDAuNDM4NTQsLTAuOTAzNDgxIC0xLjM2OTA3NCwtMS4wMjk0NDQgLTIuMDczNjM4LC0xLjU3MjEzMSAtMi4wNzM2MzgsLTEuNTk3MjA4IDAsLTAuMDE3NCAwLjAzNiwtMC4xNzM5NSAwLjA4LC0wLjM0Nzg5NCAwLjA3MTU1LC0wLjI4Mjg0MiAwLjA4LC0wLjQwNTIxMyAwLjA4LC0xLjE1ODA1MiAwLC0wLjc1MjgzOSAtMC4wMDg1LC0wLjg3NTIxIC0wLjA4LC0xLjE1ODA1MiAtMC4wNDQsLTAuMTczOTQ0IC0wLjA4LC0wLjMyOTk4MyAtMC4wOCwtMC4zNDY3NTYgMCwtMC4wMjMxMSAxLjEwMzUyNCwtMC44NzM4MzgxIDIuMDczMjg5LC0xLjU5ODM0NTggMC4wNDYxOSwtMC4wMzQ1MDkgLTAuMDE4MjksLTAuMTY3NDY3MyAtMC40Mzc5MjgsLTAuOTAzMDIwNCAtMC40NTc0NjcsLTAuODAxODU3NiAtMC40OTc2NiwtMC44NjA0MzU4IC0wLjU3MTE5LC0wLjgzMjQ2MjYgLTAuMDQzNSwwLjAxNjU1IC0wLjU5Nzk2LDAuMjUwOTAzNSAtMS4yMzIxMjcsMC41MjA3ODYxIEwgMTUuOTk4NDE2LDguMTcyODQ1IDE1LjY3MDczMSw3Ljg4MzY0NjQgQyAxNS4wODg1NTEsNy4zNjk4NDM3IDE0LjM4ODk3OCw2Ljk2NjE4MzggMTMuNzAyNTkzLDYuNzQ4MDExNiAxMy41MzQ1MjUsNi42OTQ1OTAxIDEzLjM4MzI3OSw2LjYzODk5NTcgMTMuMzY2NDksNi42MjQ0Njg1IDEzLjM0MjUwMSw2LjYwMzcxMDcgMTMuMDI0NjI3LDQuMjAzODc5OCAxMy4wMjE2MjksNC4wMjA4OTU1IDEzLjAyMTA2LDMuOTg2MTYgMTIuNzk2MzUxLDMuOTc2MTE5NCAxMi4wMTk1MzMsMy45NzYxMTk0IGggLTEuMDAxMzYxIGwgLTAuMDIsMC4xMTY0MTc5IGMgLTAuMDExLDAuMDY0MDMgLTAuMDg0NDEsMC42MTYxMTk0IC0wLjE2MzEzOSwxLjIyNjg2NTcgLTAuMDc4NzMsMC42MTA3NDYzIC0wLjE1NTA4NCwxLjE1NjAxMzcgLTAuMTY5NjgzLDEuMjExNzA1OSAtMC4wMjM5NCwwLjA5MTMyOSAtMC4wNjUxOCwwLjExNDQ0MDYgLTAuNDIwNTc0LDAuMjM1NzAyOSBDIDkuNDY0Mjg1LDcuMDMzMTE5OCA4Ljc5MDAyODcsNy40MzcxODcgOC4yMDI5ODUxLDcuOTkwNDEzMSBMIDguMDIzODgwNiw4LjE1OTIwMDEgNi45MzEzNDMzLDcuNzA0NjM4MyBDIDYuMzMwNDQ3OCw3LjQ1NDYyOTMgNS43NzEwOTIzLDcuMjIzMTM3OCA1LjY4ODMzMTMsNy4xOTAyMTMgTCA1LjUzNzg1NjcsNy4xMzAzNDk5IDUuMDQ1NDk5MSw3Ljk5MzM2NDggYyAtMC40MjExNDEsMC43MzgxODQ4IC0wLjQ4NDQ2NTMsMC44Njg4Njc3IC0wLjQzNzc5NDksMC45MDM0ODE0IDIuMDUzODI5NywxLjUyMzI1MTggMi4wNzg3MDQ0LDEuNTQyOTY5OCAyLjA2MjAzMDUsMS42MzQ0OTY4IC0wLjAwODk3LDAuMDQ5MjUgLTAuMDQ2NDY4LDAuMjE4NTA4IC0wLjA4MzMyMywwLjM3NjEyIC0wLjA1NTQzMywwLjIzNzA2MSAtMC4wNjY4MjYsMC40Mjg4OTggLTAuMDY1OTUyLDEuMTEwNDQ3IDkuMzg1ZS00LDAuNzMwMTIxIDAuMDEwMTA5LDAuODU5ODcyIDAuMDgwNTk3LDEuMTQwMTQyIDAuMDQzNzQ3LDAuMTczOTQ0IDAuMDc5NTQsMC4zMzAyNjEgMC4wNzk1NCwwLjM0NzM3MiAwLDAuMDE3MTEgLTAuNDYzNDMyOCwwLjM4MDUxIC0xLjAyOTg1MDcsMC44MDc1NTQgLTAuNTY2NDE3OSwwLjQyNzA0NCAtMS4wNDQ0MTYsMC43ODk4MjkgLTEuMDYyMjE4LDAuODA2MTkgLTAuMDE4NiwwLjAxNzA5IDAuMTc2MzA2LDAuMzk1NTEyIDAuNDU4MjE3MywwLjg4OTY1MiAwLjQ2MjM0MDEsMC44MTA0IDAuNDk1Mjk0MywwLjg1ODExNyAwLjU3MjM4NjIsMC44Mjg4MDYgMC4wNDQ5OTEsLTAuMDE3MTEgMC41OTk1ODM0LC0wLjI1MTMzOSAxLjIzMjQyOCwtMC41MjA1MiBsIDEuMTUwNjI2NiwtMC40ODk0MTkgMC4zMjczODQsMC4yODg5MzIgYyAwLjU4MTg3MzIsMC41MTM1MzIgMS4yODE1ODQ2LDAuOTE3MjQgMS45Njc4MzY5LDEuMTM1MzY5IDAuMTY4MDY4LDAuMDUzNDIgMC4zMTkzMTQsMC4xMDkwMTYgMC4zMzYxMDMsMC4xMjM1NDMgMC4wMjM5OSwwLjAyMDc2IDAuMzQxODYzLDIuNDIwNTg5IDAuMzQ0ODYxLDIuNjAzNTczIDUuNjllLTQsMC4wMzQ3NCAwLjIyNTI3OCwwLjA0NDc4IDEuMDAyMDk2LDAuMDQ0NzggaCAxLjAwMTM2MSB6IgogICAgIGlkPSJwYXRoMzA2IgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDQwLDAsMCw0MCwwLC05NjApIiAvPgogIDxwYXRoCiAgICAgc3R5bGU9ImZpbGw6IzgwMDA4MDtzdHJva2Utd2lkdGg6MC41MjM2NzMiCiAgICAgZD0iTSAxMS40MzI1ODgsMTUuNDM5MzgxIEMgMTAuNzAwNzUxLDE1LjMwNjkxOSAxMC4wNzIzMywxNC45NjUwOTkgOS41NDQ0Mjc2LDE0LjQxMjM0MyA5LjExMTg1MzQsMTMuOTU5NDA0IDguODc4MTIwMSwxMy41NjM0NDQgOC42OTc0NDExLDEyLjk3NzQ5MiA4LjYwNjczNjUsMTIuNjgzMzMyIDguNjAwMzcwNCwxMi42MTkyMjYgOC42MDAzNzA0LDEyIGMgMCwtMC42MTkxMTcgMC4wMDYzOCwtMC42ODMzNjkgMC4wOTcwMDMsLTAuOTc3MjYgMC4xOTExMzQyLC0wLjYxOTgzIDAuNDc5NDQxMiwtMS4wODUwMDYyIDAuOTYxOTIxLC0xLjU1MjAzNTQgMC42MTk5MzM2LC0wLjYwMDA4MTggMS4zMDkzNzc2LC0wLjg5NTMxNDkgMi4xODI5NzA2LC0wLjkzNDc5MDcgMC45Nzg3OSwtMC4wNDQyMyAxLjcyODYwNSwwLjE5OTIzODIgMi40MzU5ODUsMC43OTA5NzM2IDAuNzYzOTA3LDAuNjM5MDIxIDEuMTk3MjU3LDEuNTEwODE4NSAxLjIzOTcxMywyLjQ5NDAwODUgMC4wMjI2OCwwLjUyNTIxMSAtMC4wMjAzLDAuODUxNTk5IC0wLjE3MjEyOSwxLjMwNzE1MSAtMC4zNTEzNjksMS4wNTQyNTcgLTEuMzA2NTQ5LDEuOTU0MTM3IC0yLjM3ODY3LDIuMjQwOTU3IC0wLjMyMDU3MiwwLjA4NTc2IC0xLjIyMTM0NiwwLjEyNzA3MSAtMS41MzQ1NzYsMC4wNzAzOCB6IG0gMS4yNzMyMjgsLTIuMDcwMjk1IGMgMC4zMDY0NTMsLTAuMTUwODY2IDAuNjMzMjQ2LC0wLjQ5MzA2MyAwLjc0OTI3NywtMC43ODQ1OTUgMC4wNjgyLC0wLjE3MTM1NyAwLjA4MjkzLC0wLjI3NTE4NCAwLjA4MjkzLC0wLjU4NDQ5MSAwLC0wLjMwOTMwNyAtMC4wMTQ3MywtMC40MTMxMzQgLTAuMDgyOTMsLTAuNTg0NDkxIC0wLjExNjI2OCwtMC4yOTIxMjcgLTAuNDQyNzczLC0wLjYzMzcwNCAtMC43NTA1OTgsLTAuNzg1MjQ1IC0wLjIyNjM2MywtMC4xMTE0MzkgLTAuMjU2NCwtMC4xMTY4MzEgLTAuNjUwNzY0LC0wLjExNjgzMSAtMC4zOTYwMzIsMCAtMC40MjM2NDMsMC4wMDUgLTAuNjU1NTQ2LDAuMTE5MTg1IC0wLjMxMTY5OSwwLjE1MzQ0OSAtMC41NzY2ODUsMC40MTg3MTIgLTAuNzE5NjQxLDAuNzIwMzk0IC0wLjEwNDU0MywwLjIyMDYyIC0wLjExMTM4LDAuMjYwMzMzIC0wLjExMTM4LDAuNjQ2OTg4IDAsMC4zNzIwOTQgMC4wMDkzLDAuNDMxNzgxIDAuMDk2MTQsMC42MTcwNjEgMC4xMjgxNjYsMC4yNzM0NTkgMC4yODY4MywwLjQ2NDcwOCAwLjUxNzExLDAuNjIzMzA4IDAuMzA2OTI2LDAuMjExMzg4IDAuNTEwNjk0LDAuMjY3Mzc4IDAuOTI5MTI2LDAuMjU1Mjk4IDAuMzIyNTM5LC0wLjAwOTMgMC4zODUwMDUsLTAuMDIyNTcgMC41OTYyNzksLTAuMTI2NTgxIHoiCiAgICAgaWQ9InBhdGgzMDgiCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoNDAsMCwwLDQwLDAsLTk2MCkiIC8+Cjwvc3ZnPgo=';


/* skadi/js/common/geometry.js */

class SkadiGeometry {

    constructor() {
    }

    get_corner_points(x,y,corners,r,smoothing) {
        smoothing = 0.1;
        let points = this.compute_polygon_points(x,y,corners,r);
        if (!smoothing) {
            return this.compute_standard_path(points);
        } else {
            return this.compute_smoothed_path(points,smoothing);
        }
    }

    compute_polygon_points(x,y,corners,r) {
        let points = [];

        let step = (Math.PI*2)/corners;

        let theta = 0;
        let dist = r;
        if (corners == 3) {
            dist *= 1.4;
        }
        if (corners == 4) {
            dist *= 1.2;
            theta -= step/2;
        }

        for(let i=0; i<corners; i++) {
            let px = x+dist*Math.sin(theta);
            let py = y-dist*Math.cos(theta);
            theta += step;
            points.push([px,py]);
        }
        return points;
    }

    compute_smoothed_path(points,smoothing) {
        let s = '';
        let segments = [];
        for(let idx=0; idx<points.length;idx++) {
            let c = points[idx];
            let p = null;
            if (idx == 0) {
                s += "M ";
                s += c[0] + "," + c[1];
                p = points[points.length-1];
            } else {
                p = points[idx-1];
            }

            let f0 = smoothing;
            let f1 = 1.0 - smoothing;

            let p1x = c[0]*f0+p[0]*f1;
            let p1y = c[1]*f0+p[1]*f1;

            let p2x = c[0]*f1+p[0]*f0;
            let p2y = c[1]*f1+p[1]*f0;

            segments.push([p1x,p1y,p2x,p2y]);
        }

        for(let idx=0; idx<points.length;idx++) {
            let c = points[idx];
            let s0 = segments[idx];

            let s1 = segments[(idx+1) % segments.length];


            if (idx == 0) {
                s += " M " + s0[0] + "," + s0[1];
            }
            s += " L " + s0[2] + "," + s0[3];
            s += " Q " + c[0] + "," + c[1] + " " + s1[0]+","+s1[1];
        }
        s += " Z";
        return s;
    }

    compute_standard_path(points) {
        let sep = '';
        let s = '';
        let action = "M";
        for(let idx=0; idx<points.length; idx++) {
            s += action;
            let p = points[idx];
            let x = p[0];
            let y = p[1];
            s += sep;
            sep = ' ';
            s += x+" "+y;
            action = "L";
        }
        s += " Z";
        return s;
    }

    compute_sector_path(ox,oy,r1,r2,theta1,theta2) {
        let s = "M"+(ox+r2*Math.cos(theta1))+","+(oy+r2*Math.sin(theta1))+" ";
        let x = 0;
        if ((theta2-theta1) > Math.PI) {
            x = 1;
        }
        s += "A"+r2+","+r2+","+"0,"+x+",1,"+(ox+r2*Math.cos(theta2))+","+(oy+r2*Math.sin(theta2))+" ";
        s += "L"+(ox+r1*Math.cos(theta2))+","+(oy+r1*Math.sin(theta2))+" ";
        s += "A"+r1+","+r1+","+"0,"+x+",0,"+(ox+r1*Math.cos(theta1))+","+(oy+r1*Math.sin(theta1))+" ";
        s += "z";
        return s;
    }

    compute_triangle_path(cx,cy,angle,radius) {
        let ax1 = cx + radius*Math.cos(angle);
        let ay1 = cy + radius*Math.sin(angle);
        let ax2 = cx + radius*Math.cos(angle-Math.PI*2/3);
        let ay2 = cy + radius*Math.sin(angle-Math.PI*2/3);
        let ax3 = cx + radius*Math.cos(angle+Math.PI*2/3);
        let ay3 = cy + radius*Math.sin(angle+Math.PI*2/3);
        return "M"+ax1+","+ay1 + " L"+ax2+","+ay2+ " L"+ax3+","+ay3+" z";
    }
}

/* skadi/js/common/palette.js */


class SkadiPalette {

  constructor(design, id, closecb) {
    this.design = design;
    this.allitems = [];
    let nodeTypes = this.design.get_schema().get_node_types();
    for (let idx in nodeTypes) {
      let tid = nodeTypes[idx];
      let type = this.design.get_schema().get_node_type(tid);
      let entry = new SkadiPaletteEntry(design, type);
      this.allitems.push(entry);
    }
    this.id = id;
    this.closecb = closecb;
    this.width = 550;
  }

  open() {
    let x = 100;
    let y = 200;
    this.dial = new SkadiPaletteDialogue("node_palette", this.design, "Palette", x, y, 500, 500, this.closecb, function(){},true, false, true);

    for(let idx=0; idx<this.allitems.length; idx++) {
      this.dial.add(this.allitems[idx]);
    }
    this.dial.open();
    this.dial.flow();
  }
}

/* skadi/js/common/palette_entry.js */

class SkadiPaletteEntry {

  constructor(design, template) {
    this.design = design;
    this.template = template;
    this.node = null;
    this.overlay_node = null;
    this.overlay_grp = null;
    this.overlay_x = 0;
    this.overlay_y = 0;
    this.width = 220;
    this.height = 180;
  }

  update_position(x,y) {
    this.node.update_position(x, y);
  }

  update_size(w,h) {
  }

  get_position(w,h) {
    return this.node.get_position();
  }

  get_size(w,h) {
    return {"width":this.width, "height":this.height};
  }

  draw(grp) {
    this.node = new SkadiNode(this.design, this.template, this.design.next_id("nl"), 0, 0, false, this.template.metadata);
    this.node.draw(grp);
    let that = this;
    this.overlay_grp = this.design.get_skadi_svg_dialogue_group();
    this.node.set_drag_handlers(
      function(evloc) {
        that.overlay_x = evloc.x;
        that.overlay_y = evloc.y;
        let meta = JSON.parse(JSON.stringify(that.template.metadata));
        that.overlay_node = new SkadiNode(that.design, that.template, that.design.next_id("nl"), that.overlay_x, that.overlay_y, false, meta);
        that.overlay_node.set_display_tooltips(false);
        that.overlay_node.draw(that.overlay_grp);
      },
      function(evloc) {
        that.overlay_x = evloc.x;
        that.overlay_y = evloc.y;
        that.overlay_node.update_position(that.overlay_x, that.overlay_y);
      },
      function() {
        if (that.overlay_node) {
          that.overlay_node.remove();
          that.overlay_node = null;

          let tx = that.overlay_x - that.design.offset_x;
          let ty = that.overlay_y - that.design.offset_y;
          let cc = that.design.to_canvas_coords(tx,ty);
          that.design.create_node(null,that.template, cc.x, cc.y,that.template.metadata);
        }
      });
    
    return {};
  }

  remove() {
    if (this.node) {
      this.node.remove();
      this.node = null;
    }
  }

  get_package_id() {
    if (this.template) {
      return this.template.get_package_id();
    }
    return "";
  }

  get_label() {
    if (this.template) {
      return this.template.get_label();
    }
    return "";
  }

  get_group() {
    return this.node.get_group();
  }
}




/* skadi/js/common/scrollbar.js */

class SkadiScrollbar {
  constructor(x,y,width,height,fraction_start,fraction_coverage,onslide) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fraction_start = fraction_start;
    this.fraction_coverage = fraction_coverage;
    this.onslide = onslide;
    this.fill = "grey";
    this.compute_position();
    this.dragging = false;
  }

  compute_position() {
     this.slider_y = this.y-this.height/2 + this.height * this.fraction_start;
     this.slider_height = this.height * this.fraction_coverage;  
  }

  draw(grp) {
    
    this.grp = grp.append("g").attr("class","scrollbar_group");

    this.rect = this.grp.append("rect")
        .attr("x",this.x-this.width/2)
        .attr("y",this.y-this.height/2)
        .attr("width",this.width)
        .attr("height",this.height)
        .attr("class","scrollbar");
    
    if (this.fill != null) {
        this.rect.attr("fill",this.fill);
    }

    this.slider = this.grp.append("rect")
        .attr("x",this.x-this.width/2)
        .attr("y",this.slider_y)
        .attr("width",this.width)
        .attr("height",this.slider_height)
        .attr("class","scrollbar_slider")
        .attr("fill","blue");

    let drag = Skadi.x3.drag();
    drag
      .on("start", function() {
      })
      .on("drag", function(x,y) {
        that.drag_move(y);
      })
      .on("end", function(x,y) {
        that.end_drag_move(y);
      });

    this.slider.call(drag);

    let that = this;

  }

  drag_move(y) {
    if (!this.dragging) {
      this.starty = y;
      this.start_frac = this.fraction_start;
      this.dragging = true;
    } else {
      let dy = y - this.starty;
      let start_frac = this.start_frac + (dy/this.height);
      this.set_fractions(start_frac, this.fraction_coverage);
      if (this.onslide) {
        this.onslide(this.fraction_start,this.fraction_coverage);
      }
    }
  }

  end_drag_move(y) {
    if (this.dragging) {
      this.dragging = false;
      let dy = y - this.starty;
      let start_frac = this.start_frac + (dy/this.height);
      this.set_fractions(start_frac, this.fraction_coverage);
      if (this.onslide) {
        this.onslide(this.fraction_start,this.fraction_coverage);
      }
    }
  }

  set_fill(fill) {
    this.fill = fill;
  }

  get_size() {
    return { "width":this.width, "height":this.height };
  }

  get_position() {
    return { "x":this.x, "y":this.y };
  }

  update_size(width,height) {
    if (width != null) {
      this.width = width;
    }
    if (height != null) {
      this.height = height;
    }
    this.adjust();
  }

  update_position(x,y) {
    if (x != null) {
     this.x = x;
    }
    if (y != null) {
      this.y = y;
    }
    this.adjust();
  }

  adjust() {
    
    this.compute_position();

    if (this.rect) {
        this.rect.attr("x",this.x-this.width/2)
        .attr("y",this.y-this.height/2)
        .attr("width",this.width)
        .attr("height",this.height);
    }
    if (this.slider) {
        this.slider.attr("x",this.x-this.width/2)
        .attr("y",this.slider_y)
        .attr("width",this.width)
        .attr("height",this.slider_height);
    }
  }
  
  get_fraction_start() {
      return this.fraction_start;  
  }

  get_fraction_coverage() {
    return this.fraction_coverage;  
  }

  set_fractions(fraction_start,fraction_coverage) {
    if (this.fraction_coverage > 1.0) {
        this.fraction_coverage = 1.0;
    }
    this.fraction_start = fraction_start;
    this.fraction_coverage = fraction_coverage;
    if (this.fraction_start + this.fraction_coverage > 1.0) {
        this.fraction_start = 1.0 - this.fraction_coverage;
    }
    if (this.fraction_start < 0.0) {
        this.fraction_start = 0.0;
    }
    this.adjust();
  }
}

/* skadi/js/common/svg_dialogue.js */

class SkadiSvgDialogue {

  constructor(id, design, title, x, y, content_width, content_height, closeHandler, resize_handler, scrollable, autoClose, draggable, drawCallback) {
    this.design = design;
    this.title = title;

    this.closeHandler = closeHandler;
    this.resize_handler = resize_handler;
    this.drawCallback = drawCallback;

    this.id = id;
    this.x = x;
    this.y = y;
    this.header_sz = 40;
    this.footer_sz = 40;
    this.padding = 5;

    this.width = content_width + 2*this.padding;
    this.height = content_height + 2*this.padding + this.header_sz;
    if (this.resizebtn) {
      this.height += this.footer_sz;
    }

    this.startx = 0;
    this.starty = 0;
    this.ox = 0;
    this.oy = 0;

    this.dragging = false;
    this.removeOnClose = true;
    this.draggable = draggable;


    this.content_offset = 0;

    let that = this;
    this.closebtn = new SkadiButton(this.design, this.width - this.header_sz / 2, this.header_sz / 2, this.header_sz, this.header_sz, icon_close_purple, function () {
      that.close();
    });
    if (this.resize_handler) {
      this.resizebtn = new SkadiButton(this.design, this.x + this.width - this.footer_sz / 2, this.y + this.height - this.footer_sz / 2, this.footer_sz, this.footer_sz, icon_drag_indicator_purple, function () {
      });
    } else {
      this.resizebtn = null;
    }

    this.compute_content_size();

    if (scrollable) {
      this.scrollbar_width = 30;
      this.scrollbar = new SkadiScrollbar(this.width - (this.scrollbar_width + 10) / 2, this.height / 2 - this.padding, this.scrollbar_width, this.content_height, 0.0, 1.0, function (f1, f2) {
        that.scroll(f1, f2);
      });
    } else {
      this.scrollbar = null;
    }

    this.compute_content_size();

    this.autoClose = autoClose;
    this.connector_grp = null;
    this.connector_path = null;
    this.parent_node = null;
    this.movement_listener = null;
  }

  set_parent_node(node) {
    this.parent_node = node;
    let container = this.design.get_node_connector_group();

    this.connector_grp = container.append("g").attr("id", this.id).attr("class", "link");

    this.connector_path = this.connector_grp.append("path")
      .attr("id", this.id + "path")
      .attr("class", "dialog_connector");

    this.connector_path.attr("stroke", "gray");

    this.connector_pad = this.connector_grp.append("circle")
        .attr("r","10").attr("class","dialog_connector_pad");

    this.movement_listener = () => {
        this.update_connector();
    };
    this.parent_node.add_movement_listener(this.movement_listener);
    this.update_connector();

    this.design.add_design_event_handler("panzoom",this.movement_listener);
  }

  get_parent_node() {
    return this.parent_node;
  }

  update_connector() {

    if (this.connector_path) {

      let c = { "x":this.parent_node.x, "y": this.parent_node.y };
      let c2 = { "x":this.x + this.width/2, "y": this.y - this.design.offset_y };
      let c3 = this.design.to_canvas_coords(c2.x,c2.y);
      let c4 = { "x":this.x + this.width/2, "y": this.y-this.design.offset_y - 75 };
      let c5 = this.design.to_canvas_coords(c4.x,c4.y);

      const path =  "M"+c.x+","+c.y+" Q "+c5.x + " " + c5.y +", " + c3.x + " " + c3.y;

      this.connector_path.attr("d", path);
      this.connector_pad.attr("cx", c3.x);
      this.connector_pad.attr("cy", c3.y);
    }
  }

  get_size() {
    return {"width":this.width,"height":this.height};
  }

  set_content_size(content_width, content_height) {
    this.content_width = content_width;
    this.content_height = content_height;
    this.width = this.content_width + 2*this.padding;
    this.height = this.content_height + 2*this.padding + this.header_sz;
    if (this.resizebtn) {
      this.height += this.footer_sz;
    }
    this.apply_size(true);
  }

  compute_content_size() {
    this.content_width = this.width - 2*this.padding;
    this.content_height = this.height - 2*this.padding - this.header_sz;
    if (this.resizebtn) {
      this.content_height -= this.footer_sz;
    }
    if (this.content_height < 0) {
      this.content_height = 0;
    }
    if (this.scrollbar) {
      this.content_width -= this.scrollbar_width+10;
    }
    if (this.resize_handler) {
      this.content_depth = this.resize_handler(this.content_width, this.content_depth, false);
    }

    if (this.scrollbar) {
      let content_fraction = this.content_height/this.content_depth;
      if (content_fraction>1.0) {
        content_fraction = 1.0;
      }
      this.scrollbar.set_fractions(this.scrollbar.get_fraction_start(),content_fraction);
    }
  }

  scroll(fraction_start,fraction_coverage) {
    this.content_offset = -1 * this.content_depth * fraction_start;
    this.content_grp.attr("transform","translate(0,"+this.content_offset+")");
  }

  open() {

    let container = this.design.get_skadi_svg_dialogue_group();

    this.grp = container.append("g");

    this.clip = this.grp.append("clipPath").attr("id",this.id);
    this.clip_rect = this.clip.append("rect")
      .attr("x",this.padding)
      .attr("y",this.header_sz+this.padding)
      .attr("width",this.content_width)
      .attr("height",this.content_height);

    this.dial = this.grp.append("rect")
      .attr("x",0)
      .attr("y",0)
      .attr("rx",5)
      .attr("ry",5)
      .attr("width",this.width)
      .attr("height",this.height)
      .attr("class","svg_dialogue");

    this.title = this.grp.append("text").attr("x",this.padding).attr("y",this.header_sz/2)
      .attr("class","svg_dialogue_title")
      .attr("dominant-baseline","middle")
      .text(this.title);

    this.header = this.grp.append("rect")
      .attr("x",0)
      .attr("y",0)
      .attr("rx",5)
      .attr("ry",5)
      .attr("width",this.width)
      .attr("height",this.header_sz)
      .attr("class","svg_dialogue_header");

    this.content_clip = this.grp.append("g").attr("clip-path","url(#"+this.id+")");
    this.content_grp = this.content_clip.append("g");
    this.content_grp.ignore_mouse_events();

    this.divider1 = this.grp.append("line").attr("x1",0).attr("y1",this.header_sz).attr("x2",this.width).attr("y2",this.header_sz).attr("class","svg_dialogue_divider");
    if (this.resizebtn) {
      this.divider2 = this.grp.append("line").attr("x1",0).attr("y1",this.height-this.footer_sz).attr("x2",this.width).attr("y2",this.height-this.footer_sz).attr("class","svg_dialogue_divider");
    } else {
      this.divider2 = null;
    }

    let that = this;

    this.update();

    if (this.draggable) {
      let drag = Skadi.x3.drag();
      drag
          .on("start", function () {
          })
          .on("drag", function (x, y) {
            that.drag_move(x, y);
          })
          .on("end", function (x, y) {
            that.end_drag_move(x, y);
          });

      this.header.call(drag);
    }
    // this.dial.transition().duration(500).style("opacity", "0.8");

    this.closebtn.draw(this.grp);
    if (this.scrollbar) {
      this.scrollbar.draw(this.grp);
    }

    this.drawCallback(this.content_grp);

    if (this.resizebtn) {
      this.resizegrp = container.append("g");
      this.resizebtn.draw(this.resizegrp);

      let resize = Skadi.x3.drag();
      resize
        .on("start", function() {
        })
        .on("drag", function(x,y) {
          that.drag_resize(x, y);
        })
        .on("end", function(x,y) {
          that.end_drag_resize(x,y);
        });

      this.resizegrp.call(resize);
    } else {
      this.resizegrp = null;
    }

    this.opened = true;

    if (this.autoClose) {
      this.grp.node().onmouseleave = function() {
        that.close();
      }
    }
  }

  drag_move(x, y) {
    if (!this.dragging) {
      this.startx = x;
      this.starty = y;
      this.ox = this.x;
      this.oy = this.y;
      this.dragging = true;
    } else {
      let dx = x - this.startx;
      let dy = y - this.starty;
      this.update_position(this.ox + dx, this.oy + dy);
      this.update_connector();
    }
  }

  end_drag_move(x, y) {
    if (this.dragging) {
      this.dragging = false;
      let dx = x - this.startx;
      let dy = y - this.starty;
      this.update_position(this.ox + dx, this.oy + dy);
      this.update_connector();
    }
  }

  drag_resize(x, y) {
    if (!this.dragging) {
      this.startx = x;
      this.starty = y;
      this.ow = this.width;
      this.oh = this.height;
      this.dragging = true;
    } else {
      let dx = x - this.startx;
      let dy = y - this.starty;
      this.update_size(this.ow + dx, this.oh + dy, false);
    }
  }

  end_drag_resize(x, y) {
    if (this.dragging) {
      this.dragging = false;
      let dx = x - this.startx;
      let dy = y - this.starty;
      this.update_size(this.ow + dx, this.oh + dy, true);
    }
  }

  update_size(w,h,is_final) {
    this.width = w;
    this.height = h;

    this.compute_content_size();
    this.apply_size(is_final);
  }

  apply_size(is_final) {

    this.dial
      .attr("width",this.width)
      .attr("height",this.height);

    this.header
        .attr("width",this.width);

    this.clip_rect
    .attr("width",this.content_width)
    .attr("height",this.content_height);

    this.divider1
      .attr("x2",this.width);

    if (this.divider2) {
      this.divider2
        .attr("x2",this.width)
        .attr("y1",this.height-this.header_sz)
        .attr("y2",this.height-this.header_sz);
    }

    this.closebtn.update_position(this.width-this.header_sz/2,this.header_sz/2);
    if (this.resizebtn) {
      this.resizebtn.update_position(this.x+this.width-this.header_sz/2,this.y+this.height-this.header_sz/2);
    }
    if (this.resize_handler) {
      this.resize_handler(this.content_width,this.content_height,is_final);
    }
    if (this.scrollbar) {
      this.scrollbar.update_position(this.width-this.header_sz/2,this.height/2);
      this.scrollbar.update_size(this.header_sz*0.75,this.content_height);
    }
    this.update_connector();
  }

  close() {
    if (this.removeOnClose) {
      this.grp.remove();
      if (this.connector_grp) {
        this.connector_grp.remove();
        this.connector_grp = null;
      }
      if (this.resizegrp) {
        this.resizegrp.remove();
      }
      if (this.movement_listener) {
        this.parent_node.remove_movement_listener(this.movement_listener);
        this.design.remove_design_event_handler("panzoom",this.movement_listener);
        this.movement_listener = null;
      }
    }
    if (this.closeHandler) {
      this.closeHandler(this.dial);
    }
  }

  update_position(x, y) {
    this.x = x;
    this.y = y;
    this.update();
  }

  get_position() {
    return {
      "x": this.x,
      "y": this.y
    };
  }

  update() {
    let transform = "translate(" + this.x + "," + this.y + ")";
    this.grp
      .attr("transform", transform);
    if (this.resizebtn) {
      this.resizebtn.update_position(this.x+this.width-20,this.y+this.height-20);
    }
  }

  pack() {

  }
}


/* skadi/js/common/palette_dialogue.js */

class SkadiPaletteDialogue extends SkadiSvgDialogue {

  constructor(id, design, title, x, y, width, height, closeHandler, resize_handler, scrollable, autoClose, draggable) {
    super(id, design, title, x, y, width, height, closeHandler,
        function(width,height,is_final) {
          const depth = this.resize(width,height,is_final);
          if (resize_handler) {
            resize_handler(width,height,is_final);
          }
          return depth;
          }, scrollable, autoClose, draggable,
        function(grp) {
          this.draw(grp);
        })

    this.layout = "relative";
    this.entries = [];
    this.content_offset = 0;
  }

  resize(content_width,content_height,is_final) {
    this.flow();
    return 1000;
  }

  add(entry) {
    this.entries.push(entry);
  } 

  draw(grp) {
    for(let idx=0; idx<this.entries.length; idx++) {
      this.entries[idx].draw(grp);
    }
    this.flow();
  }

  /*
  pack(horizontal) {
    this.layout = "pack";
    if (horizontal) {
      let max_h = 0;
      
      for(let idx=0; idx<this.entries.length; idx++) {
        let sz = this.entries[idx].get_size();
        if (sz.height > max_h) {
          max_h = sz.height;
        }    
      }
      let h = this.header_sz+2*this.padding+max_h;
      if (h < this.min_height) {
        h = this.min_height;
      }
      let x_pos = this.padding;
      for(let idx=0; idx<this.entries.length; idx++) {
        let sz = this.entries[idx].get_size();
        this.entries[idx].update_position(x_pos+sz.width/2,this.header_sz+this.padding+max_h/2);
        x_pos += sz.width;
        x_pos += this.padding;
      }
      let w = x_pos+this.padding;
      if (w < this.min_width) {
        let shift = (this.min_width - w);
        w = this.min_width;
        for(let idx=0; idx<this.entries.length; idx++) {
          let sz = this.entries[idx].get_position();
          this.entries[idx].update_position(sz.x+shift,sz.y);
        }
      }
    } else { 
      let max_w = 0;
      for(let idx=0; idx<this.entries.length; idx++) {
        let sz = this.entries[idx].get_size();
        if (sz.width > max_w) {
          max_w = sz.width;
        }    
      }
      let w = 2*this.padding+max_w;
      if (w < this.min_width) {
        w = this.min_width;
      }
      let y_pos = this.header_sz + this.padding;
      for(let idx=0; idx<this.entries.length; idx++) {
        let sz = this.entries[idx].get_size();
        this.entries[idx].update_position(2*this.padding+w/2,y_pos+sz.height/2);
        this.entries[idx].update_size(max_w,null);
        y_pos += sz.height;
      }
      let h = y_pos+this.padding;
      if (this.scrollbar) {
        h = this.height;
        w += this.scrollbar_width;
      }
    }
    // don't reduce width as part of pack
    if (w < this.width) {
      w = this.width;
    }
    this.update_size(w,h);
  }
  */


  flow() {
      if (!this.entries) {
          return 0;
      }
    let xc = this.padding;
    let yc = 40 + this.padding;
    let row_height = 0;
    for(let idx=0; idx<this.entries.length; idx++) {
      let comp = this.entries[idx];
      let sz = comp.get_size();
      if (row_height != 0 && (sz.width + xc > this.content_width)) {
        // start new row
        xc = this.padding;
        yc += row_height;
        yc += this.padding;
        row_height = 0;
      }
      comp.update_position(xc+sz.width/2,yc+sz.height/2);
      xc += sz.width;
      xc += this.padding; 
      if (sz.height > row_height) {
        row_height = sz.height;
      }  
    }
  }
}


/* skadi/js/common/iframe_dialogue.js */

class SkadiFrameDialogue extends SkadiSvgDialogue {

  constructor(id, design, title, x, y, content_width, content_height, close_handler, can_resize, url, open_callback, resize_callback) {
    super(id, design, title, x, y, content_width, content_height, close_handler,
        function(width,height,is_final) {
          return this.resize(width,height,is_final);
          }, false, false, true,
        function(grp) {
          this.draw(grp);
        });
    this.design = design;
    this.title = title;
    this.url = url;
    this.open_callback = open_callback;
    this.resize_callback = resize_callback;
    this.open();
  }

  draw(grp) {
    this.fo = grp.append("foreignObject").attr("x",this.padding+"px").attr("y",(this.header_sz+this.padding)+"px").attr("width",this.content_width+"px").attr("height",this.content_height+"px");
    this.content = null;
    if (this.url) {
      this.content = this.fo.append("iframe").attr("class", "skadi_iframe").attr("src", this.url).attr("width", this.content_width + "px").attr("height", this.content_height + "px").attr("target","_new");
    } else {
      this.content = this.fo.append("div").attr("width", this.content_width + "px").attr("height", this.content_height + "px");
      if (this.open_callback) {
        this.open_callback(this.content.node());
      }
    }
  }

  resize(w,h,is_final) {
    if (this.fo) {
      this.fo.attr("width", w + "px").attr("height", h + "px");
      this.content.attr("width", w + "px").attr("height", h + "px");
    }
    if (is_final && this.resize_callback) {
      this.resize_callback(w,h);
    }
    return this.content_height;
  }
}



/* skadi/js/common/text_menu_dialogue.js */

class SkadiTextMenuDialogue extends SkadiSvgDialogue {

    constructor(design, items, closeHandler, owner, x, y) {
        super(owner.get_id() + "text_menu", design, "Menu", x, y, 100, 500, closeHandler, null, false, true, false,
            function (grp) {
                this.draw(grp);
            });
        this.design = design;
        this.font_size = 24;
        this.items = items;
        this.entries = [];

        for (let i = 0; i < this.items.length; i++) {
            let item = this.items[i];
            let cb = this.create_cb(item.get_handler());
            let t = new SkadiTextButton(this.font_size, item.get_label(), cb);
            t.set_class("menuitem");
            this.entries.push(t);
        }
    }

    draw(grp) {
        for(let i=0; i<this.entries.length; i++) {
            this.entries[i].draw(grp);
        }
        this.pack();
    }

    pack() {
        let max_w = 0;
        let sum_h = 0;
        let w = this.width;
        for (let idx = 0; idx < this.entries.length; idx++) {
            let sz = this.entries[idx].get_size();
            if (sz.width > max_w) {
                max_w = sz.width;
            }
            sum_h += sz.height;
        }
        let y_pos = this.header_sz + this.padding;
        for (let idx = 0; idx < this.entries.length; idx++) {
            let sz = this.entries[idx].get_size();
            this.entries[idx].update_position(this.padding + max_w / 2, y_pos + sz.height / 2);
            this.entries[idx].update_size(max_w, null);
            y_pos += sz.height;
        }
        this.set_content_size(max_w, sum_h);
    }

    create_cb(handler) {
        let that = this;
        return function (e) {
            handler(e);
            that.remove();
        }
    }

    remove() {
        this.close();
    }
}

SkadiTextMenuDialogue.MenuItem = class {

    constructor(label, handler) {
        this.label = label;
        this.handler = handler;
    }

    get_label() {
        return this.label;
    }

    get_handler() {
        return this.handler;
    }
}

/* skadi/js/common/tooltip.js */

class SkadiTooltip {

    constructor(target,parent,text) {
        this.target = target;
        this.parent = parent;
        this.content = text;
        this.svg_ns = "http://www.w3.org/2000/svg";
        this.tip = document.createElementNS(this.svg_ns,"g");
        this.tip.setAttributeNS(null,"class","tooltip");
        this.tip.setAttributeNS(null,"visibility","hidden");

        this.background = document.createElementNS(this.svg_ns,"rect");
        
        this.background.setAttributeNS(null,"x",0);
        this.background.setAttributeNS(null,"y",0);
        this.background.setAttributeNS(null,"width",100);
        this.background.setAttributeNS(null,"height",100);
        
        
        this.text = document.createElementNS(this.svg_ns,"text");
        this.text.setAttributeNS(null,"x",5);
        this.text.setAttributeNS(null,"y",5);
        this.text.appendChild(document.createTextNode(text));

        this.tip.appendChild(this.background);
        this.tip.appendChild(this.text);
        this.parent.appendChild(this.tip);
        
        let that = this;
        that.target.addEventListener("mouseover",function(evt) {
            that.show(evt);
        });
        that.target.addEventListener("mousemove",function(evt) {
            that.move(evt);
        });
        that.target.addEventListener("mouseout",function(evt) {
            that.hide();
        });
    }

    update_text(content) {
        this.content = content;
        while(this.text.firstChild) {
            this.text.firstChild.remove();
        }
        this.text.appendChild(document.createTextNode(content));
    }

    show(evt) {
        if (!this.content) {
            return;
        }
        let x = evt.clientX;
        let y = evt.clientY;
        this.tip.setAttributeNS(null,"visibility","visible");
        this.tip.setAttributeNS(null,"transform","translate("+(x+10)+" "+(y+10)+")");
        let bb = this.text.getBBox();
        this.background.setAttributeNS(null,"width",bb.width+10);
        this.background.setAttributeNS(null,"height",bb.height+10);
    }

    move(evt) {
        let x = evt.clientX;
        let y = evt.clientY;
        this.tip.setAttributeNS(null,"transform","translate("+(x+10)+" "+(y+10)+")");
    }

    hide() {
        this.tip.setAttributeNS(null,"visibility","hidden");
    }
    
    remove() {
        this.tip.remove();
    }
}

/* skadi/js/common/x3.js */

var Skadi = Skadi || {};

class SkadiX3Drag {

  constructor() {
    this.callbacks = {};
    this.elt = null;
    this.drag_overlay = document.getElementById("drag_overlay");
    this.start_time = null;
    this.start_pos = null;
  }

  set_element(elt) {
    this.elt = elt;
    let that = this;
    this.elt.onmousedown = function(evt) {
      that.start(evt);
    }
  }

  on(event,callback) {
    this.callbacks[event] = callback;
    return this;
  }

  start(evt) {
    let that = this;
    this.start_time = Date.now();
    evt.stopPropagation();

    document.onmousemove = function(evt) {
      that.initial_move(evt);
    }

    document.onmouseup = function(evt) {
      that.initial_mouseup(evt);
    }

    let pos = Skadi.x3.get_event_xy(evt);
    this.start_pos = pos;
  }

  initial_move(evt) {
    document.onmousemove = null;
    document.onmouseup = null;
    this.enable_drag_overlay();
  }

  initial_mouseup(evt) {
    document.onmousemove = null;
    document.onmouseup = null;
  }

  enable_drag_overlay() {
    let that = this;
    this.drag_overlay.style = "pointer-events:all;";
    this.drag_overlay.setAttribute("width",2000);
    this.drag_overlay.setAttribute("height", 2000);

    this.drag_overlay.onmousemove = function(evt) {
      that.move(evt);
    }
    this.drag_overlay.onmouseup = function(evt) {
      that.end(evt);
    }
    this.drag_overlay_enabled = true;
  }

  start_cb() {
    if ("start" in this.callbacks) {
      this.callbacks["start"](this.start_pos.x,this.start_pos.y);
    }
    if ("start_abs" in this.callbacks) {
      this.callbacks["start_abs"](this.start_pos.ax,this.start_pos.ay);
    }
  }

  move(evt) {
    let elapsed_ms = Date.now() - this.start_time;
    if (elapsed_ms < 200) {
      return;
    }
    if (this.start_pos) {
      this.start_cb();
      this.start_pos = null;
    }
    evt.preventDefault();
    evt.stopPropagation();
    let pos = Skadi.x3.get_event_xy(evt);
    if ("drag" in this.callbacks) {
      this.callbacks["drag"](pos.x,pos.y);
    }
    if ("drag_abs" in this.callbacks) {
      this.callbacks["drag_abs"](pos.ax,pos.ay);
    }
  }

  end(evt) {
    let elapsed_ms = Date.now() - this.start_time;
    if (elapsed_ms < 200) {
      // ignore drag end, this event should be followed by a click
    } else {
      if (this.start_pos) {
        this.start_cb();
        this.start_pos = null;
      }
      let pos = Skadi.x3.get_event_xy(evt);
      evt.preventDefault();
      evt.stopPropagation();
      if ("end" in this.callbacks) {
        this.callbacks["end"](pos.x, pos.y);
      }
      if ("end_abs" in this.callbacks) {
        this.callbacks["end_abs"](pos.ax, pos.ay);
      }
    }
    this.drag_overlay.style = "pointer-events:none;";
    this.drag_overlay.setAttribute("width",0);
    this.drag_overlay.setAttribute("height", 0);
    this.drag_overlay.onmousemove = null;
    this.drag_overlay.onmouseup = null;
  }
}

class SkadiX3Selection {
  
  constructor(elts) {
    this.svg_xmlns = "http://www.w3.org/2000/svg";
    this.xlink_xmlns = "http://www.w3.org/1999/xlink";
    this.html_xmlns = "http://www.w3.org/1999/xhtml";
    this.elts = [];
    this.stylestr = "";

    for(let idx=0; idx<elts.length; idx++) {
      this.elts.push(elts[idx]);
    }
  }

  add_node(node) {
    this.elts.push(node);
  }

  remove() {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].remove();
    }
    this.elts = [];
    return this;
  }

  is_svg(tag) {
    return Skadi.x3.svg_tags.includes(tag);
  }

  append(tag) {
    let newSelection = new SkadiX3Selection([]);
    for(let idx=0; idx<this.elts.length; idx++) {
      let n;
      if (this.is_svg(tag)) {
        n = document.createElementNS(this.svg_xmlns,tag);
      } else {
        if (tag == "href") {
          n = document.createElementNS(this.xlink_xmlns,tag);
        } else {
          n = document.createElementNS(this.html_xmlns,tag);
        }
      }
      this.elts[idx].appendChild(n);
      newSelection.add_node(n);
    }
    return newSelection;
  }

  attr(name,value) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].setAttribute(name,value);
    }
    return this;
  }

  attr_ns(namespace, name,value) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].setAttributeNS(namespace, name,value);
    }
    return this;
  }

  text(txt) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].innerHTML = "";
      let tn = document.createTextNode(txt);
      this.elts[idx].appendChild(tn);
    }
    return this;
  }

  node() {
    if (this.elts) {
      return this.elts[0];
    } else {
      return null;
    }
  }

  style(name,value) {
    if (this.stylestr) {
      this.stylestr += " ";
    }
    this.stylestr += name;
    this.stylestr += ":";
    this.stylestr += value;
    this.stylestr += ";";

    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].setAttribute("style",this.stylestr);
    }
    return this;
  }

  call(drag) {
    if (this.elts.length == 1) {
      drag.set_element(this.elts[0]);
    } else {
      console.log("Unable to set up drag handler, not exactly 1 element in selection");
    }
  }

  on(event,callback) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].addEventListener(event,callback);
    }
    return this;
  }

  ignore_mouse_events() {
    ["mousemove"].forEach(event_type =>
        this.on(event_type, evt => {
            evt.stopPropagation();
            evt.preventDefault();
        }));
    }
}

class SkadiX3 {

  constructor() {
  }

  select(selector) {
    let elts = document.querySelectorAll(selector);
    return new SkadiX3Selection(elts);
  }

  get_node_pos(elt) {
    let body = this.select('body').node();

    let x = 0;
    let y = 0;

    while(elt != null && elt != body) {
      x += (elt.offsetLeft || elt.clientLeft);
      y += (elt.offsetTop || elt.clientTop);
      elt = (elt.offsetParent || elt.parentNode);
    }

    return { "x": x, "y": y };
  }

  get_event_xy(e) {
    let pos = {};
    pos.x = e.clientX;
    pos.y = e.clientY;
    pos.ax = pos.x + window.scrollX;
    pos.ay = pos.y + window.scrollY;
    return pos;
  }

}

Skadi.x3 = new SkadiX3();
Skadi.x3.drag = function() { return new SkadiX3Drag(); }

Skadi.x3.svg_tags = [
	"a",
	"altGlyph",
	"altGlyphDef",
	"altGlyphItem",
	"animate",
	"animateColor",
	"animateMotion",
	"animateTransform",
	"circle",
	"clipPath",
	"color-profile",
	"cursor",
	"defs",
	"desc",
	"ellipse",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence",
	"filter",
	"font",
	"font-face",
	"font-face-format",
	"font-face-name",
	"font-face-src",
	"font-face-uri",
	"foreignObject",
	"g",
	"glyph",
	"glyphRef",
	"hkern",
	"image",
	"line",
	"linearGradient",
	"marker",
	"mask",
	"metadata",
	"missing-glyph",
	"mpath",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"radialGradient",
	"rect",
	"script",
	"set",
	"stop",
	"style",
	"svg",
	"switch",
	"symbol",
	"text",
	"textPath",
	"title",
	"tref",
	"tspan",
	"use",
	"view",
	"vkern"
];



/* skadi/js/controls/button.js */

class SkadiButton {

  constructor(design, x,y,width,height,icon_url,onclick,tooltip) {
    this.design = design;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.icon_url = icon_url;
    this.button = null;
    this.onclick = onclick;
    this.fill = "";
    this.enabled = true;
    this.tooltip = tooltip;
  }

  set_fill(fill) {
      this.fill = fill;
  }

  set_url(url) {
    this.icon_url = url;
    if (this.button) {
        this.button.attr("href",this.icon_url);    
    }
  }

  enable() {
    this.enabled = true;
    this.set_opacity(1.0);
  }

  disable() {
    this.enabled = false;
    this.set_opacity(0.5);
  }

  set_visible(visible) {
      let visibility = "visible";
      if (!visible) {
          visibility = "hidden";
      }
    
    if (this.button) {
        this.button.attr("visibility",visibility);    
    }
    if (this.rect) {
        this.rect.attr("visibility",visibility);    
    }
  }

  set_opacity(opacity) {
    if (this.button) {
        this.button.attr("opacity",opacity);    
    }
    if (this.rect) {
        this.rect.attr("opacity",opacity);    
    }
}

  draw(grp) {
  
    if (this.fill) {
        this.rect = grp.append("rect")
            .attr("width",this.width)
            .attr("height",this.height)
            .attr("x",this.x-this.width/2)
            .attr("y",this.y-this.height/2)
            .attr("fill",this.fill);  
    }

    this.button = grp.append("image")
      .attr("width",this.width)
      .attr("height",this.height)
      .attr("x",this.x-this.width/2)
      .attr("y",this.y-this.height/2)
      .attr("href",this.icon_url);
    let that = this;
    let onclick = function() {
      if (that.enabled && that.onclick) {
        that.onclick();
      }
    }
    this.button.on("click", onclick);
    if (this.tooltip) {
        new SkadiTooltip(this.button.node(),this.design.get_svg_tooltip_group().node(),this.tooltip);
    }
  }

  get_size() {
    return { "width":this.width, "height":this.height };
  }

  get_position() {
    return { "x":this.x, "y":this.y };
  }

  update_position(x,y) {
      this.x = x;
      this.y = y;
      if (this.button) {
        this.button
            .attr("x",this.x-this.width/2)
            .attr("y",this.y-this.height/2);
      }
      if (this.rect) {
        this.rect
            .attr("x",this.x-this.width/2)
            .attr("y",this.y-this.height/2);
      }
  }
}


/* skadi/js/controls/text_button.js */

class SkadiTextButton {

    constructor(height, value, onclick) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = height;
        this.value = value;
        this.onclick = onclick;
        this.cls = "";
    }

    draw(grp) {

        this.grp = grp.append("g").attr("class", this.cls);

        this.rect = this.grp.append("rect")
            .attr("x", this.x - this.width/2)
            .attr("y", this.y - this.height/2)
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "text_control_area")
            .attr("fill", "none");

        this.text = this.grp.append("text")
            .attr("font-size", this.height * 0.8)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("x", this.x - this.width/2)
            .attr("y", this.y)
            .attr("class", "text_control")
            .text(this.value);

        if (this.width == 0) {
            let bb = this.text.node().getBBox();
            this.width = bb.width;
            let ox = this.x - this.width / 2;
            this.rect.attr("x", ox).attr("width", this.width);
            this.text.attr("x", ox);
        }

        if (this.onclick) {
            let handler = (e) => {
                this.rect.attr("class", "text_control_area_selected");
                window.setTimeout(() => {
                    this.rect.attr("class", "text_control_area");
                }, 500);
                this.onclick(e);
            };
            this.rect.node().onclick = handler;
            this.text.node().onclick = handler;
        }
    }

    set_class(cls) {
        this.cls = cls;
    }

    get_size() {
        return {"width": this.width, "height": this.height};
    }

    get_position() {
        return {"x": this.x, "y": this.y};
    }

    update_size(width, height) {
        if (width != null) {
            this.width = width;
        }
        if (height != null) {
            this.height = height;
        }
        this.adjust();
    }

    update_position(x, y) {
        if (x != null) {
            this.x = x;
        }
        if (y != null) {
            this.y = y;
        }
        this.adjust();
    }

    remove() {
        this.grp.remove();
    }

    adjust() {

        let ox = this.x - this.width / 2;
        if (this.rect) {
            this.rect.attr("x", ox)
                .attr("y", this.y - this.height / 2)
                .attr("width", this.width)
                .attr("height", this.height);
        }

        this.text.attr("x", ox).attr("y", this.y);
    }
}



/* skadi/js/graph/node.js */

class SkadiNode {

  constructor(design, node_type, id, x, y, active, metadata, properties) {
    this.design = design;
    this.node_type = node_type;
    this.metadata = metadata;
    this.node_service = null;
    this.wrapper = null;
    this.properties = properties;

    this.id = id;

    // coordinates on canvas
    this.x = x;
    this.y = y;

    this.r = 45; // radius of node

    this.port_distance = this.r * 1.5;
    this.port_link_spacing = 10;
    this.port_spacing_angle = Math.PI/6;
    if (!("rotation" in this.metadata)) {
      if (!active) {
        this.metadata.rotation = 0;
      } else {
        this.metadata.rotation = 0;
      }
    }
    
    this.text_area_spacing = 10;
    this.status_area_spacing = 10;

    this.selected = false;

    /* rounding on status area */
    this.rx = 5;
    this.ry = 5;

    if (this.node_type.style) {
      this.style = this.node_type.style;
    } else {
      this.style = "";
    }
    this.REMOVE_ACTION = "Remove";

    this.active = active;
    this.port_radius = 12;
    this.ports = {};
    this.inPortKeys = [];
    this.outPortKeys = [];

    this.clickHandler = null;

    this.menu_dial = null;

    this.status_message = "";
    this.status_state = "";
    this.status_content = null;
    this.status_content_rect = null;

    this.execution_state = SkadiApi.EXECUTION_STATE_EXECUTED;

    this.input_ports = [];
    this.output_ports = [];

    this.movement_listeners = [];

    for (let key in node_type.input_ports) {
      this.add_port(key, node_type.input_ports[key], true);
    }

    for (let key in node_type.output_ports) {
      this.add_port(key, node_type.output_ports[key], false);
    }

    this.corners = this.node_type.get_display().corners;
    this.tooltip = null;
    this.display_tooltips = true;

    this.commands = [];

    if (active) {
      this.register_command_window("adjust","Adjust...", (root_elt) => {
          this.open_adjust_editor(root_elt);
      }, null, 500, 500);
    }
  }

  get_rotation() {
    return this.metadata.rotation;
  }

  set_rotation(rotation) {
    this.metadata.rotation = rotation % 360;
  }
  
  get_rotationRadians() {
    return this.metadata.rotation * Math.PI / 180;
  }

  create_instance() {
    // unfortunately looks like eval is needed to construct ES6 class instances from the classname
    try {
      this.node_service = this.design.create_node_service(this);
      this.wrapper = this.node_service.wrapper;
      let node_factory = this.design.get_node_factory();
      if (node_factory) {
        let o = node_factory(this.node_service);
        this.wrapper.set_instance(o);
      } else {
        let classname = this.node_type.get_classname();
        let cls = eval(classname);
        let o = new cls(this.node_service);
        this.wrapper.set_instance(o);
      }
    } catch(e) {
      console.error(e);
      return false;
    }
    let window_height = this.node_type.get_page().window_height || 400;
    let window_width = this.node_type.get_page().window_width || 400;
    // make sure that when the node's window is opened, closed or resized, the instance will receive the events

    this.register_command_window("open", "Open...",
      (elt) => {
          let html_url = this.node_type.get_html_url();
          this.iframe = document.createElement("iframe");
          this.iframe.setAttribute("src",html_url);
          this.iframe.setAttribute("width",""+window_width-20);
          this.iframe.setAttribute("height",""+window_height-20);
          this.iframe.addEventListener("load", (evt) => {
            this.wrapper.open(this.iframe.contentWindow, window_width, window_width);
          });
          elt.appendChild(this.iframe);
      },
      () => {
          this.wrapper.close();
      }, window_width, window_height,
      (w,h) => {
          this.iframe.setAttribute("width",""+w-20);
          this.iframe.setAttribute("height",""+h-20);
          this.wrapper.resize(w,h);
      });

    this.register_command_window_tab("open_in_tab", "Open in Tab...",this.node_type.get_html_url(),
      (w) => {
        if (w) {
          let window_width = w.innerWidth;
          let window_height = w.innerHeight;
          console.log("Opening window");
          this.wrapper.open(w, window_width, window_height);
        }
      },
      () => {
          this.wrapper.close();
      },
      (w,h) => {
          this.wrapper.resize(w,h);
      });

    return true;
  }

  get_wrapper() {
    return this.wrapper;
  }

  register_command_window(command_name, command_label, open_callback, close_callback, window_width, window_height, resize_callback) {
    this.commands.push({"command_type":"open_window", "command_name":command_name, "command_label":command_label,
        "open_callback":open_callback, "close_callback": close_callback, "resize_callback": resize_callback,
        "window_width":window_width, "window_height":window_height});
  }

  register_command_window_url(command_name, command_label, command_url, window_width, window_height) {
    this.commands.push({"command_type":"open_window_url", "command_name":command_name, "command_label":command_label,
        "command_url": command_url,
        "window_width":window_width, "window_height":window_height});
  }

  register_command_window_tab(command_name, command_label, command_url, open_callback, close_callback, resize_callback) {
    this.commands.push({"command_type":"open_window_tab", "command_name":command_name, "command_label":command_label,
        "command_url": command_url,
        "open_callback":open_callback, "close_callback": close_callback, "resize_callback":resize_callback });
  }

  register_command_callback(command_name, command_label, command_callback) {
    this.commands.push({"command_type":"notify", "command_name":command_name, "command_label":command_label,
        "command_callback":command_callback });
  }

  unregister_command(command_name) {
    this.commands = this.commands.filter( d => d.command_name != command_name );
  }

  set_display_tooltips(display_tooltips) {
    this.display_tooltips = display_tooltips;
  }

  open_adjust_editor(root_elt) {
    let root = new SkadiX3Selection([root_elt]);
    let name_heading = root.append("h3");
    name_heading.text("Name");
    let name_input = root.append("input");
    name_input.attr("type","text");
    name_input.node().value = this.metadata["name"];
    let description_heading = root.append("h3");
    description_heading.text("Description");
    let description_input = root.append("textarea");
    description_input.node().value = this.metadata["description"];
    root.append("p");
    let rotate_button = root.append("input").attr("value","rotate").attr("type","button");

    let cb = (evt) => {
      let new_metadata = {
         "name": name_input.node().value,
         "description": description_input.node().value
      };
      this.design.update_metadata(this.id, new_metadata, false);
    };
    name_input.on("change", cb);
    description_input.on("change", cb);
    rotate_button.on("click",(evt) => {
      this.set_rotation(this.get_rotation()+45);
      this.update_position(this.x, this.y);
    });
  }

  add_port(key, port_type, is_input) {
    let port_id = this.id + ":" + key;

    let port = new SkadiPort(this.design, this, port_id, port_type, key, is_input);
    this.ports[key] = port;
    if (is_input) {
      this.inPortKeys.push(key);
      this.input_ports.push(key);
    } else {
      this.outPortKeys.push(key);
      this.output_ports.push(key);
    }
    return port;
  }

  get_input_ports() {
    return this.input_ports;
  }

  get_output_ports() {
    return this.output_ports;
  }

  get_group() {
    return this.grp;
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

  draw(parent) {
    let container = parent ? parent : this.design.get_node_group();
    let that = this;

    this.grp = container.append("g")
      .attr("class", "node")
      .attr("id", this.id);

    this.draw_port_zone(true);
    this.draw_port_zone(false);

    this.grp2 = this.grp.append("g");

    let geometry = new SkadiGeometry();

    if (this.corners > 2) {
      let outer_path = geometry.get_corner_points(this.x,this.y,this.corners,this.port_distance);
      
      this.outer = this.grp2.append("path")
        .attr("d", outer_path)
        .attr("class","outer");

      let path = geometry.get_corner_points(this.x,this.y,this.corners,this.r);
      this.inner = this.grp2.append("path")
        .attr("d", path)
        .attr("class","inner");
    } else {
      this.outer = this.grp2.append("circle")
        .attr("r", this.port_distance)
        .attr("cx",this.x)
        .attr("cy",this.y)
        .attr("class","outer");

      this.inner = this.grp2.append("circle")
        .attr("r", this.r)
        .attr("cx",this.x)
        .attr("cy",this.y)
        .attr("class","inner");
    }

    if (this.style) {
      this.inner.attr("style", this.style);
    }

    this.isize = 2 * this.r * Math.sin(Math.PI / 4);

    let icon_name = this.node_type.get_display().icon;
    if (icon_name) {
      this.image = this.grp2.append("image")
          .attr("href", this.design.get_schema().get_resource_url(this.node_type.get_package_id(),icon_name))
          .attr("x", this.x - this.isize / 2)
          .attr("y", this.y - this.isize / 2)
          .attr("width", this.isize)
          .attr("height", this.isize)
          .attr("class", "node_icon");
    } else {
      this.image = null;
    }


    this.text = this.grp.append("text");
    this.text.attr("x", this.x).attr("y", this.y).attr("class","node_label").text(this.get_label());

    this.dragged = false;
    if (this.active) {
      this.drag = Skadi.x3.drag();
      this.drag
        .on("start_abs", function() {
          if (that.tooltip) {
            that.tooltip.hide();
          }
          that.dragged = false;
        })
        .on("drag_abs", function(x,y) {
          x = x-that.design.offset_x;
          y = y-that.design.offset_y;
          let cc = that.design.to_canvas_coords(x,y);
          if (!that.dragged) {
            that.design.start_node_drag(that.id, cc.x,cc.y);
          }
          that.dragged = true;
          that.update_position(cc.x,cc.y);
          that.design.update_node_position(that.id, cc.x,cc.y, true);
        })
        .on("end_abs", function(x,y) {
          x = x-that.design.offset_x;
          y = y-that.design.offset_y;
          let cc = that.design.to_canvas_coords(x,y);
          x = Math.round(cc.x/GRID_SNAP)*GRID_SNAP;
          y = Math.round(cc.y/GRID_SNAP)*GRID_SNAP;
          that.design.update_node_position(that.id, x,y, false);
          that.design.stop_node_drag(that.id);
        });
      this.grp2.call(this.drag);

      let chandler = function(e) {
        if (that.menu_dial) {
          return;
        }
        if (that.dragged) {
          that.dragged = false;
          return;
        }
        let mitems = [];

        for(let idx=0; idx<this.commands.length; idx++) {
          mitems.push(this.create_menu_item_from_command(this.commands[idx]));
        }
        mitems.push(new SkadiTextMenuDialogue.MenuItem(that.REMOVE_ACTION, function() {
          that.design.remove(that.get_id());
        }));

        let evloc = Skadi.x3.get_event_xy(e);
        let mx = evloc.x - 50;
        let my = evloc.y - 50;
        let tm = new SkadiTextMenuDialogue(that.design, mitems, function() { that.menu_dial = null; }, that, mx, my);
        tm.open();
      };

      this.set_click_handler(chandler);
    }

    for (let k in this.ports) {
      this.ports[k].draw(this.grp);
    }
    
    this.update_position(this.x, this.y);
    this.update_class();
    this.update_opacity();
    if (this.display_tooltips) {
      this.tooltip = new SkadiTooltip(this.grp.node(), this.design.get_svg_tooltip_group().node(), this.metadata.description || "");
    }
  }

  create_menu_item_from_command(command) {
    if (command["command_type"] == "open_window") {
      return new SkadiTextMenuDialogue.MenuItem(command["command_label"], (e) => {
        this.design.open_node_window(this.get_id(), command["command_name"], command["open_callback"], command["close_callback"],
            e.clientX,e.clientY, command["window_width"], command["window_height"], command["resize_callback"]);
      });
    } else if (command["command_type"] == "open_window_url") {
      return new SkadiTextMenuDialogue.MenuItem(command["command_label"], (e) => {
        this.design.open_node_window_url(this.get_id(), command["command_name"], null, command["command_url"],
            e.clientX,e.clientY, command["window_width"], command["window_height"]);
      });
    } else if (command["command_type"] == "open_window_tab") {
      return new SkadiTextMenuDialogue.MenuItem(command["command_label"], (e) => {
        this.design.open_node_windowTab(this.get_id(), command["command_name"], command["command_url"],
            command["open_callback"], command["close_callback"], command["resize_callback"]);
      });
    } else if (command["command_type"] == "notify") {
      return new SkadiTextMenuDialogue.MenuItem(command["command_label"], (e) => {
        command["command_callback"](this.id, command["command_name"]);
      });
    }
  }

  set_drag_handlers(start_drag_cb, drag_cb, end_drag_cb) {
    let that = this;
    let drag = Skadi.x3.drag();
    drag
      .on("start", function() {
        that.tooltip.hide();
        that.dragged = false;
      })
      .on("drag", function(x,y) {
        let evloc = {"x":x,"y":y};
        if (!that.dragged) {
          if (start_drag_cb) {
            start_drag_cb(evloc);
          }
        } else {
          if (drag_cb) {
            drag_cb(evloc);
          }
        }
        that.dragged = true;
      })
      .on("end", function() {
        if (end_drag_cb) {
          end_drag_cb();
        }
      });
    this.grp.call(drag);
  }

  update_class() {
    let cls = "outer";
    if (this.selected) {
      cls += " selected";
    } 
    this.outer.attr("class", cls)
  }

  get_id() {
    return this.id;
  }

  set_click_handler(handler) {
    this.clickHandler = handler;
    let that = this;
    if (this.clickHandler && this.grp) {
      let ch = function(evt) {
        that.call_click_handler(evt);
      }
      this.grp2.on("click", ch);
    }
  }

  update_metadata(new_metadata) {
    for(let key in new_metadata) {
      this.metadata[key] = new_metadata[key];
    }
    let label = "";
    if (this.metadata["name"]) {
      label = this.metadata["name"];
    }
    this.text.text(label);
    this.update_text();
    let description = "";
    if (this.metadata["description"]) {
      description = this.metadata["description"];
    }
    if (this.tooltip) {
      this.tooltip.update_text(description);
    }
  }

  set_opacity(opacity) {
    this.grp.attr("style", "opacity:" + opacity + ";");
  }

  update_opacity() {
    this.set_opacity(1.0);
  }

  call_click_handler(evt) {
    if (this.clickHandler) {
      this.clickHandler(evt);
    }
  }

  get_port(portKey) {
    return this.ports[portKey];
  }

  get_portIndex(portKey, inNotOut) {
    return inNotOut ? this.inPortKeys.indexOf(portKey) : this.outPortKeys.indexOf(portKey);
  }

  draw_port_zone(inNotOut) {
      let port_keys = (inNotOut ? this.inPortKeys : this.outPortKeys);
      let port_count = port_keys.length;
      if (port_count == 0) {
          return;
      }
      let bbox = this.grp.append("path")
          .attr("stroke","lightgray")
          .attr("stroke-width","3")
          .attr("opacity","0.3")
          .attr("fill","none");
      let arrow = this.grp.append("path")
            .attr("class", "port_zone_arrow");
      if (inNotOut) {
        this.port_zone_in = bbox;
        this.port_zone_arrow_in = arrow;
      } else {
        this.port_zone_out = bbox;
        this.port_zone_arrow_out = arrow;
      }
      this.update_port_zone(inNotOut);
  }

  update_port_zone(inNotOut) {
     let port_keys = (inNotOut ? this.inPortKeys : this.outPortKeys);
     let port_count = port_keys.length;
     if (port_count == 0) {
       return;
     }
     let zone_angle = port_count * this.port_spacing_angle;
     let base_angle = this.get_rotationRadians() + (inNotOut ? Math.PI : 0);
     let sg = new SkadiGeometry();
     let path = sg.compute_sector_path(this.x, this.y, this.port_distance+this.port_radius*1.5, this.port_distance - this.port_radius*1.5, base_angle-zone_angle/2,base_angle+zone_angle/2);

     let arrow_location_angle = base_angle - zone_angle/2 - this.port_spacing_angle/3;
     let ax = this.x + Math.cos(arrow_location_angle) * this.port_distance;
     let ay = this.y + Math.sin(arrow_location_angle) * this.port_distance;

     let arrow_path = sg.compute_triangle_path(ax,ay,this.get_rotationRadians(),this.port_radius/2);

     if (inNotOut) {
       this.port_zone_in.attr("d",path);
       this.port_zone_arrow_in.attr("d",arrow_path);
     } else {
       this.port_zone_out.attr("d",path);
       this.port_zone_arrow_out.attr("d",arrow_path);
     }
  }

  get_metadata() {
    return this.metadata;
  }

  get_portPosition(portKey, inNotOut) {
    let port_count = (inNotOut ? this.inPortKeys.length : this.outPortKeys.length);
    let index = this.get_portIndex(portKey, inNotOut);

    let offset = (index+0.5 - port_count*0.5);

    let angle = this.get_rotationRadians() + offset*this.port_spacing_angle + (inNotOut ? Math.PI: 0);

    let cx = this.x + Math.cos(angle) * this.port_distance;
    let cy = this.y + Math.sin(angle) * this.port_distance;

    return {
      "cx": cx,
      "cy": cy,
      "r": this.port_radius,
      "theta": angle
    };
  }

  get_portLinkPosition(portKey, len, inNotOut) {

    let pos = this.get_portPosition(portKey, inNotOut);

    let angle = pos.theta;

    let x0 = pos.cx + Math.cos(angle) * this.port_link_spacing;
    let y0 = pos.cy + Math.sin(angle) * this.port_link_spacing;

    let x1 = pos.cx + Math.cos(angle) * (this.port_link_spacing*2);
    let y1 = pos.cy + Math.sin(angle) * (this.port_link_spacing*2);

    // work out the control point
    let x2 = pos.cx + Math.cos(angle) * (this.port_link_spacing*4);;
    let y2 = pos.cy + Math.sin(angle) * (this.port_link_spacing*4);;

    return {
      /* port center */
      "x": x0,
      "y": y0,
      /* link coordinate feeding port */
      "x1": x1,
      "y1": y1,
      /* quadratic control point */
      "x2": x2,
      "y2": y2,
    };
  }

  update_position(x, y, refocus) {
    this.isize = 2 * this.r * Math.sin(Math.PI / 4);
    this.x = x;
    this.y = y;
    let geometry = new SkadiGeometry();
    if (this.corners < 3) {
      this.outer.attr("cx",x).attr("cy",y);
      this.inner.attr("cx",x).attr("cy",y);
    } else {
      this.outer.attr("d", geometry.get_corner_points(x,y,this.corners,this.port_distance));
      this.inner.attr("d", geometry.get_corner_points(x,y,this.corners,this.r));     
    }

    if (this.image) {
      this.image.attr("width", this.isize)
      this.image.attr("height", this.isize);
      this.image.attr("x", x - this.isize / 2);
      this.image.attr("y", y - this.isize / 2);
    }

    this.update_port_zone(true);
    this.update_port_zone(false);

    this.update_text();
    this.update_statusArea();
    for (let k in this.ports) {
      this.ports[k].update_position(refocus);
    }
    this.movement_listeners.forEach(listener => listener());
  }

  add_movement_listener(listener) {
    this.movement_listeners.push(listener);
  }

  remove_movement_listener(listener) {
    this.movement_listeners = this.movement_listeners.filter(l => l != listener);
  }

  update_status(status_message,status_state) {
    this.status_message = status_message;
    this.status_state = status_state
    this.clear_status_area();
    if (this.status_message || this.status_state) {
      let status_icon_url = null;
      switch(status_state) {
        case SkadiApi.STATUS_STATE_INFO:
          status_icon_url = icon_status_info;
          break;
        case SkadiApi.STATUS_STATE_WARNING:
          status_icon_url = icon_status_warning;
          break;
        case SkadiApi.STATUS_STATE_ERROR:
          status_icon_url = icon_status_error;
          break;
      }
      if (status_icon_url) {
        this.status_icon = this.grp.append("image").attr("width",32).attr("href",status_icon_url);
      }
      if (this.status_message || this.status_state) {
        let background_class = "status_area_background";
        this.status_content_rect = this.grp.append("rect").attr("class", background_class).attr("rx", this.rx).attr("ry", this.ry).attr("x", this.x).attr("y", this.y);
      }
      if (this.status_message) {
        if (this.status_message.startsWith("<svg")) {
          let data_uri = this.node_service.create_data_uri(this.status_message,"image/svg+xml");
          this.status_content = this.grp.append("image").attr("width", 64).attr("height",64).attr("x", this.x).attr("y", this.y).attr("class", "status_image").attr("href",data_uri);
        } else {
          this.status_content = this.grp.append("text").attr("x", this.x).attr("y", this.y).attr("class", "status_text").text(this.status_message);
        }
      }
      this.update_statusArea();
    }
  }

  get_satellite_position(is_status, width, height) {
      let r = 0;
      if (is_status) {
         r = this.get_rotationRadians() + Math.PI/2;
      } else {
         r = this.get_rotationRadians() - Math.PI/2;
      }
      let d = (this.r + (is_status ? this.status_area_spacing : this.text_area_spacing));
      let ax = this.x + Math.cos(r) * d;
      let ay = this.y + Math.sin(r) * d;
      let x = this.x;
      let y = this.y;

      let rotation = this.get_rotation();

      if (rotation == 0) {
        // facing east
        x = ax - width / 2;
        if (is_status) {
          y = ay;
        } else {
          y = ay - height;
        }
      } else if (rotation < 90) {
        // facing southeast
        if (is_status) {
          x = ax-width;
          y = ay;
        } else {
          x = ax;
          y = ay-height;
        }
      } else if (rotation == 90) {
        // facing south
        y = ay - height/2;
        if (is_status) {
          x = ax - width;
        } else {
          x = ax;
        }
      } else if (rotation <180) {
        // facing southwest
        if (is_status) {
          x = ax - width;
          y = ay - height;
        } else {
          x = ax;
          y = ay;
        }
      } else if (rotation == 180) {
        // facing west
        x = ax - width/2;
        if (is_status) {
          y = ay - height;
        } else {
          y = ay;
        }
      } else if (rotation < 270) {
        // facing northwest
        if (!is_status) {
          x = ax-width;
          y = ay;
        } else {
          x = ax;
          y = ay-height;
        }
      } else if (rotation == 270) {
        // facing north
        y = ay - height/2;
        if (!is_status) {
          x = ax - width;
        } else {
          x = ax;
        }
      } else {
        // facing northeast
        if (!is_status) {
          x = ax - width;
          y = ay - height;
        } else {
          x = ax;
          y = ay;
        }
      }
      return {
        "x": x,
        "y": y
      }
  }

  update_statusArea() {
    let border = 5;
    let statusw = 2*border;
    let statush = 2*border;
    let iw = 0;

    if (this.status_icon) {
      statusw += 32;
      statush += 32;
      iw = 32;
    }

    if (this.status_content) {
      let bbox = this.status_content.node().getBBox();
      statusw += bbox.width;
      if (bbox.height > statush) {
        statush = bbox.height;
      }
    }

    let pos = this.get_satellite_position(true, statusw, statush)

    if (this.status_icon) {
      this.status_icon.attr("x", pos.x + border).attr("y", pos.y + border);
    }

    if (this.status_content) {
      if (this.status_content.node().tagName === "text") {
        this.status_content.attr("x", pos.x + iw + border).attr("y", pos.y + statush/2);
      } else {
        this.status_content.attr("x", pos.x + iw + border).attr("y", pos.y + border);
      }
    }

    if (this.status_content_rect) {
      this.status_content_rect
          .attr("x", pos.x ).attr("y", pos.y)
          .attr("height", statush).attr("width", statusw);
    }
  }

  clear_status_area() {
    if (this.status_icon) {
      this.status_icon.remove();
      this.status_icon = null;
    }
    if (this.status_content) {
      this.status_content.remove();
      this.status_content = null;
    }
    if (this.status_content_rect) {
      this.status_content_rect.remove();
      this.status_content_rect = null;
    }
  }

  update_text() {
    try {
      let bbox = this.text.node().getBBox();
      let textw = bbox.width;
      let texth = bbox.height;



      let pos = this.get_satellite_position(false, textw, texth);
      console.log(textw,texth,pos.x,pos.y);
      this.text.attr("x",pos.x+textw/2).attr("y",pos.y+texth/2);
    } catch(ex) {
      // getBBox() fails if element is not visible
    }
  }

  update_execution_state(new_execution_state) {
    this.execution_state = new_execution_state;
    if (new_execution_state === SkadiApi.EXECUTION_STATE_CLEAR) {
       window.setTimeout(ev => {
          this.outer.attr("class", "outer " + this.execution_state);
       },1000);
    } else {
      this.outer.attr("class", "outer " + this.execution_state);
    }
  }

  get_port(id) {
    return this.ports[id];
  }

  remove() {
    for (let portid in this.ports) {
      let port = this.ports[portid];
      port.remove();
    }
    this.ports = {};
    Skadi.x3.select("#" + this.id).remove();

    if (this.tooltip) {
      this.tooltip.remove();
    }
  }

  serialise() {
    return {
      "x":this.x,
      "y":this.y,
      "node_type":this.node_type.get_id(),
      "metadata":this.metadata,
      "properties": this.properties
    };
  }

  get_type() {
    return this.node_type;
  }
}

SkadiNode.deserialise = function(design,id,obj) {
  let node_type = design.get_schema().get_node_type(obj.node_type);
  let node = new SkadiNode(design,node_type,id,obj.x,obj.y,true,obj.metadata, obj.properties);
  node.create_instance();
  return node;
}




/* skadi/js/graph/link.js */

class SkadiLink {

  constructor(design, id, fromPort, link_type, toPort) {
    this.design = design;
    this.id = id;

    this.fromPort = fromPort;
    this.toPort = toPort;

    this.fromPort.add_link(this, false);
    if (this.toPort) {
      this.toPort.add_link(this, true);
    }
    this.REMOVE_ACTION = "Remove";

    this.link_type = link_type;
    this.menu_dial = null;
  }

  get_id() {
    return this.id;
  }

  get_link_type() {
    return this.link_type;
  }

  get_from_port() {
    return this.fromPort;
  }

  get_to_port() {
    return this.toPort;
  }

  get_from_node() {
    return this.fromPort.get_node();
  }

  get_to_node() {
    return this.toPort.get_node();
  }

  remove() {
    this.fromPort.remove_link(this);
    if (this.toPort) {
      this.toPort.remove_link(this);
    }
    Skadi.x3.select("#" + this.id).remove();
    this.tooltip.remove();
  }

  draw(endx, endy) {
    let container = this.design.get_node_group();

    this.grp = container.append("g").attr("id", this.id).attr("class", "link");

    this.path = this.grp.append("path")
      .attr("id", this.id + "path")
      .attr("class", "mainpath");

    this.path.attr("stroke", this.design.get_schema().get_link_colour(this.link_type.get_id()));

    let handler = (evt) => {
      if (this.menu_dial) {
        return;
      }
      let mitems = [];
      mitems.push(new SkadiTextMenuDialogue.MenuItem(this.REMOVE_ACTION, () => {
        this.design.remove(this.get_id());
      }));
      let evloc = Skadi.x3.get_event_xy(evt);
      let tm = new SkadiTextMenuDialogue(this.design, mitems, () => { this.menu_dial = null; }, this, evloc.x - 50, evloc.y - 50);
      tm.open();
    };

    // this.path.on("click touchstart", handler);
    this.path.on("click", handler);

    this.update_position(endx, endy);
    this.update_opacity();

    this.tooltip = new SkadiTooltip(this.grp.node(),this.design.get_svg_tooltip_group().node(),this.link_type.get_name() || "");
  }

  set_opacity(opacity) {
    this.grp.attr("style", "opacity:" + opacity + ";");
  }

  update_opacity() {
    this.set_opacity(this.stopped ? 0.3 : 1.0);
  }

  update_position(endx, endy, refocus) {
    let fromPos = this.fromPort.get_position();
    let to_pos = {
      "x": endx,
      "y": endy
    };
    if (this.toPort) {
      to_pos = this.toPort.get_position();
    }
    let len = Math.sqrt(Math.pow(fromPos.x - to_pos.x, 2) + Math.pow(fromPos.y - to_pos.y, 2));
    if (this.toPort) {
      if (this.fromPort.parent == this.toPort.parent) {
        len = 500;
      }
    }

    let coordsFrom = this.fromPort.get_linkPosition(len);

    let d = "";
    if (this.toPort) {
      let coordsTo = this.toPort.get_linkPosition(len);
      let midx = coordsFrom.x2 + (coordsTo.x2 - coordsFrom.x2) / 2;
      let midy = coordsFrom.y2 + (coordsTo.y2 - coordsFrom.y2) / 2;
      d = "M" + coordsFrom.x + "," + coordsFrom.y + " L" + coordsFrom.x1 + "," + coordsFrom.y1 +
        " Q" + coordsFrom.x2 + "," + coordsFrom.y2 + " " + midx + "," + midy +
        " T" + coordsTo.x1 + "," + coordsTo.y1 + this.compute_arrow_path(coordsTo);
    } else {
      let midx = coordsFrom.x2 + (endx - coordsFrom.x2) / 2;
      let midy = coordsFrom.y2 + (endy - coordsFrom.y2) / 2;
      let coordsTo = {
        "x": endx,
        "y": endy,
        "x1": midx,
        "y1": midy
      };
      d = "M" + coordsFrom.x + "," + coordsFrom.y + " L" + coordsFrom.x1 + "," + coordsFrom.y1 +
        " Q" + coordsFrom.x2 + "," + coordsFrom.y2 + " " + midx + "," + midy +
        " L" + coordsTo.x + "," + coordsTo.y + " " + this.compute_arrow_path(coordsTo);
    }

    let sel = this.path;
    if (refocus) {
      sel = sel.transition(this.design.get_transition());
    }
    sel.attr("d", d);
  }

  compute_arrow_path(coords) {
    let theta = Math.atan2(coords.y1 - coords.y, coords.x1 - coords.x);
    if (this.toPort) {
      theta = this.toPort.get_port_angle();
    }
    let theta1 = theta - Math.PI / 6;
    let theta2 = theta + Math.PI / 6;
    let len = 15;
    let x1 = coords.x + len * Math.cos(theta1);
    let y1 = coords.y + len * Math.sin(theta1);
    let x2 = coords.x + len * Math.cos(theta2);
    let y2 = coords.y + len * Math.sin(theta2);
    let path = " M" + x1 + "," + y1 + " L" + coords.x + "," + coords.y + " L" + x2 + "," + y2;
    return path;
  }

    serialise() {
        return { "to_port":this.toPort.get_id(), "from_port":this.fromPort.get_id(), "link_type":this.link_type.get_id() };
    }

}


SkadiLink.deserialise = function(design, id,obj) {
    let fromPort = design.get_port(obj.from_port);
    let toPort = design.get_port(obj.to_port);
    let linkType = design.get_schema().get_link_type(obj.link_type);
    return new SkadiLink(design, id, fromPort, linkType, toPort);
}



  



/* skadi/js/graph/port.js */

class SkadiPort {

  constructor(design, node, id, port_type, port_name, inNotOut) {
    this.design = design;
    this.node = node;
    this.id = id;
    this.type = "";
    this.port_name = port_name;
    this.port_type = port_type;
    this.inNotOut = inNotOut;
    this.out_links = {};
    this.in_links = {};
    this.link_type_id = port_type.link_type;
    this.link_type = this.design.get_schema().get_link_type(this.link_type_id);
    this.link_spacing = 20;
    if (this.shape) {
      this.shape.style("fill", this.design.get_link_colour(this.link_type_id));
    }

    if (node.active) {
      this.design.register_port(this);
    }
    this.r = 5;

    this.label = this.link_type_id;
    this.grp = null;
  }

  get_label() {
    return this.label;
  }

  get_link_type() {
    return this.link_type_id;
  }

  get_id() {
    return this.id;
  }

  get_node() {
    return this.node;
  }

  get_portName() {
    return this.port_name;
  }

  is_input() {
    return this.inNotOut;
  }

  remove() {
    if (this.node.active && this.inNotOut) {
      this.design.unregister_port(this);
    }
    Skadi.x3.select("#" + this.id.replace(":", "_")).remove();
    this.tooltip.remove();
  }

  set_class(highlight) {
    if (this.grp) {
      let portclass = "port ";
      if (this.inNotOut) {
        portclass += "portin";
      } else {
        portclass += "portout";
      }
      if (highlight) {
        portclass += " highlight";
      }
      this.grp.attr("class", portclass);
    }
  }

  get_address() {
    return {
        "node": this.node.get_id(),
        "port": this.port_name
    };
  }

  draw(parent) {
    let container = parent ? parent : this.design.getCellGroup();
    let coords = this.node.get_portPosition(this.port_name, this.inNotOut);
    this.r = coords.r;

    this.grp = container.append("g").attr("id", this.id.replace(":", "_"));
    this.set_class();

    this.shape = this.grp.append("circle")
      .attr("cx", coords.cx)
      .attr("cy", coords.cy)
      .attr("r", this.r)
      .attr("class", "port_inner")
      .style("fill", this.link_type.get_colour());

    let that = this;
    if (this.node.active && !this.inNotOut) {
      let drag = Skadi.x3.drag();
      drag
        .on("start_abs", function() {
          that.node.draggingFrom = true;
        })
        .on("drag_abs", function(x,y) {
          if (that.node.draggingFrom) {
            that.dragx = x - that.design.offset_x;
            that.dragy = y - that.design.offset_y;
            let cc = that.design.to_canvas_coords(that.dragx,that.dragy);
            let dest = that.design.find_port(cc.x, cc.y, that.link_type_id);
            if (dest && dest.is_input()) {
              if (drag.highlighted_port && drag.highlighted_port != dest) {
                drag.highlighted_port.set_class(false);
              }
              drag.highlighted_port = dest;
              dest.set_class(true);
            } else {
              if (drag.highlighted_port) {
                drag.highlighted_port.set_class(false);
                drag.highlighted_port = null;
              }
            }
            if (that.conn == null) {
              that.conn = {};
              let id = that.design.next_id("link");
              that.conn = new SkadiLink(that.design, id, that, that.link_type);
              that.conn.draw(cc.x, cc.y);
            } else {
              if (that.conn.update_position) {
                that.conn.update_position(cc.x, cc.y);
              }
            }
          }
        })
        .on("end_abs", function() {
          if (drag.highlighted_port) {
            drag.highlighted_port.set_class(false);
            drag.highlighted_port = null;
          }
          if (that.conn) {
            let cc = that.design.to_canvas_coords(that.dragx,that.dragy);
            let dest = that.design.find_port(cc.x, cc.y, that.link_type_id);
            let from_node_id = that.get_node().get_id();
            let to_node_id = dest ? dest.get_node().get_id() : undefined;
            if (dest && dest.is_input() && !that.design.already_connected(that,dest) && from_node_id != to_node_id
                && that.design.check_allowed_to_connect(from_node_id, to_node_id)) {
              if (!dest.port_type.get_allow_multiple_connections()) {
                dest.remove_input_links();
              }
              if (!that.port_type.get_allow_multiple_connections()) {
                that.remove_output_links();
              }

              that.conn.remove();
              that.design.create_link(that, dest, that.link_type_id);
            } else {
              that.conn.remove();
            }
            that.conn = null;
          }
          that.node.draggingFrom = false;
        });

      this.shape.call(drag);
    } else {
      let drag = Skadi.x3.drag();
      this.shape.call(drag);
    }
    let tooltip_text = (this.inNotOut ? "[in] " : "[out] ") + this.label;
    this.tooltip = new SkadiTooltip(this.grp.node(),this.design.get_svg_tooltip_group().node(),tooltip_text);
  }

  update_position(refocus) {
    let coords = this.node.get_portPosition(this.port_name, this.inNotOut);
    this.r = coords.r;
    let sel = this.shape;
    if (refocus) {
      sel = sel.transition(this.design.get_transition());
    }
    this.r = coords.r;
    sel.attr("cx", coords.cx).attr("cy", coords.cy).attr("r", this.r);

    for (let k in this.out_links) {
      this.out_links[k].update_position(null, null, refocus);
    }
    for (let k in this.in_links) {
      this.in_links[k].update_position(null, null, refocus);
    }
  }

  get_position() {
    let coords = this.node.get_portPosition(this.port_name, this.inNotOut);
    return {
      "x": coords.cx,
      "y": coords.cy
    };
  }

  get_port_angle() {
    return this.node.get_portPosition(this.port_name,this.inNotOut).theta;
  }

  get_linkPosition(len) {
    return this.node.get_portLinkPosition(this.port_name, len, this.inNotOut);
  }

  add_link(link, inNotOut) {
    if (inNotOut) {
      this.in_links[link.id] = link;
    } else {
      this.out_links[link.id] = link;
    }
  }

  remove_link(link) {
    if (this.inNotOut) {
      delete this.in_links[link.id];
    } else {
      delete this.out_links[link.id];
    }
  }

  get_link_count() {
    let count = 0;
    if (this.inNotOut) {
      for (let key in this.in_links) {
        count += 1;
      }
    } else {
      for (let key in this.out_links) {
        count += 1;
      }
    }
    return count;
  }

  remove_input_links() {
    if (this.inNotOut) {
      let keys = [];
      for (let key in this.in_links) {
        keys.push(key);
      }
      for (let idx in keys) {
        let key = keys[idx];
        this.design.remove(this.in_links[key].get_id());
      }
    }
  }

  remove_output_links() {
    if (!this.inNotOut) {
      let keys = [];
      for (let key in this.out_links) {
        keys.push(key);
      }
      for (let idx in keys) {
        let key = keys[idx];
        this.design.remove(this.out_links[key].get_id());
      }
    }
  }
}



/* skadi/js/graph/network.js */

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


/* skadi/js/graph/configuration.js */

class SkadiConfiguration {

  constructor(design, package_type, properties) {
    this.design = design;
    this.package_type = package_type;
    this.configuration_service = null;
    this.wrapper = null;
    this.properties = properties;
    this.id = package_type.get_id();
  }

  get_id() {
      return this.id;
  }

  create_instance() {
      try {
          this.configuration_service = new SkadiConfigurationService(this);
          this.wrapper = new SkadiWrapper(this,this.configuration_service);
          this.configuration_service.set_wrapper(this.wrapper);
          let configuration_factory = this.design.get_configuration_factory();
          let o = null;
          if (configuration_factory) {
              o = configuration_factory(this.configuration_service);
          } else {
              let classname = this.package_type.get_classname();
              let cls = eval(classname);
              o = new cls(this.configuration_service);
          }
          this.wrapper.set_instance(o);
      } catch (e) {
          console.error(e);
          return false;
      }
      return true;
  }

  get_wrapper() {
    return this.wrapper;
  }
}

SkadiConfiguration.deserialise = function(design,package_id,obj) {
  let package_type = design.get_schema().get_package_type(package_id);
  let configuration = new SkadiConfiguration(design,package_type,obj.properties);
  configuration.create_instance();
  return configuration;
}




/* skadi/js/base/configuration_base.js */

class SkadiConfigurationBase {

    constructor(configuration_service) {
    }

    open(width, height) {

    }

    resize(width,height) {

    }

    close() {

    }

    save() {

    }

    load(from_saved_object) {

    }
}


/* skadi/js/base/node_base.js */

class SkadiNodeBase {

    constructor(node_service) {
    }

    open(width, height) {

    }

    resize(width,height) {

    }

    close() {

    }

    save() {

    }

    load(from_saved_object) {

    }
}


/* skadi/js/services/node_service.js */

class SkadiNodeService {

    constructor(node) {
        this.design = node.design;
        this.node_id = node.id;
        this.node_type = node.node_type;
        this.wrapper = null;
    }

    set_wrapper(wrapper) {
        this.wrapper = wrapper;
    }

    get_property(property_name, default_value) {
        return this.wrapper.get_property(property_name, default_value);
    }

    set_property(property_name, property_value) {
        this.wrapper.set_property(property_name, property_value);
    }

    add_event_handler(element_id, event_type, callback, event_transform) {
        this.wrapper.add_event_handler(element_id, event_type, callback, event_transform);
    }

    set_attributes(element_id, attributes) {
        this.wrapper.set_attributes(element_id, attributes);
    }

    send_message(message) {
        this.wrapper.send_message(message);
    }

    set_message_handler(handler) {
        this.wrapper.set_message_handler(handler);
    }

    get_node_id() {
        return this.node_id;
    }

    set_status_info(status_msg) {
        this.design.update_node_status(this.node_id, SkadiStatusStates.info, status_msg);
    }

    set_status_warning(status_msg) {
        this.design.update_node_status(this.node_id, SkadiStatusStates.warning, status_msg);
    }

    set_status_error(status_msg) {
        this.design.update_node_status(this.node_id, SkadiStatusStates.error, status_msg);
    }

    clear_status() {
        this.design.update_node_status(this.node_id, SkadiStatusStates.clear, "");
    }

    resolve_url(url) {
        return this.node_type.get_package_type().get_resource_url(url);
    }

    create_data_uri(data, mime_type) {
        return "data:"+mime_type+";base64," + btoa(data);
    }

    get_configuration() {
        return this.design.get_configuration(this.node_type.get_package_type().get_id())
    }

}


/* skadi/js/services/wrapper.js */

class SkadiWrapper {

    constructor(target, services) {
        this.target = target;
        this.services = services;
        this.instance = null;
        this.window = null;
        this.event_handlers = [];
        this.attribute_map = {}; //  element_id => attribute_name => attribute_value
        this.message_handler = null;
        this.pending_messages = [];
    }

    set_instance(instance) {
        this.instance = instance;
    }

    get_property(property_name, default_value) {
        if (property_name in this.target.properties) {
            return this.target.properties[property_name];
        }
        return default_value;
    }

    set_property(property_name, property_value) {
        this.target.properties[property_name] = property_value;
    }

    set_message_handler(handler) {
        this.message_handler = handler;
        if (this.pending_messages.length > 0) {
            this.pending_messages.forEach((m) => this.message_handler(m));
            this.pending_messages = [];
        }
    }

    add_event_handler(element_id, event_type, callback, event_transform) {
       this.event_handlers.push([element_id, event_type, callback, event_transform]);
       this.send_add_event_handler(element_id,event_type,event_transform);
    }

    send_add_event_handler(element_id, event_type, event_transform) {
        let msg = {
            "type": "add_event_handler",
            "element_id": element_id,
            "event_type": event_type,
            "event_transform": event_transform
        };
        this.send_to_window(msg);
    }

    handle_event(element_id, event_type, value) {
        for(let idx=0; idx<this.event_handlers.length; idx++) {
            let handler_spec = this.event_handlers[idx];
            if (element_id === handler_spec[0] && event_type === handler_spec[1]) {
                handler_spec[2](value);
            }
        }
    }

    set_attributes(element_id, attributes) {
        if (!(element_id in this.attribute_map)) {
            this.attribute_map[element_id] = {};
        }
        for(let key in attributes) {
            this.attribute_map[element_id][key] = attributes[key];
        }
        this.send_set_attributes(element_id, attributes);
    }

    send_set_attributes(element_id, attributes) {
        let msg = {
            "type": "set_attributes",
            "element_id": element_id,
            "attributes": attributes
        }
        this.send_to_window(msg);
    }

    send_message(content) {
        let msg = {
            "type": "message",
            "content": content
        }
        this.send_to_window(msg);
    }

    handle_message(content) {
        if (this.message_handler) {
            this.message_handler(content);
        } else {
            this.pending_messages.push(content);
        }
    }

    send_to_window(msg) {
        if (this.window) {
            this.window.postMessage(msg,window.location.origin);
        }
    }

    recv_from_window(msg) {
        console.log("Recv from window: "+JSON.stringify(msg));
        switch(msg.type) {
            case "event":
                this.handle_event(msg["element_id"],msg["event_type"],msg["value"]);
                break;
            case "message":
                this.handle_message(msg["content"]);
                break;
        }
    }


    open(w, width, height) {
        this.window = w;
        this.pending_messages = [];
        window.addEventListener("message", (event) => {
            if (event.source == this.window) {
                this.recv_from_window(event.data);
            }
        });
        if (this.instance.open) {
            try {
                this.instance.open(width, height);
            } catch(e) {
                console.error(e);
            }
        }
        for(var element_id in this.attribute_map) {
            this.send_set_attributes(element_id, this.attribute_map[element_id]);
        }
        for(var idx=0; idx<this.event_handlers.length; idx++) {
            let element_id = this.event_handlers[idx][0];
            let event_type = this.event_handlers[idx][1];
            let event_transform = this.event_handlers[idx][3];
            this.send_add_event_handler(element_id, event_type, event_transform);
        }
    }

    resize(width,height) {
        if (this.instance.resize) {
            try {
                this.instance.resize(width, height);
            } catch(e) {
                console.error(e);
            }
        }
    }

    close() {
        this.window = null;
        if (this.instance.close) {
            try {
                this.instance.close();
            } catch(e) {
                console.error(e);
            }
        }
        this.pending_messages = [];
    }
}

/* skadi/js/services/configuration_service.js */

class SkadiConfigurationService {

    constructor(configuration) {
        this.design = configuration.design;
        this.package_type = configuration.package_type;
        this.package_id = this.package_type.get_id();
        this.wrapper = null;
    }

    set_wrapper(wrapper) {
        this.wrapper = wrapper;
    }

    get_property(property_name, default_value) {
        return this.wrapper.get_property(property_name, default_value);
    }

    set_property(property_name, property_value) {
        this.wrapper.set_property(property_name, property_value);
    }

    add_event_handler(element_id, event_type, callback, event_transform) {
        this.wrapper.add_event_handler(element_id, event_type, callback, event_transform);
    }

    set_attributes(element_id, attributes) {
        this.wrapper.set_attributes(element_id, attributes);
    }

    send_message(message) {
        this.wrapper.send_message(message);
    }

    set_message_handler(handler) {
        this.wrapper.set_message_handler(handler);
    }

    /*
    get_package_id() {
        return this.package_id;
    }

    get_package_type() {
        return this.package_type;
    }
    */

    set_status_info(status_msg) {
        this.design.update_configuration_status(this.package_id, SkadiStatusStates.info, status_msg);
    }

    set_status_warning(status_msg) {
        this.design.update_configuration_status(this.package_id, SkadiStatusStates.warning, status_msg);
    }

    set_status_error(status_msg) {
        this.design.update_configuration_status(this.package_id, SkadiStatusStates.error, status_msg);
    }

    clear_status() {
        this.design.update_configuration_status(this.package_id, SkadiStatusStates.clear, "");
    }

    resolve_url(url) {
        return this.get_package_type().get_resource_url(url);
    }

    create_data_uri(data, mime_type) {
        return "data:"+mime_type+";base64," + btoa(data);
    }

}


/* skadi/js/schema/node_type.js */

class SkadiNodeType {

  constructor(nodeTypeId, packageType, schema) {
    this.id = packageType.get_qualified_id(nodeTypeId);
    this.packageType = packageType;
    this.schema = schema;
    this.packageId = packageType.get_id();
    this.enabled = schema["enabled"] !== false;
    let metadata = schema["metadata"] || { "name": nodeTypeId, "description":""};
    let display = schema["display"] || { "corners": 4, "icon": "", "html": "" };
    let input_ports = schema["input_ports"] || {};
    let output_ports = schema["output_ports"] || {};
    this.page = schema["page"] || {};
    this.html_url = this.page.url ? this.packageType.get_resource_url(this.page.url) : "";

    this.classname = schema["classname"] || {};

    this.metadata = metadata;
    this.input_ports = {};
    this.output_ports = {};

    for (let key in input_ports) {
      let pt = new SkadiPortType("input");
      pt.deserialise(input_ports[key]);
      this.input_ports[key] = pt;
    }

    for (let key in output_ports) {
      let pt = new SkadiPortType("output");
      pt.deserialise(output_ports[key]);
      this.output_ports[key] = pt;
    }

    this.hide = false;
    this.display = display;

    this.configure_package_type(this.packageType);
  }

  get_html_url() {
    return this.html_url;
  }

  get_schema() {
    return this.schema;
  }

  get_page() {
    return this.page;
  }

  get_classname() {
    return this.classname;
  }

  configure_package_type(packageType) {
    let pdisplay = packageType.get_display();
    for (let key in pdisplay) {
      if (!this.display[key]) {
        this.display[key] = pdisplay[key];
      }
    }
    if ("icon" in this.display) {
      this.image = packageType.get_url() + "/" + this.display["icon"];
    } else {
      this.image = "";
    }
    if ("style" in this.display) {
      this.style = this.display["style"];
    } else {
      this.style = "";
    }
  }

  get_id() {
    return this.id;
  }

  get_label() {
    return this.metadata["name"];
  }

  get_type() {
    return this.id;
  }

  get_display() {
    return this.display;
  }

  get_package_id() {
    return this.packageId;
  }

  get_package_type() {
    return this.packageType;
  }

  is_enabled() {
    return this.enabled;
  }
}




/* skadi/js/schema/link_type.js */

class SkadiLinkType {
  
  constructor(linkTypeId, packageType, schema) {
    let metadata = schema["metadata"] || { "name": "?", "description":"?"};
    let display = schema["display"] || { "colour": "blue" };


    this.id = packageType.get_qualified_id(linkTypeId);
    this.packageId = packageType.get_id();
    this.name = metadata.name;
    this.description = metadata.description;
    this.colour = display.colour;
  }

  get_id() {
    return this.id;
  }

  get_package_id() {
    return this.packageId;
  }

  get_name() {
    return this.name;
  }

  get_description() {
    return this.description;
  }

  get_colour() {
    return this.colour ? this.colour : "grey";
  }

}



/* skadi/js/schema/package_type.js */

class SkadiPackageType {
  
  constructor(id, url, obj) {
    this.id = id;
    this.metadata = obj["metadata"];
    this.display = obj["display"];
    this.base_url = url.split("/").slice(0,-1).join("/");
    this.configuration = obj["configuration"];
  }

  get_id() {
    return this.id;
  }

  get_name() {
    return this.metadata["name"];
  }

  get_description() {
    return this.metadata["description"];
  }

  get_metadata() {
    return this.metadata;
  }

  get_display() {
    return this.display;
  }

  get_url() {
    return this.metadata["url"];
  }

  get_resource_url(url) {
    if (url.startsWith("http")  || url.startsWith("/")) {
        return url;
    }
    let resource_url = this.base_url;
    if (resource_url.length>0) {
      resource_url += "/";
    }
    resource_url += url;
    return resource_url;
  }

  get_qualified_id(id) {
    return this.id + ":" + id;
  }

  get_configuration() {
    return this.configuration;
  }
}



/* skadi/js/schema/port_type.js */

class SkadiPortType {
  
  constructor(direction) {
    this.direction = direction;
    this.link_type = "";
    this.metadata = {};
    this.allow_multiple_connections = null;
  }

  deserialise(obj) {
    if (obj["link_type"]) {
      this.link_type = obj["link_type"];
    }
    if (obj["metadata"]) {
      this.metadata = obj["metadata"];
    }
    if ("allow_multiple_connections" in obj) {
      this.allow_multiple_connections = obj["allow_multiple_connections"];
    } else {
      this.allow_multiple_connections = true;
    }
  }

  serialise() {
    let result = {};
    result["channel_type"] = this.link_type;
    result["metadata"] = this.metadata;
    return result;
  }

  get_link_type() {
    return this.link_type;
  }

  get_allow_multiple_connections() {
    return this.allow_multiple_connections;
  }
}



/* skadi/js/schema/schema.js */

class SkadiSchemaError extends Error {

    constructor(message) {
        super(message)
        this.name = "SkadiSchemaError";
    }

}


class SkadiSchema {

    constructor() {
        this.package_types = {};
        this.node_types = {};
        this.link_types = {};
        this.rl = new ResourceLoader();
    }

    async loadPackage(url,obj) {
        let id = obj["id"];

        if (id in this.package_types) { // this package already loaded?
            return;
        }

        let executor = obj["executor"]
        if (executor != "javascript") {
            throw new SkadiSchemaError("Invalid value for schema executor: found \""+executor+"\", expecting \"javascript\"");
        }

        let packageType = new SkadiPackageType(id, url, obj);
        this.package_types[packageType.get_id()] = packageType;


        let resources = [];

        if (obj["dependencies"]) {
            obj["dependencies"].forEach(item => resources.push(packageType.get_resource_url(item)));
        }

        if (obj.node_types) {
            for(let nt_id in obj.node_types) {
                let nt = obj.node_types[nt_id];
                if (nt["dependencies"]) {
                    nt["dependencies"].forEach(item => resources.push(packageType.get_resource_url(item)));
                }
            }
        }

        /* load resources defined in the package */

        let load_results = await this.rl.load_resources(resources);
        let failed_resources = [];
        for(let resource_name in load_results) {
            if (!load_results[resource_name]) {
                failed_resources.push(resource_name)
            }
        }

        /* raise an error if any resources failed to load */

        if (failed_resources.length > 0) {
            throw new SkadiSchemaError("Unable to load package resources: "+JSON.stringify(failed_resources))
        }

        let nodeTypes = obj["node_types"];
        for(let node_id in nodeTypes) {
            let nt = nodeTypes[node_id];
            let nodeType = new SkadiNodeType(node_id, packageType, nt);
            if (nodeType.is_enabled()) {
                this.node_types[nodeType.get_id()] = nodeType;
            }
        }

        let linkTypes = obj["link_types"];
        for(let link_id in linkTypes) {
            let lt = linkTypes[link_id];
            let linkType = new SkadiLinkType(link_id, packageType, lt);
            this.link_types[linkType.get_id()] = linkType;
        }
        return packageType;
    }

    get_resource_url(package_id, relative_path) {
       return this.package_types[package_id].get_resource_url(relative_path);
    }

    get_node_type(id) {
        return this.node_types[id];
    }

    get_link_type(id) {
        return this.link_types[id];
    }

    get_link_colour(id) {
        if (id in this.link_types) {
            return this.link_types[id].get_colour();
        }
        return "grey";
    }

    get_package_type(id) {
        return this.package_types[id];
    }

    get_package_types() {
        let ids = [];
        for (let key in this.package_types) {
            ids.push(key);
        }
        return ids;
    }

    get_packages_list() {
        let result = [];
        for (let key in this.package_types) {
            let pt = this.package_types[key];
            result.push({"id":pt.get_id(),"metadata":pt.get_metadata()});
        }
        return result;
    }

    get_node_types() {
        let ids = [];
        for (let key in this.node_types) {
            ids.push(key);
        }
        return ids;
    }
}



/* skadi/js/skadi-api.js */

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
        return "0.0.1"; // placeholder substituted with actual version by the build.py script
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




/* skadi/js/start-skadi.js */

 /**
  * Asynchronous function to create a skadi graphical editor widget
  *
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {Object} canvas_width - the width of the canvas area
  * @param {Number} canvas_height - the height of the canvas area
  * @param {Boolean} is_acyclic - true iff the graph must be acyclic
  * @param {Object} topology_store - optional, object implementing the TopologyStore interface
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using backend=>classname from the schema
  */
async function start_skadi(schema_urls, element_id, canvas_width, canvas_height, is_acyclic, topology_store, node_factory) {

    if (is_acyclic == undefined || is_acyclic == null) {
        is_acyclic = true;
    }

    let skadi_instance = new SkadiApi(element_id || "canvas_container_id",
        canvas_width || SkadiApi.DEFAULT_CANVAS_WIDTH, canvas_height || SkadiApi.DEFAULT_CANVAS_HEIGHT, is_acyclic, topology_store, node_factory);
    await skadi_instance.load_schema(schema_urls);

    return skadi_instance;
}




