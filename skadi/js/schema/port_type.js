/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.PortType = class {
  
  constructor(direction) {
    this.direction = direction;
    this.link_type = "";
    this.metadata = {};
    this.allow_multiple_connections = null;
  }

  deserialise(obj) {
    if (obj["link_type"]) {
      this.link_type = obj["link_type"];
    }
    if (obj["metadata"]) {
      this.metadata = obj["metadata"];
    }
    if ("allow_multiple_connections" in obj) {
      this.allow_multiple_connections = obj["allow_multiple_connections"];
    } else {
      this.allow_multiple_connections = true;
    }
  }

  serialise() {
    let result = {};
    result["channel_type"] = this.link_type;
    result["metadata"] = this.metadata;
    return result;
  }

  get_link_type() {
    return this.link_type;
  }

  get_allow_multiple_connections() {
    return this.allow_multiple_connections;
  }
}

