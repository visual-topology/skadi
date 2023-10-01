/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiNodeType {

  constructor(nodeTypeId, package_type, schema) {
    this.id = package_type.get_qualified_id(nodeTypeId);
    this.package_type = package_type;
    this.schema = schema;
    this.package_id = package_type.get_id();
    this.enabled = schema["enabled"] !== false;
    let metadata = schema["metadata"] || { "name": nodeTypeId, "description":""};
    let display = schema["display"] || { "corners": 4, "icon": "" };
    let input_ports = schema["input_ports"] || {};
    let output_ports = schema["output_ports"] || {};
    this.page = schema["page"] || {};
    this.html_url = this.page.url ? this.package_type.get_resource_url(this.page.url) : "";

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

    this.configure_package_type(this.package_type);
  }

  get_name() {
    return this.package_type.localise(this.metadata.name);
  }

  get_description() {
    return this.package_type.localise(this.metadata.description);
  }

  get_html_url() {
    return this.package_type.localise_url(this.html_url);
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

  configure_package_type(package_type) {
    let pdisplay = package_type.get_display();
    for (let key in pdisplay) {
      if (!this.display[key]) {
        this.display[key] = pdisplay[key];
      }
    }
    if ("icon" in this.display) {
      this.image = package_type.get_url() + "/" + this.display["icon"];
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

  get_type() {
    return this.id;
  }

  get_icon_url() {
    if (this.display) {
      return this.display.icon;
    }
    return undefined;
  }

  get_display() {
    return this.display;
  }

  get_package_id() {
    return this.package_id;
  }

  get_package_type() {
    return this.package_type;
  }

  is_enabled() {
    return this.enabled;
  }
}


