/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

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


