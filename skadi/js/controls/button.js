/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiButton {

  constructor(design, x,y,width,height,icon_url,onclick,tooltip_text) {
    this.design = design;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.icon_url = icon_url;
    this.button = null;
    this.onclick = onclick;
    this.fill = "";
    this.enabled = true;
    this.tooltip_text = tooltip_text;
    this.tooltip = null;
  }

  set_fill(fill) {
      this.fill = fill;
  }

  set_url(url) {
    this.icon_url = url;
    if (this.button) {
        this.button.attr("href",this.icon_url);    
    }
  }

  enable() {
    this.enabled = true;
    this.set_opacity(1.0);
  }

  disable() {
    this.enabled = false;
    this.set_opacity(0.5);
  }

  set_visible(visible) {
      let visibility = "visible";
      if (!visible) {
          visibility = "hidden";
      }
    
    if (this.button) {
        this.button.attr("visibility",visibility);    
    }
    if (this.rect) {
        this.rect.attr("visibility",visibility);    
    }
  }

  set_opacity(opacity) {
    if (this.button) {
        this.button.attr("opacity",opacity);    
    }
    if (this.rect) {
        this.rect.attr("opacity",opacity);    
    }
}

  draw(grp) {
  
    if (this.fill) {
        this.rect = grp.append("rect")
            .attr("width",this.width)
            .attr("height",this.height)
            .attr("x",this.x-this.width/2)
            .attr("y",this.y-this.height/2)
            .attr("fill",this.fill);  
    }

    this.button = grp.append("image")
      .attr("width",this.width)
      .attr("height",this.height)
      .attr("x",this.x-this.width/2)
      .attr("y",this.y-this.height/2)
      .attr("href",this.icon_url);
    let that = this;
    let onclick = function(ev) {
      if (that.enabled && that.onclick) {
        that.onclick(ev);
      }
    }
    this.button.on("click", onclick);
    if (this.tooltip_text) {
        this.set_tooltip(this.tooltip_text);
    }
  }

  get_size() {
    return { "width":this.width, "height":this.height };
  }

  get_position() {
    return { "x":this.x, "y":this.y };
  }

  set_tooltip(text) {
    this.tooltip_text = text;
    if (this.tooltip) {
      this.tooltip.update_text(text);
    } else {
      this.tooltip = new SkadiTooltip(this.button.node(),this.design.get_svg_tooltip_group().node(),text);
    }
  }

  update_position(x,y) {
      this.x = x;
      this.y = y;
      if (this.button) {
        this.button
            .attr("x",this.x-this.width/2)
            .attr("y",this.y-this.height/2);
      }
      if (this.rect) {
        this.rect
            .attr("x",this.x-this.width/2)
            .attr("y",this.y-this.height/2);
      }
  }
}
