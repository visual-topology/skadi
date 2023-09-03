/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

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


