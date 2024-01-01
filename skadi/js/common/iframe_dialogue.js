/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.IFrameDialogue = class extends skadi.SvgDialogue {

  constructor(id, design, title, x, y, content_width, content_height, close_handler, can_resize, url, open_callback, resize_callback, draw_on_canvas) {
    super(id, design, title, x, y, content_width, content_height, close_handler,
        function(width,height,is_final) {
          return this.resize(width,height,is_final);
          }, false, false, true,
        function(grp) {
          this.draw(grp);
        }, draw_on_canvas);
    this.design = design;
    this.title = title;
    this.url = url;
    this.open_callback = open_callback;
    this.resize_callback = resize_callback;
  }

  draw(grp) {
    this.fo = grp.append("foreignObject").attr("x",this.padding+"px").attr("y",(this.header_sz+this.padding)+"px").attr("width",this.content_width+"px").attr("height",this.content_height+"px");
    this.content = null;
    if (this.url) {
      this.content = this.fo.append("iframe").attr("class", "skadi_iframe").attr("src", this.url).attr("width", this.content_width + "px").attr("height", this.content_height + "px").attr("target","_new");
    } else {
      this.content = this.fo.append("div").attr("width", this.content_width + "px").attr("height", this.content_height + "px");
      if (this.open_callback) {
        this.open_callback(this.content.node());
        this.resize(this.content_width,this.content_height,true);
      }
    }
  }

  resize(w,h,is_final) {
    if (this.fo) {
      this.fo.attr("width", w + "px").attr("height", h + "px");
      this.content.attr("width", w + "px").attr("height", h + "px");
    }
    if (is_final && this.resize_callback) {
      this.resize_callback(w,h);
    }
    return this.content_height;
  }
}

