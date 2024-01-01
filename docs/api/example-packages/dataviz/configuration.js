/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var DataVizExample = DataVizExample || {};

DataVizExample.Configuration = class {

    constructor(configuration_services) {
        this.services = configuration_services;
        this.update_callbacks = [];
    }

    page_open(page_id,page_service) {
        let themes = ["quartz","excel","ggplot2","vox","fivethirtyeight","dark","latimes","urbaninstitute","googlecharts","powerbi","carbonwhite","carbong10","carbong90","carbong100"]
        let attrs = {
            "options":JSON.stringify(themes.map(t => [t,t])),
            "value":this.services.get_property("theme","quartz")};
        page_service.set_attributes("select_theme",attrs);
        page_service.add_event_handler("select_theme","change", (v) => {
            this.services.set_property("theme",v);
            this.updated();
        });
    }

    page_close(page_id,page_service) {
    }

    get_theme() {
        return this.services.get_property("theme","quartz");
    }

    register_update_callback(callback) {
        console.log("registered callback");
        this.update_callbacks.push(callback);
    }

    unregister_update_callback(callback) {
        const idx = this.update_callbacks.indexOf(callback);
        if (idx > -1) {
            console.log("removed callback");
            this.update_callbacks.splice(idx,1);
        }
    }

    updated() {
        this.update_callbacks.forEach(callback => {
            try {
                callback();
            } catch(e) {
                console.error(e);
            }
        });
    }
}