/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiScrollbar {
  constructor(x,y,width,height,fraction_start,fraction_coverage,onslide) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fraction_start = fraction_start;
    this.fraction_coverage = fraction_coverage;
    this.onslide = onslide;
    this.fill = "grey";
    this.compute_position();
    this.dragging = false;
  }

  compute_position() {
     this.slider_y = this.y-this.height/2 + this.height * this.fraction_start;
     this.slider_height = this.height * this.fraction_coverage;  
  }

  draw(grp) {
    
    this.grp = grp.append("g").attr("class","scrollbar_group");

    this.rect = this.grp.append("rect")
        .attr("x",this.x-this.width/2)
        .attr("y",this.y-this.height/2)
        .attr("width",this.width)
        .attr("height",this.height)
        .attr("class","scrollbar");
    
    if (this.fill != null) {
        this.rect.attr("fill",this.fill);
    }

    this.slider = this.grp.append("rect")
        .attr("x",this.x-this.width/2)
        .attr("y",this.slider_y)
        .attr("width",this.width)
        .attr("height",this.slider_height)
        .attr("class","scrollbar_slider")
        .attr("fill","blue");

    let drag = Skadi.x3.drag();
    drag
      .on("start", function() {
      })
      .on("drag", function(x,y) {
        that.drag_move(y);
      })
      .on("end", function(x,y) {
        that.end_drag_move(y);
      });

    this.slider.call(drag);

    let that = this;

  }

  drag_move(y) {
    if (!this.dragging) {
      this.starty = y;
      this.start_frac = this.fraction_start;
      this.dragging = true;
    } else {
      let dy = y - this.starty;
      let start_frac = this.start_frac + (dy/this.height);
      this.set_fractions(start_frac, this.fraction_coverage);
      if (this.onslide) {
        this.onslide(this.fraction_start,this.fraction_coverage);
      }
    }
  }

  end_drag_move(y) {
    if (this.dragging) {
      this.dragging = false;
      let dy = y - this.starty;
      let start_frac = this.start_frac + (dy/this.height);
      this.set_fractions(start_frac, this.fraction_coverage);
      if (this.onslide) {
        this.onslide(this.fraction_start,this.fraction_coverage);
      }
    }
  }

  set_fill(fill) {
    this.fill = fill;
  }

  get_size() {
    return { "width":this.width, "height":this.height };
  }

  get_position() {
    return { "x":this.x, "y":this.y };
  }

  update_size(width,height) {
    if (width != null) {
      this.width = width;
    }
    if (height != null) {
      this.height = height;
    }
    this.adjust();
  }

  update_position(x,y) {
    if (x != null) {
     this.x = x;
    }
    if (y != null) {
      this.y = y;
    }
    this.adjust();
  }

  adjust() {
    
    this.compute_position();

    if (this.rect) {
        this.rect.attr("x",this.x-this.width/2)
        .attr("y",this.y-this.height/2)
        .attr("width",this.width)
        .attr("height",this.height);
    }
    if (this.slider) {
        this.slider.attr("x",this.x-this.width/2)
        .attr("y",this.slider_y)
        .attr("width",this.width)
        .attr("height",this.slider_height);
    }
  }
  
  get_fraction_start() {
      return this.fraction_start;  
  }

  get_fraction_coverage() {
    return this.fraction_coverage;  
  }

  set_fractions(fraction_start,fraction_coverage) {
    if (this.fraction_coverage > 1.0) {
        this.fraction_coverage = 1.0;
    }
    this.fraction_start = fraction_start;
    this.fraction_coverage = fraction_coverage;
    if (this.fraction_start + this.fraction_coverage > 1.0) {
        this.fraction_start = 1.0 - this.fraction_coverage;
    }
    if (this.fraction_start < 0.0) {
        this.fraction_start = 0.0;
    }
    this.adjust();
  }
}