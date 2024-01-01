/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.CoreConfiguration = class {

  constructor(core, package_type, properties) {
    this.core = core;
    this.package_type = package_type;
    this.configuration_service = null;
    this.wrapper = null;
    this.properties = properties;
    this.id = package_type.get_id();
    this.pages = this.package_type.get_configuration().pages;
  }

  get_id() {
      return this.id;
  }

  get_package_type() {
      return this.package_type;
  }

  create_instance() {
      try {
          this.configuration_service = new skadi.ConfigurationService(this);
          this.wrapper = new skadi.Wrapper(this,this.configuration_service, this.package_type.get_l10n_utils());
          this.configuration_service.set_wrapper(this.wrapper);
          let configuration_factory = this.core.get_configuration_factory();
          let o = null;
          if (configuration_factory) {
              o = configuration_factory(this.configuration_service);
          } else {
              let classname = this.package_type.get_configuration_classname();
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

  get_instance() {
      return this.wrapper.get_instance();
  }

  get_page_ids() {
    let page_ids = [];
    for(let page_id in this.pages) {
       page_ids.push(page_id);
    }
    return page_ids;
  }

  get_url(page_id) {
      if (this.pages && this.pages[page_id].url) {
          return this.package_type.localise_url(this.package_type.get_resource_url(this.pages[page_id].url));
      }
      return null;
  }

  get_page(page_id) {
      return this.pages[page_id] || {};
  }
}

skadi.CoreConfiguration.deserialise = function(core,package_id,obj) {
  let package_type = core.get_schema().get_package_type(package_id);
  let configuration = new skadi.CoreConfiguration(core,package_type,obj.properties);
  configuration.create_instance();
  return configuration;
}


