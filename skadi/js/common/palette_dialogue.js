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
