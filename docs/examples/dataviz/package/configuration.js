/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var DataVizExample = DataVizExample || {};

DataVizExample.Configuration = class {

    constructor(configuration_services) {
        this.services = configuration_services;
        this.services.add_event_handler("btn","click", () => {
            this.services.set_status_info("Clicked!");
        });
        this.services.set_attributes("content",{"innerHTML":"Hello There"});
        console.log("Constructed configuration");
    }

    open(width, height) {
        console.log("Opened configuration:"+width+","+height);
    }

    resize(width, height) {
        console.log("Resize configuration:"+width+","+height);
    }

    close() {
        console.log("Closed configuration");
    }
}