/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/


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