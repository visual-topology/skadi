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
    <div style="margin-top:10px;">
        Pages:
        <div id="page_buttons"></div>
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
            this.page_height = height;
            this.refresh_view();
        });

    this.all_entries = [];
    this.entries = [];
    this.entry_tiles = {};
    this.current_page = 1;
    this.palette_controls = null;
    this.page_button_container = null;
    this.page_buttons = {};
    this.palette_filter = null;
    this.filter_text = "";
  }

  add(entry) {
    this.all_entries.push(entry);
  }

  show(elt) {
      elt.innerHTML = palette_html;
      this.palette_controls = Skadi.$("palette_controls");
      this.page_button_container = Skadi.$("page_buttons");
      this.content_elt = Skadi.$("palette_content");
      this.palette_filter = Skadi.$("palette_filter");
      this.palette_filter.addEventListener("change", (evt) => {
        this.filter_text = evt.target.value;
        this.refresh_view();
      });
   }

   has_tile(entry) {
    return (entry.get_id() in this.entry_tiles);
   }

   get_tile(entry) {
     if (entry.get_id() in this.entry_tiles) {
        return this.entry_tiles[entry.get_id()];
     }
     let sz = entry.get_size();

     let elt_sel = new SkadiX3Selection([this.content_elt]);
     let tile = elt_sel.append("div");
     let svg = tile.append("svg")
            .attr("width",sz.width)
            .attr("height", sz.height);

     let group = svg.append("g").attr("id", "viewport");
     entry.draw(group);
     this.entry_tiles[entry.get_id()] = tile;
     return tile;
   }

    matches(entry) {
        if (!this.filter_text) {
            return true;
        }
        let search_keys = ["name","description"];
        let matched = false;
        search_keys.forEach(key => {
            if (entry.metadata[key].toLowerCase().includes(this.filter_text.toLowerCase())) {
                matched = true;
            }
        });
        return matched;
    }

   refresh_view() {
      let r = this.content_elt.getBoundingClientRect();
      let w = r.width;
      r = this.palette_controls.getBoundingClientRect();
      let h = this.page_height - r.height;
      this.entries = [];
      this.all_entries.forEach(entry => {
         if (this.matches(entry)) {
            this.entries.push(entry);
         }
      });
      if (this.entries.length) {
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
          this.current_page = 1;
      } else {
        this.page_size = 0;
        this.page_count = 0;
        this.current_page = 0;
      }
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
        this.all_entries.forEach(entry => {
            if (!this.entries.includes(entry)) {
                if (this.has_tile(entry)) {
                    let tile = this.get_tile(entry);
                    tile.style("display","none");
                }
             }
        });
        for(let idx=0; idx<this.entries.length; idx++) {
            let tile = this.get_tile(this.entries[idx]);
            if (idx < page_start || idx >= page_end) {
                tile.style("display","none");
            } else {
                tile.style("display","inline-block");
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