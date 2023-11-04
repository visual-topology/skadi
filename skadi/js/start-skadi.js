/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let skadi_api_home_url = document.currentScript.src.split("/").slice(0,-1).join("/");

 /**
  * function to create a skadi graphical editor widget in a web page
  *
  * @param {string} element_id - the id of the document element into which skadi will be loaded
  * @param {string} title_id - the id of the document heading element
  * @param {string} heading_id - the id of the document title element
  * @param {Object} options - various options to customise skadi
  */
function launch_skadi_designer(container_id, title_id, heading_id, options) {
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
        fetch(load_url).then(r => r.json()).then(load_obj => {
            if (load_obj.title) {
                document.getElementById(title_id).appendChild(document.createTextNode(load_obj.title));
                document.getElementById(heading_id).appendChild(document.createTextNode(load_obj.title));
            }
            let schema_urls = load_obj.schemas.map(schema_url => String(new URL(schema_url,new URL(load_url,window.location))));
            return start_skadi_designer(container_id, options, schema_urls, new SkadiGraphExecutor())
            }).then(skadi => {
                setTimeout(() => {
                    document.getElementById("splash_screen").setAttribute("display","false");
                },2000);
            });
    });
}

 /**
  * Asynchronous function to create a skadi graphical editor widget
  *
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {Object} options - various options to customise skadi
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {SkadiGraphExecutor} - an executor instance for the graph or null if no executor is needed
  * @param {Number} canvas_width - the width of the canvas area
  * @param {Number} canvas_height - the height of the canvas area
  * @param {Boolean} is_acyclic - true iff the graph must be acyclic
  * @param {Object} topology_store - optional, object implementing the TopologyStore interface
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using classname from the schema
  * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using classname from the schema
  */
async function start_skadi_designer(element_id, options, schema_urls, executor, canvas_width, canvas_height, is_acyclic, topology_store, node_factory, configuration_factory) {

    if (is_acyclic == undefined || is_acyclic == null) {
        is_acyclic = true;
    }

    let skadi_instance = new SkadiDesignerApi();
    await skadi_instance.load_l10n(options.l10n_url || skadi_api_home_url+"/l10n");
    await skadi_instance.load_schema(schema_urls);
    await skadi_instance.init(element_id || "canvas_container_id",
        canvas_width || SkadiApi.DEFAULT_CANVAS_WIDTH, 
        canvas_height || SkadiApi.DEFAULT_CANVAS_HEIGHT, 
        is_acyclic, topology_store, node_factory, configuration_factory, executor);

    return skadi_instance;
}

 /**
  * function to create a skadi application widget in a web page
  *
  * @param {string} container_id - the id of the document element into which skadi will be loaded
  * @param {string} title_id - the id of the document heading element
  * @param {string} heading_id - the id of the document title element
  * @param {Object} options - various options to customise skadi
  */
function launch_skadi_application(container_id, title_id, heading_id, options) {
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
            start_skadi_application(container_id, options, schema_urls, new SkadiGraphExecutor()).then(skadi => {
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
  * @param {SkadiGraphExecutor} - an executor instance for the graph or null if no executor is needed
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using classname from the schema
  * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using classname from the schema
  */
async function start_skadi_application(element_id, options, schema_urls, executor, node_factory, configuration_factory) {
    let skadi_instance = new SkadiViewApi();
    await skadi_instance.load_l10n(options.l10n_url || skadi_api_home_url+"/l10n");
    await skadi_instance.load_schema(schema_urls);
    await skadi_instance.init(element_id, node_factory, configuration_factory, executor);
    skadi_instance.open();
    return skadi_instance;
}


