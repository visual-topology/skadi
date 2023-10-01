/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

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
