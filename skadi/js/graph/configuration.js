/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiConfiguration {

  constructor(design, package_type, properties) {
    this.design = design;
    this.package_type = package_type;
    this.configuration_service = null;
    this.wrapper = null;
    this.properties = properties;
    this.id = package_type.get_id();
  }

  get_id() {
      return this.id;
  }

  create_instance() {
      try {
          this.configuration_service = new SkadiConfigurationService(this);
          this.wrapper = new SkadiWrapper(this,this.configuration_service);
          this.configuration_service.set_wrapper(this.wrapper);
          let configuration_factory = this.design.get_configuration_factory();
          let o = null;
          if (configuration_factory) {
              o = configuration_factory(this.configuration_service);
          } else {
              let classname = this.package_type.get_classname();
              let cls = eval(classname);
              o = new cls(this.configuration_service);
          }
          this.wrapper.set_instance(o);
      } catch (e) {
          console.error(e);
          return false;
      }
      return true;
  }

  get_wrapper() {
    return this.wrapper;
  }
}

SkadiConfiguration.deserialise = function(design,package_id,obj) {
  let package_type = design.get_schema().get_package_type(package_id);
  let configuration = new SkadiConfiguration(design,package_type,obj.properties);
  configuration.create_instance();
  return configuration;
}


