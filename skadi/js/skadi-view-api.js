/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.api_home_url = document.currentScript.src.split("/").slice(0,-1).join("/");

skadi.ViewApi = class extends skadi.Api {

    /**
     * Create a skadi application view
     */
    constructor() {
        super();    
    }

    /**
     * Initialise skadi application view
     *
     * @param {string} element_id - the name of the document element into which skadi will be loaded
     * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using backend=>classname from the schema
     * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using backend=>classname from the schema
     */
    async init(element_id, node_factory, configuration_factory, executor) {
        this.application = new skadi.Application(this.l10n_utils, this.schema, element_id, node_factory, configuration_factory);
        this.set_instance(this.application);
        super.init();
        if (executor) {
            executor.bind(this.application);
        }
        await this.handle_load_topology_from();
    }

    add_node_event_handler(node_event_type, handler) {
    }

    add_link_event_handler(link_event_type, handler) {
    }

    add_design_event_handler(design_event_type, handler) {
    }

    open() {
        this.application.open_display();
    }
}


 /**
  * function to create a skadi application widget in a web page
  *
  * @param {string} container_id - the id of the document element into which skadi will be loaded
  * @param {string} title_id - the id of the document heading element
  * @param {string} heading_id - the id of the document title element
  * @param {Object} options - various options to customise skadi
  */
skadi.launch_application = function(container_id, title_id, heading_id, options) {
    options = options || {};
    let url_params = new URLSearchParams(window.location.search);
    // check for a configuration to load
    let load_url = "app-configuration.json";
    let configure_from_url = url_params.get("configure_from");
    if (configure_from_url) {
        let configure_from_url_origin = new URL(configure_from_url,window.location).origin;
        if (configure_from_url_origin != window.location.origin) {
            console.error("unable to configure skadi from different origin:"+configure_from_url_origin);
        } else {
            load_url = configure_from_url;
        }
    }
    window.addEventListener("load",(evt) => {
        fetch(load_url).then(r => r.json()).then(o => {
            if (o.title) {
                document.getElementById(title_id).appendChild(document.createTextNode(o.title));
                document.getElementById(heading_id).appendChild(document.createTextNode(o.title));
            }
            let schema_urls = o.schemas.map(schema_url => String(new URL(schema_url,new URL(load_url,window.location))));
            skadi.start_application(container_id, options, schema_urls, new skadi.GraphExecutor()).then(skadi => {
                setTimeout(() => {
                    document.getElementById("splash_screen").setAttribute("display","false");
                },2000);
            });
        });
    });
}

 /**
  * Asynchronous function to create a skadi application widget
  *
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {Object} options - various options to customise skadi
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {skadi.GraphExecutor} - an executor instance for the graph or null if no executor is needed
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using classname from the schema
  * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using classname from the schema
  */
skadi.start_application = async function(element_id, options, schema_urls, executor, node_factory, configuration_factory) {
    let skadi_instance = new skadi.ViewApi();
    await skadi_instance.load_l10n(options.l10n_url || skadi.api_home_url+"/l10n");
    await skadi_instance.load_schema(schema_urls);
    await skadi_instance.init(element_id, node_factory, configuration_factory, executor);
    skadi_instance.open();
    return skadi_instance;
}




