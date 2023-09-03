/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiLink {

  constructor(design, id, fromPort, link_type, toPort) {
    this.design = design;
    this.id = id;

    this.fromPort = fromPort;
    this.toPort = toPort;

    this.fromPort.add_link(this, false);
    if (this.toPort) {
      this.toPort.add_link(this, true);
    }
    this.REMOVE_ACTION = "Remove";

    this.link_type = link_type;
    this.menu_dial = null;
  }

  get_id() {
    return this.id;
  }

  get_link_type() {
    return this.link_type;
  }

  get_from_port() {
    return this.fromPort;
  }

  get_to_port() {
    return this.toPort;
  }

  get_from_node() {
    return this.fromPort.get_node();
  }

  get_to_node() {
    return this.toPort.get_node();
  }

  remove() {
    this.fromPort.remove_link(this);
    if (this.toPort) {
      this.toPort.remove_link(this);
    }
    Skadi.x3.select("#" + this.id).remove();
    this.tooltip.remove();
  }

  draw(endx, endy) {
    let container = this.design.get_node_group();

    this.grp = container.append("g").attr("id", this.id).attr("class", "link");

    this.path = this.grp.append("path")
      .attr("id", this.id + "path")
      .attr("class", "mainpath");

    this.path.attr("stroke", this.design.get_schema().get_link_colour(this.link_type.get_id()));

    let handler = (evt) => {
      if (this.menu_dial) {
        return;
      }
      let mitems = [];
      mitems.push(new SkadiTextMenuDialogue.MenuItem(this.REMOVE_ACTION, () => {
        this.design.remove(this.get_id());
      }));
      let evloc = Skadi.x3.get_event_xy(evt);
      let tm = new SkadiTextMenuDialogue(this.design, mitems, () => { this.menu_dial = null; }, this, evloc.x - 50, evloc.y - 50);
      tm.open();
    };

    // this.path.on("click touchstart", handler);
    this.path.on("click", handler);

    this.update_position(endx, endy);
    this.update_opacity();

    this.tooltip = new SkadiTooltip(this.grp.node(),this.design.get_svg_tooltip_group().node(),this.link_type.get_name() || "");
  }

  set_opacity(opacity) {
    this.grp.attr("style", "opacity:" + opacity + ";");
  }

  update_opacity() {
    this.set_opacity(this.stopped ? 0.3 : 1.0);
  }

  update_position(endx, endy, refocus) {
    let fromPos = this.fromPort.get_position();
    let to_pos = {
      "x": endx,
      "y": endy
    };
    if (this.toPort) {
      to_pos = this.toPort.get_position();
    }
    let len = Math.sqrt(Math.pow(fromPos.x - to_pos.x, 2) + Math.pow(fromPos.y - to_pos.y, 2));
    if (this.toPort) {
      if (this.fromPort.parent == this.toPort.parent) {
        len = 500;
      }
    }

    let coordsFrom = this.fromPort.get_linkPosition(len);

    let d = "";
    if (this.toPort) {
      let coordsTo = this.toPort.get_linkPosition(len);
      let midx = coordsFrom.x2 + (coordsTo.x2 - coordsFrom.x2) / 2;
      let midy = coordsFrom.y2 + (coordsTo.y2 - coordsFrom.y2) / 2;
      d = "M" + coordsFrom.x + "," + coordsFrom.y + " L" + coordsFrom.x1 + "," + coordsFrom.y1 +
        " Q" + coordsFrom.x2 + "," + coordsFrom.y2 + " " + midx + "," + midy +
        " T" + coordsTo.x1 + "," + coordsTo.y1 + this.compute_arrow_path(coordsTo);
    } else {
      let midx = coordsFrom.x2 + (endx - coordsFrom.x2) / 2;
      let midy = coordsFrom.y2 + (endy - coordsFrom.y2) / 2;
      let coordsTo = {
        "x": endx,
        "y": endy,
        "x1": midx,
        "y1": midy
      };
      d = "M" + coordsFrom.x + "," + coordsFrom.y + " L" + coordsFrom.x1 + "," + coordsFrom.y1 +
        " Q" + coordsFrom.x2 + "," + coordsFrom.y2 + " " + midx + "," + midy +
        " L" + coordsTo.x + "," + coordsTo.y + " " + this.compute_arrow_path(coordsTo);
    }

    let sel = this.path;
    if (refocus) {
      sel = sel.transition(this.design.get_transition());
    }
    sel.attr("d", d);
  }

  compute_arrow_path(coords) {
    let theta = Math.atan2(coords.y1 - coords.y, coords.x1 - coords.x);
    if (this.toPort) {
      theta = this.toPort.get_port_angle();
    }
    let theta1 = theta - Math.PI / 6;
    let theta2 = theta + Math.PI / 6;
    let len = 15;
    let x1 = coords.x + len * Math.cos(theta1);
    let y1 = coords.y + len * Math.sin(theta1);
    let x2 = coords.x + len * Math.cos(theta2);
    let y2 = coords.y + len * Math.sin(theta2);
    let path = " M" + x1 + "," + y1 + " L" + coords.x + "," + coords.y + " L" + x2 + "," + y2;
    return path;
  }

    serialise() {
        return { "to_port":this.toPort.get_id(), "from_port":this.fromPort.get_id(), "link_type":this.link_type.get_id() };
    }

}


SkadiLink.deserialise = function(design, id,obj) {
    let fromPort = design.get_port(obj.from_port);
    let toPort = design.get_port(obj.to_port);
    let linkType = design.get_schema().get_link_type(obj.link_type);
    return new SkadiLink(design, id, fromPort, linkType, toPort);
}



  

