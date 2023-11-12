/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.X3Drag = class {

  constructor() {
    this.callbacks = {};
    this.elt = null;
    this.drag_overlay = document.getElementById("drag_overlay");
    this.start_time = null;
    this.start_pos = null;
  }

  set_element(elt) {
    this.elt = elt;
    let that = this;
    this.elt.onmousedown = function(evt) {
      that.start(evt);
    }
  }

  on(event,callback) {
    this.callbacks[event] = callback;
    return this;
  }

  start(evt) {
    let that = this;
    this.start_time = Date.now();
    evt.stopPropagation();

    document.onmousemove = function(evt) {
      that.initial_move(evt);
    }

    document.onmouseup = function(evt) {
      that.initial_mouseup(evt);
    }

    let pos =  skadi.x3.get_event_xy(evt);
    this.start_pos = pos;
  }

  initial_move(evt) {
    document.onmousemove = null;
    document.onmouseup = null;
    this.enable_drag_overlay();
  }

  initial_mouseup(evt) {
    document.onmousemove = null;
    document.onmouseup = null;
  }

  enable_drag_overlay() {
    let that = this;
    this.drag_overlay.style = "pointer-events:all;";
    this.drag_overlay.setAttribute("width","100%");
    this.drag_overlay.setAttribute("height", "100%");

    this.drag_overlay.onmousemove = function(evt) {
      that.move(evt);
    }
    this.drag_overlay.onmouseup = function(evt) {
      that.end(evt);
    }
    this.drag_overlay_enabled = true;
  }

  start_cb() {
    if ("start" in this.callbacks) {
      this.callbacks["start"](this.start_pos.x,this.start_pos.y);
    }
    if ("start_abs" in this.callbacks) {
      this.callbacks["start_abs"](this.start_pos.ax,this.start_pos.ay);
    }
  }

  move(evt) {
    let elapsed_ms = Date.now() - this.start_time;
    if (elapsed_ms < 200) {
      return;
    }
    if (this.start_pos) {
      this.start_cb();
      this.start_pos = null;
    }
    evt.preventDefault();
    evt.stopPropagation();
    let pos =  skadi.x3.get_event_xy(evt);
    if ("drag" in this.callbacks) {
      this.callbacks["drag"](pos.x,pos.y);
    }
    if ("drag_abs" in this.callbacks) {
      this.callbacks["drag_abs"](pos.ax,pos.ay);
    }
  }

  end(evt) {
    let elapsed_ms = Date.now() - this.start_time;
    if (elapsed_ms < 200) {
      // ignore drag end, this event should be followed by a click
    } else {
      if (this.start_pos) {
        this.start_cb();
        this.start_pos = null;
      }
      let pos =  skadi.x3.get_event_xy(evt);
      evt.preventDefault();
      evt.stopPropagation();
      if ("end" in this.callbacks) {
        this.callbacks["end"](pos.x, pos.y);
      }
      if ("end_abs" in this.callbacks) {
        this.callbacks["end_abs"](pos.ax, pos.ay);
      }
    }
    this.drag_overlay.style = "pointer-events:none;";
    this.drag_overlay.setAttribute("width",0);
    this.drag_overlay.setAttribute("height", 0);
    this.drag_overlay.onmousemove = null;
    this.drag_overlay.onmouseup = null;
  }
}

skadi.X3Selection = class {
  
  constructor(elts) {
    this.svg_xmlns = "http://www.w3.org/2000/svg";
    this.xlink_xmlns = "http://www.w3.org/1999/xlink";
    this.html_xmlns = "http://www.w3.org/1999/xhtml";
    this.elts = [];
    this.stylestr = "";

    for(let idx=0; idx<elts.length; idx++) {
      this.elts.push(elts[idx]);
    }
  }

  add_node(node) {
    this.elts.push(node);
  }

  remove() {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].remove();
    }
    this.elts = [];
    return this;
  }

  is_svg(tag) {
    return  skadi.x3.svg_tags.includes(tag);
  }

  append(tag) {
    let newSelection = new skadi.X3Selection([]);
    for(let idx=0; idx<this.elts.length; idx++) {
      let n;
      if (this.is_svg(tag)) {
        n = document.createElementNS(this.svg_xmlns,tag);
      } else {
        if (tag == "href") {
          n = document.createElementNS(this.xlink_xmlns,tag);
        } else {
          n = document.createElementNS(this.html_xmlns,tag);
        }
      }
      this.elts[idx].appendChild(n);
      newSelection.add_node(n);
    }
    return newSelection;
  }

  attr(name,value) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].setAttribute(name,value);
    }
    return this;
  }

  attr_ns(namespace, name,value) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].setAttributeNS(namespace, name,value);
    }
    return this;
  }

  text(txt) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].innerHTML = "";
      let tn = document.createTextNode(txt);
      this.elts[idx].appendChild(tn);
    }
    return this;
  }

  html(inner_html) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].innerHTML = inner_html;
    }
  }

  node() {
    if (this.elts) {
      return this.elts[0];
    } else {
      return null;
    }
  }

  style(name,value) {
    if (this.stylestr) {
      this.stylestr += " ";
    }
    this.stylestr += name;
    this.stylestr += ":";
    this.stylestr += value;
    this.stylestr += ";";

    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].setAttribute("style",this.stylestr);
    }
    return this;
  }

  call(drag) {
    if (this.elts.length == 1) {
      drag.set_element(this.elts[0]);
    } else {
      console.log("Unable to set up drag handler, not exactly 1 element in selection");
    }
  }

  on(event,callback) {
    for(let idx=0; idx<this.elts.length; idx++) {
      this.elts[idx].addEventListener(event,callback);
    }
    return this;
  }

  ignore_mouse_events() {
    ["mousemove"].forEach(event_type =>
        this.on(event_type, evt => {
            evt.stopPropagation();
            evt.preventDefault();
        }));
    }
}

skadi.X3 = class {

  constructor() {
  }

  select(selector) {
    let elts = document.querySelectorAll(selector);
    return new skadi.X3Selection(elts);
  }

  get_node_pos(elt) {
    let body = this.select('body').node();

    let x = 0;
    let y = 0;

    while(elt != null && elt != body) {
      x += (elt.offsetLeft || elt.clientLeft);
      y += (elt.offsetTop || elt.clientTop);
      elt = (elt.offsetParent || elt.parentNode);
    }

    return { "x": x, "y": y };
  }

  get_event_xy(e) {
    let pos = {};
    pos.x = e.clientX;
    pos.y = e.clientY;
    pos.ax = pos.x + window.scrollX;
    pos.ay = pos.y + window.scrollY;
    return pos;
  }

}

skadi.x3 = new skadi.X3();
skadi.x3.drag = function() { return new skadi.X3Drag(); }

skadi.$ = (id) => {
    return document.getElementById(id);
}

skadi.$$ = (selector) => {
    return skadi.x3.select(selector);
}

skadi.x3.svg_tags = [
	"a",
	"altGlyph",
	"altGlyphDef",
	"altGlyphItem",
	"animate",
	"animateColor",
	"animateMotion",
	"animateTransform",
	"circle",
	"clipPath",
	"color-profile",
	"cursor",
	"defs",
	"desc",
	"ellipse",
	"feBlend",
	"feColorMatrix",
	"feComponentTransfer",
	"feComposite",
	"feConvolveMatrix",
	"feDiffuseLighting",
	"feDisplacementMap",
	"feDistantLight",
	"feFlood",
	"feFuncA",
	"feFuncB",
	"feFuncG",
	"feFuncR",
	"feGaussianBlur",
	"feImage",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"fePointLight",
	"feSpecularLighting",
	"feSpotLight",
	"feTile",
	"feTurbulence",
	"filter",
	"font",
	"font-face",
	"font-face-format",
	"font-face-name",
	"font-face-src",
	"font-face-uri",
	"foreignObject",
	"g",
	"glyph",
	"glyphRef",
	"hkern",
	"image",
	"line",
	"linearGradient",
	"marker",
	"mask",
	"metadata",
	"missing-glyph",
	"mpath",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"radialGradient",
	"rect",
	"script",
	"set",
	"stop",
	"style",
	"svg",
	"switch",
	"symbol",
	"text",
	"textPath",
	"title",
	"tref",
	"tspan",
	"use",
	"view",
	"vkern"
];

