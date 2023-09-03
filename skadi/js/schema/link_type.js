/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiLinkType {
  
  constructor(linkTypeId, packageType, schema) {
    let metadata = schema["metadata"] || { "name": "?", "description":"?"};
    let display = schema["display"] || { "colour": "blue" };


    this.id = packageType.get_qualified_id(linkTypeId);
    this.packageId = packageType.get_id();
    this.name = metadata.name;
    this.description = metadata.description;
    this.colour = display.colour;
  }

  get_id() {
    return this.id;
  }

  get_package_id() {
    return this.packageId;
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

