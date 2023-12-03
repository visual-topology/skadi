/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.Palette = class {

  constructor(design, id, closecb) {
    this.design = design;
    this.allitems = [];
    let nodeTypes = this.design.get_schema().get_node_types();
    for (let idx in nodeTypes) {
      let tid = nodeTypes[idx];
      let type = this.design.get_schema().get_node_type(tid);
      let entry = new skadi.PaletteEntry(this, design, type);
      this.allitems.push(entry);
    }
    this.id = id;
    this.closecb = closecb;
    this.width = 550;
  }

  open() {
    let x = 100;
    let y = 200;
    this.dial = new skadi.PaletteDialogue("node_palette", this.design, "Palette", x, y, 500, 500, this.closecb, function(){},true, false, true);

    for(let idx=0; idx<this.allitems.length; idx++) {
      this.dial.add(this.allitems[idx]);
    }
    this.dial.open();
  }

  intersects_window(x,y) {
    if (this.dial) {
        let pos = this.dial.get_position();
        if (x > pos.x && x < (pos.x+pos.w) && y > pos.y && y < (pos.y+pos.h)) {
            return true;
        }
    }
    return false;
  }
}