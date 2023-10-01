/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var DataVizExample = DataVizExample || {};

DataVizExample.Configuration = class {

    constructor(configuration_services) {
        this.services = configuration_services;
        let attrs = {
            "options":JSON.stringify([
                ["quartz","quartz"],
                ["excel","excel"],
                ["ggplot2","ggplot2"],
                ["fivethirtyeight","fivethirtyeight"]
            ]),
            "value":this.services.get_property("theme","quartz")};
        this.services.page_set_attributes("select_theme",attrs);
        this.services.page_add_event_handler("select_theme","change", (v) => {
            this.services.set_property("theme",v);
            this.services.page_set_attributes("select_theme",{"value": v});
        });
    }

    page_open() {

    }

    page_resize(width, height) {
    }

    page_close() {
    }

    get_theme() {
        return this.services.get_property("theme","quartz");
    }
}