/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

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

  get_port_name() {
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
    let coords = this.node.get_port_position(this.port_name, this.inNotOut);
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
    let coords = this.node.get_port_position(this.port_name, this.inNotOut);
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
    let coords = this.node.get_port_position(this.port_name, this.inNotOut);
    return {
      "x": coords.cx,
      "y": coords.cy
    };
  }

  get_port_angle() {
    return this.node.get_port_position(this.port_name,this.inNotOut).theta;
  }

  get_linkPosition(len) {
    return this.node.get_port_link_position(this.port_name, len, this.inNotOut);
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

