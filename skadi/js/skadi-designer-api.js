/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.api_home_url = document.currentScript.src.split("/").slice(0,-1).join("/");

skadi.DesignerApi = class extends skadi.Api {

    /**
     * Create a skadi graphical editor
     */
    constructor() {
        super();   
    }

    /**
     * Initialise skadi graphical editor
     *
     * @param {string} element_id - the name of the document element into which skadi will be loaded
     * @param {Number} canvas_width - the width of the canvas area
     * @param {Number} canvas_height - the height of the canvas area
     * @param {Boolean} is_acyclic - true iff the graph must be acyclic
     * @param {Object} topology_store - optional, object implementing the TopologyStore interface
     * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using backend=>classname from the schema
     * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using backend=>classname from the schema
     */
    async init(element_id, canvas_width, canvas_height, is_acyclic, topology_store,
        node_factory, configuration_factory, executor) {
        topology_store = topology_store || new skadi.TopologyStore(this);
        this.design = new skadi.Designer(this.l10n_utils, this.schema, element_id, canvas_width, canvas_height, is_acyclic, topology_store,
            node_factory, configuration_factory);
        this.set_instance(this.design);
        super.init();
        if (executor) {
            executor.bind(this.design);
        }
        await this.handle_load_topology_from();
    }

    create_configuration(package_type) {
        return new skadi.Configuration(this.instance,package_type,{});
    }

    save() {
        return this.design.serialise();
    }

    add_node(node_id, node_type_name, xc, yc, metadata) {
        let node_type = this.schema.get_node_type(node_type_name);
        this.design.create_node(node_id, node_type, xc, yc, metadata, true);
    }

    move_node(id, xc, yc) {
        this.design.update_node_position(id, xc, yc, true);
    }

    add_link(link_id, link_type, from_node_id, from_port, to_node_id, to_port) {
        let fromNode = this.design.get_node(from_node_id);
        let fromPort = fromNode.get_port(from_port);
        let toNode = this.design.get_node(to_node_id);
        let toPort = toNode.get_port(to_port);
        this.design.create_link(fromPort, toPort, link_type, link_id);
    }

    remove(id) {
        this.design.remove(id,true);
    }

    clear() {
        this.design.clear(true);
    }

    add_node_event_handler(node_event_type, handler) {
        switch(node_event_type) {
            case "add":
                this.design.add_node_event_handler(node_event_type,function(node_id,node_type, position, metadata) {
                    handler(node_id,node_type, position, metadata);
                });
                break;
            case "remove":
                this.design.add_node_event_handler(node_event_type,function(node_id,node_type) {
                    handler(node_id,node_type);
                });
                break;
            case "update_position":
                this.design.add_node_event_handler(node_event_type,function(node_id,position) {
                    handler(node_id,position);
                });
                break;
            case "update_metadata":
                this.design.add_node_event_handler(node_event_type,function(node_id,metadata) {
                    handler(node_id,metadata);
                });
                break;
            default:
                console.warn("Unhandled event type: "+node_event_type);

        }
    }

    add_link_event_handler(link_event_type, handler) {
        this.design.add_link_event_handler(link_event_type,function(link_id,link_type,from_node_id,from_port,to_node_id,to_port) {
            handler(link_id,link_type,from_node_id,from_port,to_node_id,to_port,link_type);
        });
    }

    add_design_event_handler(design_event_type, handler) {
        this.design.add_design_event_handler(design_event_type, handler);
    }
}

 /**
  * function to create a skadi graphical editor widget in a web page
  *
  * @param {string} element_id - the id of the document element into which skadi will be loaded
  * @param {string} title_id - the id of the document heading element
  * @param {string} heading_id - the id of the document title element
  * @param {Object} options - various options to customise skadi
  */
skadi.launch_designer = function(container_id, title_id, heading_id, options) {
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
            return skadi.start_designer(container_id, options, schema_urls, new skadi.GraphExecutor())
        }).then(skadi => {
            let splash = document.getElementById("splash_screen");
            if (splash) {
                setTimeout(() => {
                   splash.setAttribute("display", "false");
                }, 2000);
            }
        });
    });
}

 /**
  * Asynchronous function to create a skadi graphical editor widget
  *
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {Object} options - various options to customise skadi
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {skadi.GraphExecutor} - an executor instance for the graph or null if no executor is needed
  * @param {Number} canvas_width - the width of the canvas area
  * @param {Number} canvas_height - the height of the canvas area
  * @param {Boolean} is_acyclic - true iff the graph must be acyclic
  * @param {Object} topology_store - optional, object implementing the TopologyStore interface
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using classname from the schema
  * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using classname from the schema
  */
skadi.start_designer = async function(element_id, options, schema_urls, executor, canvas_width, canvas_height, is_acyclic, topology_store, node_factory, configuration_factory) {

    if (is_acyclic == undefined || is_acyclic == null) {
        is_acyclic = true;
    }

    let skadi_instance = new skadi.DesignerApi();
    await skadi_instance.load_l10n(options.l10n_url || skadi_api_home_url+"/l10n");
    await skadi_instance.load_schema(schema_urls);
    await skadi_instance.init(element_id || "canvas_container_id",
        canvas_width || skadi.Api.DEFAULT_CANVAS_WIDTH,
        canvas_height || skadi.Api.DEFAULT_CANVAS_HEIGHT,
        is_acyclic, topology_store, node_factory, configuration_factory, executor);

    return skadi_instance;
}



