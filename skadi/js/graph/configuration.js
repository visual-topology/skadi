/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiConfiguration extends SkadiCoreConfiguration {

  constructor(design, package_type, properties) {
      super(design, package_type, properties);
  }

  open(iframe, w, h) {
      this.iframe = iframe;
      this.iframe.setAttribute("width",""+w-20);
      this.iframe.setAttribute("height",""+h-20);
      this.wrapper.open(iframe.contentWindow);
      this.wrapper.resize(w-20, h-20);
  }

  resize(w,h) {
      if (this.iframe) {
          this.iframe.setAttribute("width", "" + w - 20);
          this.iframe.setAttribute("height", "" + h - 20);
          this.wrapper.resize(w, h);
      }
  }

  close() {
      this.iframe = null;
      this.wrapper.close();
  }
}

SkadiConfiguration.deserialise = function(design,package_id,obj) {
  let package_type = design.get_schema().get_package_type(package_id);
  let configuration = new SkadiConfiguration(design,package_type,obj.properties);
  configuration.create_instance();
  return configuration;
}


