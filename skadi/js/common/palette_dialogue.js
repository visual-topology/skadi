/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

let palette_html = `<div>
<div class="exo-row" id="palette_controls">
    <div class="exo-2-cell">
        <exo-text id="palette_filter" label="Filter By">
    </div>
    <div id="page_buttons">
    </div>
</div>
<div id="palette_content">
</div>
</div>`;

skadi.PaletteDialogue = class extends SkadiFrameDialogue {

  constructor(id, design, title, x, y, width, height, closeHandler, resize_handler, scrollable, autoClose, draggable) {
    super(id, design, title, x, y, width, height, closeHandler,
        true,
        null,
        function(elt) {
          this.show(elt);
        },
        function(width,height,is_final) {
            this.current_page = 1;
            this.refresh_view(height);
        });

    this.entries = [];
    this.entry_tiles = {};
    this.current_page = 1;
    this.palette_controls = null;
    this.page_button_container = null;
    this.page_buttons = {};
  }

  add(entry) {
    this.entries.push(entry);
  }

  show(elt) {
      elt.innerHTML = palette_html;
      this.palette_controls = document.getElementById("palette_controls");
      this.page_button_container = document.getElementById("page_buttons");
      this.content_elt = document.getElementById("palette_content");
      if (this.entries) {
          let elt_sel = new SkadiX3Selection([this.content_elt]);
          for(let idx=0; idx<this.entries.length; idx++) {
              let entry = this.entries[idx];
              let sz = entry.get_size();

              let tile = elt_sel.append("div");
              let svg = tile.append("svg")
                    .attr("width",sz.width)
                    .attr("height", sz.height);

              let group = svg.append("g").attr("id", "viewport");
              entry.draw(group);
              this.entry_tiles[entry.get_id()] = tile;
          }
      }
   }

   refresh_view(total_height) {
      let r = this.content_elt.getBoundingClientRect();
      let w = r.width;
      r = this.palette_controls.getBoundingClientRect();
      let h = total_height - r.height;
      let entry = this.entries[0];
      let sz = entry.get_size();
      let cols = Math.floor(w / sz.width);
      let rows = Math.floor(h / sz.height);
      if (cols < 1) {
        cols = 1;
      }
      if (rows < 1) {
        rows = 1;
      }
      this.page_size = cols*rows;
      this.page_count = Math.ceil(this.entries.length / this.page_size);

      for(let page_nr=1; page_nr <= this.page_count; page_nr+=1) {
          if (!(page_nr in this.page_buttons)) {
              let page_btn = document.createElement("input");
              page_btn.setAttribute("type", "button");
               page_btn.setAttribute("class", "palette_page_button");
              page_btn.setAttribute("value", "" + page_nr);
              page_btn.addEventListener("click", this.make_page_callback(page_nr));
              this.page_buttons[page_nr] = new SkadiX3Selection([page_btn]);
              this.page_button_container.appendChild(page_btn);
          }
      }
      if (this.current_page > this.page_count) {
        this.current_page = this.page_count;
      }
      this.draw_page();
   }

   make_page_callback(page_nr) {
      return () => {
          this.current_page = page_nr;
          this.draw_page();
      }
   }

   draw_page() {
        let page_start = (this.current_page-1)*this.page_size;
        let page_end = page_start + this.page_size;
        for(let idx=0; idx<this.entries.length; idx++) {
            let entry_id = this.entries[idx].get_id();
            if (idx < page_start || idx >= page_end) {
                this.entry_tiles[entry_id].style("display","none");
            } else {
                this.entry_tiles[entry_id].style("display","inline-block");
            }
        }
        for(let page_nr in this.page_buttons) {
            console.log(page_nr,this.page_count);
            let page_btn = this.page_buttons[page_nr];
            if (page_nr > this.page_count) {
                page_btn.style("display","none");
            } else {
                if (page_nr == this.current_page) {
                    page_btn.attr("class", "palette_page_button selected_palette_page_button");
                } else {
                    page_btn.attr("class", "palette_page_button");
                }
               page_btn.style("display","inline-block");
            }
        }
   }
}