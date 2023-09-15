/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

 /**
  * Asynchronous function to create a skadi graphical editor widget
  *
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {Object} canvas_width - the width of the canvas area
  * @param {Number} canvas_height - the height of the canvas area
  * @param {Boolean} is_acyclic - true iff the graph must be acyclic
  * @param {Object} topology_store - optional, object implementing the TopologyStore interface
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using classname from the schema
  * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using classname from the schema
  */
async function start_skadi_designer(element_id, schema_urls, canvas_width, canvas_height, is_acyclic, topology_store, node_factory, configuration_factory) {

    if (is_acyclic == undefined || is_acyclic == null) {
        is_acyclic = true;
    }

    let skadi_instance = new SkadiDesignerApi(element_id || "canvas_container_id",
        canvas_width || SkadiApi.DEFAULT_CANVAS_WIDTH, canvas_height || SkadiApi.DEFAULT_CANVAS_HEIGHT, is_acyclic, topology_store, node_factory, configuration_factory);
    await skadi_instance.load_schema(schema_urls);
    skadi_instance.init();
    return skadi_instance;
}

 /**
  * Asynchronous function to create a skadi graphical editor widget
  *
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {array} topology_url - url for a topology to load
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using classname from the schema
  * @param {Function} configuration_factory - optional, a function to construct configuration instances given a service object, rather than using classname from the schema
  */
async function start_skadi_application(element_id, schema_urls, topology_url, node_factory, configuration_factory) {

    let skadi_instance = new SkadiViewApi(element_id, node_factory, configuration_factory);
    await skadi_instance.load_schema(schema_urls);
    if (topology_url) {
        await skadi_instance.load_topology(topology_url);
    }
    skadi_instance.init();
    return skadi_instance;
}


