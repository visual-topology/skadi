/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.Wrapper = class {

    constructor(target, services, l10n_utils) {
        this.target = target;
        this.services = services;
        this.l10n_utils = l10n_utils;
        this.instance = null;
        this.page_services = {};
    }

    set_instance(instance) {
        this.instance = instance;
    }

    get_instance() {
        return this.instance;
    }

    get_property(property_name, default_value) {
        if (property_name in this.target.properties) {
            return this.target.properties[property_name];
        }
        return default_value;
    }

    set_property(property_name, property_value) {
        this.target.properties[property_name] = property_value;
        this.target.core.autosave();
    }

    open(window, page_id) {
        this.page_services[page_id] = new skadi.PageService(this,window,this.l10n_utils);
        if (this.instance.page_open) {
            try {
                this.instance.page_open(page_id, this.page_services[page_id]);
            } catch(e) {
                console.error(e);
            }
        }
    }

    close(page_id) {
        if (this.instance.page_close) {
            try {
                this.instance.page_close(page_id, this.page_services[page_id]);
            } catch(e) {
                console.error(e);
            }
        }
        this.page_services[page_id].close();
        delete this.page_services[page_id];
    }

    remove() {
        if (this.instance.remove) {
            try {
                this.instance.remove();
            } catch(e) {
                console.error(e);
            }
        }
    }
}