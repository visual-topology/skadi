/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

class SkadiCoreLink {

  constructor(core, id, from_node, from_port_name, link_type, to_node, to_port_name) {
    this.core = core;
    this.id = id;

    this.from_node = from_node;
    this.to_node = to_node;

    this.from_port_name = from_port_name;
    this.to_port_name = to_port_name;

    this.link_type = link_type;

  }

  get_id() {
    return this.id;
  }

  get_link_type() {
    return this.link_type;
  }

  get_from_node() {
    return this.from_node;
  }

  get_from_port_name() {
    return this.from_port_name;
  }

  get_to_node() {
    return this.to_node;
  }

  get_to_port_name() {
    return this.to_port_name;
  }
}

SkadiCoreLink.deserialise = function(core, id,obj) {

    let from_port = core.get_network().extract_address(obj.from_port);
    let to_port = core.get_network().extract_address(obj.to_port);
    let from_node = core.get_network().get_node(from_port.node);
    let to_node = core.get_network().get_node(to_port.node);

    let linkType = core.get_schema().get_link_type(obj.link_type);
    return new SkadiCoreLink(core, id, from_node, from_port.port, linkType, to_node, to_port.port);
}





