/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiNodeType {

  constructor(nodeTypeId, packageType, schema) {
    this.id = packageType.get_qualified_id(nodeTypeId);
    this.packageType = packageType;
    this.schema = schema;
    this.packageId = packageType.get_id();
    this.enabled = schema["enabled"] !== false;
    let metadata = schema["metadata"] || { "name": nodeTypeId, "description":""};
    let display = schema["display"] || { "corners": 4, "icon": "", "html": "" };
    let input_ports = schema["input_ports"] || {};
    let output_ports = schema["output_ports"] || {};
    this.page = schema["page"] || {};
    this.html_url = this.page.url ? this.packageType.get_resource_url(this.page.url) : "";

    this.classname = schema["classname"] || {};

    this.metadata = metadata;
    this.input_ports = {};
    this.output_ports = {};

    for (let key in input_ports) {
      let pt = new SkadiPortType("input");
      pt.deserialise(input_ports[key]);
      this.input_ports[key] = pt;
    }

    for (let key in output_ports) {
      let pt = new SkadiPortType("output");
      pt.deserialise(output_ports[key]);
      this.output_ports[key] = pt;
    }

    this.hide = false;
    this.display = display;

    this.configure_package_type(this.packageType);
  }

  get_html_url() {
    return this.html_url;
  }

  get_schema() {
    return this.schema;
  }

  get_page() {
    return this.page;
  }

  get_classname() {
    return this.classname;
  }

  configure_package_type(packageType) {
    let pdisplay = packageType.get_display();
    for (let key in pdisplay) {
      if (!this.display[key]) {
        this.display[key] = pdisplay[key];
      }
    }
    if ("icon" in this.display) {
      this.image = packageType.get_url() + "/" + this.display["icon"];
    } else {
      this.image = "";
    }
    if ("style" in this.display) {
      this.style = this.display["style"];
    } else {
      this.style = "";
    }
  }

  get_id() {
    return this.id;
  }

  get_label() {
    return this.metadata["name"];
  }

  get_type() {
    return this.id;
  }

  get_display() {
    return this.display;
  }

  get_package_id() {
    return this.packageId;
  }

  get_package_type() {
    return this.packageType;
  }

  is_enabled() {
    return this.enabled;
  }
}


