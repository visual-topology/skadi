/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let GRID_SNAP = 20;

class SkadiDesigner extends SkadiCore {

    constructor(l10n_utils, schema, element_id, width, height, is_acyclic, topology_store, node_factory, configuration_factory) {
        super(l10n_utils, schema, element_id, topology_store, node_factory, configuration_factory);
        this.width = width;
        this.height = height;
        this.is_acyclic = is_acyclic;

        this.id = "design";
        this.paused = false;
        this.windows = {};

        this.network = new SkadiNetwork({});

        this.transform = [1, 0, 0, 1, 0, 0];

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

        this.div.node().addEventListener("wheel", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.wheel(event);
        }, {"passive": false, "capture": true});

        this.svg_dialogue_group = this.fixed_svg.append("g").attr("class", "fixed_dialogue_group");

        this.svg_tooltip_group = this.fixed_svg.append("g").attr("class", "fixed_tooltip_group");


        this.button_size = 64;
        this.button_margin = 10;
        let button_x = this.button_margin + this.button_size/2;
        let button_y = this.button_margin + this.button_size/2;

        this.palette_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_palette_purple, () => { this.open_palette(); }, "Open Palette");
        this.palette_btn.set_fill("white");
        this.palette_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.home_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_home_purple, () => { this.go_home(); }, "Reset View Pan/Zoom");
        this.home_btn.set_fill("white");
        this.home_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.pause_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size, icon_pause,
            () => { this.toggle_pause(); }, "Pause/Restart Execution");
        this.pause_btn.set_fill("white");
        this.pause_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.file_upload_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_file_upload_purple, () => { this.open_load(); }, "Upload Design");
        this.file_upload_btn.set_fill("white");
        this.file_upload_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.file_download_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_file_download_purple, () => {
            this.open_save();
        }, "Download Design");

        this.file_download_btn.set_fill("white");
        this.file_download_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.help_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_help_purple, () => { this.open_about(); }, "");
        this.help_btn.set_fill("white");
        this.help_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.clear_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_delete, () => { this.open_clear(); }, "");
        this.clear_btn.set_fill("white");
        this.clear_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.edit_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_edit_purple, () => { this.open_edit_design_metadata(); }, "");
        this.edit_btn.set_fill("white");
        this.edit_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.configuration_btn = new SkadiButton(this,button_x,button_y,this.button_size,this.button_size,
            icon_configuration_purple, () => { this.open_configuration_dialogue(); }, "");
        this.configuration_btn.set_fill("white");
        this.configuration_btn.draw(this.btn_group);
        button_x += this.button_size + this.button_margin;

        this.drag_div = this.fixed_svg.append("rect").attr("x", "0").attr("y", "0")
            .attr("width", 0).attr("height", 0).attr("opacity", 0.1)
            .attr("id", "drag_overlay").attr("fill", "#FFF");

        this.ports = {};

        this.transition = 500;

        this.node_group = this.group.append("g");

        let pos = Skadi.x3.get_node_pos(this.div.node());
        this.offset_x = pos.x;
        this.offset_y = pos.y;

        this.drag = Skadi.x3.drag();

        this.drag
            .on("start", (x, y) => {
                this.drag.start_dragging = true;
            })
            .on("drag", (x, y) => {
                if (this.drag.start_dragging) {
                    this.drag.start_x = x;
                    this.drag.start_y = y;
                    this.drag.start_dragging = false;
                } else {
                    let dx = x - this.drag.start_x;
                    let dy = y - this.drag.start_y;
                    this.drag.start_x = x;
                    this.drag.start_y = y;
                    this.panzoom(dx, dy, 1);
                }
            })
            .on("end", (x, y) => {
                let dx = x - this.drag.start_x;
                let dy = y - this.drag.start_y;
                this.panzoom(dx, dy, 1);
            });
        this.div.call(this.drag);

        this.design_metadata_dialogue = null;
        this.about_dialogue = null;
        this.clear_dialogue = null;
        this.palette_dialogue = null;
        this.load_dialogue = null;
        this.save_dialogue = null;
        this.configuration_dialogue = null;
        this.localisation_updated();
        this.l10n_utils.add_language_update_listener(language => {
            this.localisation_updated();
        });
    }

    localisation_updated() {
        this.help_btn.set_tooltip(this.localise("about.tooltip"));
        this.clear_btn.set_tooltip(this.localise("clear.topology.tooltip"));
        this.edit_btn.set_tooltip(this.localise("topology.metadata.editor.tooltip"));
        this.configuration_btn.set_tooltip(this.localise("configuration.edit.tooltip"));
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
        let title = node.metadata.name;
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

    open_node_window_tab(node_id, command_id, open_url, open_callback, close_callback, resize_callback) {
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
        if (!this.palette_dialogue) {
            this.palette_dialogue = new SkadiPalette(this, "car0", () => {
                this.palette_dialogue = null;
            });
            this.palette_dialogue.open();
        }
    }

    open_about() {
        if (!this.about_dialogue) {
           this.about_dialogue = new SkadiFrameDialogue("about0", this, "About", 100, 100, 600, 400, () => {
                this.about_dialogue = null;
            }, true, null, (elt) => {
               skadi_populate_about(this, elt);
               }, null);
        }
    }

    open_save() {
        if (!this.save_dialogue) {
           this.save_dialogue = new SkadiFrameDialogue("save0", this, "Save", 100, 100, 600, 300, () => {
                this.save_dialogue = null;
            }, true, null, (elt) => {
               skadi_populate_save(this, elt);
               }, null);
        }
    }

    open_load() {
        if (!this.load_dialogue) {
           this.load_dialogue = new SkadiFrameDialogue("load0", this, "Load", 100, 100, 600, 300, () => {
                this.load_dialogue = null;
            }, true, null, (elt) => {
               skadi_populate_load(this, elt, () => {
                        this.load_dialogue.close();
                    });
               }, null);
        }
    }

    open_clear() {
        if (!this.clear_dialogue) {
           this.clear_dialogue = new SkadiFrameDialogue("clear0", this, "Clear Design", 100, 100, 600, 400, () => {
                this.clear_dialogue = null;
            }, true, null, (elt) => {
               skadi_populate_clear(this, elt, () => {
                        this.clear_dialogue.close();
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
                    skadi_populate_design_metadata(this, elt, () => {
                        this.design_metadata_dialogue.close();
               });
           }, null);
        }
    }

    open_configuration_dialogue() {
        if (!this.configuration_dialogue) {
           this.configuration_dialogue = new SkadiFrameDialogue("configuration0", this, "Package Configurations", 100, 100, 600, 600,
                () => {
                    this.configuration_dialogue = null;
                }, true, null,
               (elt) => {
                    skadi_populate_configuration(this, elt, () => {
                        this.configuration_dialogue.close();
               });
           }, null);
        }
    }

    /* configuration related */

    open_configuration(package_id) {
        let configuration = this.network.configurations[package_id];
        let package_type = configuration.get_package_type();
        let name = package_type.get_metadata().name;
        let url = configuration.get_url();
        if (url) {
            let id = package_id + "_config";
            if (!(id in this.windows)) {
                let title = "Configuration: " + name;
                let window_height = configuration.get_page().window_height || 400;
                let window_width = configuration.get_page().window_width || 400;
                let resolved_url = package_type.get_resource_url(url);
                let open_callback = (elt) => {
                    let iframe = document.createElement("iframe");
                    iframe.setAttribute("src", resolved_url);
                    iframe.setAttribute("width", "" + window_width - 20);
                    iframe.setAttribute("height", "" + window_height - 20);
                    iframe.addEventListener("load", (evt) => {
                        configuration.open(iframe, window_width, window_width);
                    });
                    elt.appendChild(iframe);
                }
                let close_callback = () => {
                    delete this.windows[id];
                    configuration.close();
                    skadi_close_configuration();
                }
                let resize_callback = (w, h) => {
                    configuration.resize(w, h);
                }

                this.windows[id] = new SkadiFrameDialogue(id, this, title, 100, 100, window_width, window_height,
                    close_callback, true, null, open_callback, resize_callback);
            }
        }
    }

    update_configuration_status(package_id, state, status_message) {
        super.update_configuration_status(package_id, state, status_message);
        skadi_update_configuration_status(package_id, state, status_message);
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


    update_node_position(id, x, y, suppress_event) {
        let node = this.network.get_node(id);
        node.update_position(x, y);
        if (!suppress_event) {
            this.fire_node_event("update_position", node);
        }
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


    /* clear or remove from the network */

    clear(suppress_event) {
        this.network.get_node_list().forEach(node_id => { this.close_windows_for_node(node_id); });
        super.clear();
    }

    remove(id, suppress_event) {
        let node = this.network.get_node(id);
        if (node) {
            // cascade to any links connected to the node to remove
            this.close_windows_for_node(id);

        }
        super.remove(id, suppress_event);
    }

    /* load/save */

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


