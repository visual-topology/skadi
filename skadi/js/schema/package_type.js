/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.PackageType = class {
  
  constructor(id, url, obj) {
    this.id = id;
    this.metadata = obj["metadata"];
    this.display = obj["display"];
    this.l10n = obj["l10n"];
    this.base_url = "";
    if (!url.startsWith("http")) {
      this.base_url = window.location.protocol+window.location.host;
    }
    this.base_url += url;
    this.configuration = obj["configuration"];
    this.l10n_utils = null;
  }

  async load_l10n() {
    if (this.l10n) {
      this.l10n_utils = new skadi.L10NUtils("package."+this.id, this.base_url);
      this.l10n_utils.configure_for_package(this.l10n);
      await this.l10n_utils.initialise();
    }
  }

  get_id() {
    return this.id;
  }

  get_name() {
    return this.localise(this.metadata["name"]);
  }

  get_description() {
    return this.localise(this.metadata["description"]);
  }

  get_metadata() {
    return this.metadata;
  }

  get_display() {
    return this.display;
  }

  get_configuration_classname() {
    if (this.configuration && this.configuration.classname) {
      return this.configuration.classname;
    }
    return "";
  }

  get_url() {
    return this.metadata["url"];
  }

  get_resource_url(url) {
    let resource_url =  new URL(url,this.base_url);
    return String(resource_url);
  }

  get_qualified_id(id) {
    return this.id + ":" + id;
  }

  get_configuration() {
    return this.configuration;
  }

  get_l10n_utils() {
      return this.l10n_utils;
  }

  localise(txt) {
    if (this.l10n_utils) {
      return this.l10n_utils.localise(txt);
    } else {
      return txt;
    }
  }

  localise_url(url) {
    if (this.l10n_utils) {
      return url.replace("{language}",this.l10n_utils.get_language());
    } else {
      return url;
    }
  }
}

