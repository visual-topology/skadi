/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.SvgDialogue = class {

  constructor(id, design, title, x, y, content_width, content_height, close_handler, resize_handler, scrollable, auto_close, draggable, draw_callback, draw_on_canvas) {
    this.design = design;
    this.title = title;

    this.close_handler = close_handler;
    this.resize_handler = resize_handler;
    this.draw_callback = draw_callback;

    this.draw_on_canvas = draw_on_canvas;

    this.id = id;
    this.x = x;
    this.y = y;
    this.header_sz = 40;
    this.footer_sz = 40;
    this.padding = 5;

    this.width = content_width + 2*this.padding;
    this.height = content_height + 2*this.padding + this.header_sz;

    this.startx = 0;
    this.starty = 0;
    this.ox = 0;
    this.oy = 0;

    this.dragging = false;
    this.removeOnClose = true;
    this.draggable = draggable;

    this.content_offset = 0;

    let that = this;
    this.closebtn = new skadi.Button(this.design, this.width - this.header_sz / 2, this.header_sz / 2, this.header_sz, this.header_sz, icon_close_purple, function () {
      that.close();
    });
    if (this.resize_handler) {
      this.resizebtn = new skadi.Button(this.design, this.x + this.width - this.footer_sz / 2, this.y + this.height - this.footer_sz / 2, this.footer_sz, this.footer_sz, icon_drag_indicator_purple, function () {
      });
    } else {
      this.resizebtn = null;
    }

    this.compute_content_size();

    this.compute_content_size();

    this.auto_close = auto_close;
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

    if (this.resize_handler) {
      this.content_depth = this.resize_handler(this.content_width, this.content_depth, false);
    }
  }

  open() {

    let container = this.draw_on_canvas ? this.design.get_node_connector_group() : this.design.get_skadi_svg_dialogue_group();

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
      let drag =  skadi.x3.drag();
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

    this.closebtn.draw(this.grp);

    this.draw_callback(this.content_grp);

    if (this.resizebtn) {
      this.resizegrp = container.append("g");
      this.resizebtn.draw(this.resizegrp);

      let resize =  skadi.x3.drag();
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

    if (this.auto_close) {
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
    if (this.close_handler) {
      this.close_handler(this.dial);
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
      "y": this.y,
      "w": this.width,
      "h": this.height
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
