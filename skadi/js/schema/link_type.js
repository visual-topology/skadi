/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiLinkType {
  
  constructor(link_type_id, package_type, schema) {
    let metadata = schema["metadata"] || { "name": "?", "description":"?"};
    let display = schema["display"] || { "colour": "blue" };
    this.id = package_type.get_qualified_id(link_type_id);
    this.package_id = package_type.get_id();
    this.name = metadata.name;
    this.description = metadata.description;
    this.colour = display.colour;
  }

  get_id() {
    return this.id;
  }

  get_package_id() {
    return this.package_id;
  }

  get_name() {
    return this.name;
  }

  get_description() {
    return this.description;
  }

  get_colour() {
    return this.colour ? this.colour : "grey";
  }

}

