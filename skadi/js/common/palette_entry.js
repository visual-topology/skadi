/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiPaletteEntry {

  constructor(palette, design, node_type) {
    this.palette = palette;
    this.design = design;
    this.node_type = node_type;
    this.node = null;
    this.overlay_node = null;
    this.overlay_grp = null;
    this.overlay_x = 0;
    this.overlay_y = 0;
    this.width = 220;
    this.height = 180;
    this.x = 110;
    this.y = 90;
    this.metadata = {
      "name": this.node_type.get_name(),
      "description": this.node_type.get_description()
    };
  }

  get_size(w,h) {
    return {"width":this.width, "height":this.height};
  }

  draw(grp) {
    this.node = new SkadiNode(this.design, this.node_type, this.design.next_id("nl"), this.x, this.y, false, this.metadata);
    this.node.draw(grp);
    
    this.overlay_grp = this.design.get_skadi_svg_dialogue_group();
    this.node.set_drag_handlers(
      (evloc) => {
        this.overlay_x = evloc.x;
        this.overlay_y = evloc.y;
        let meta = JSON.parse(JSON.stringify(this.metadata));
        this.overlay_node = new SkadiNode(this.design, this.node_type, this.design.next_id("nl"), 
          this.overlay_x, this.overlay_y, false, this.metadata);
        this.overlay_node.set_display_tooltips(false);
        this.overlay_node.draw(this.overlay_grp);
      },
      (evloc) => {
        this.overlay_x = evloc.x;
        this.overlay_y = evloc.y;
        this.overlay_node.update_position(this.overlay_x, this.overlay_y);
      },
      (evloc) => {
        if (this.overlay_node) {
          this.overlay_node.remove();
          this.overlay_node = null;
          if (!this.palette.intersects_window(evloc.x,evloc.y)) {
              let tx = this.overlay_x - this.design.offset_x;
              let ty = this.overlay_y - this.design.offset_y;
              let cc = this.design.to_canvas_coords(tx,ty);
              this.design.create_node(null,this.node_type, cc.x, cc.y,this.metadata);
          }
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
    if (this.node_type) {
      return this.node_type.get_package_id();
    }
    return "";
  }

  get_group() {
    return this.node.get_group();
  }

  get_id() {
    return this.node_type.get_id();
  }
}


