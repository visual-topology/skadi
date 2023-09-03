/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiPackageType {
  
  constructor(id, url, obj) {
    this.id = id;
    this.metadata = obj["metadata"];
    this.display = obj["display"];
    this.base_url = url.split("/").slice(0,-1).join("/");
    this.configuration = obj["configuration"];
  }

  get_id() {
    return this.id;
  }

  get_name() {
    return this.metadata["name"];
  }

  get_description() {
    return this.metadata["description"];
  }

  get_metadata() {
    return this.metadata;
  }

  get_display() {
    return this.display;
  }

  get_url() {
    return this.metadata["url"];
  }

  get_resource_url(url) {
    if (url.startsWith("http")  || url.startsWith("/")) {
        return url;
    }
    let resource_url = this.base_url;
    if (resource_url.length>0) {
      resource_url += "/";
    }
    resource_url += url;
    return resource_url;
  }

  get_qualified_id(id) {
    return this.id + ":" + id;
  }

  get_configuration() {
    return this.configuration;
  }
}

