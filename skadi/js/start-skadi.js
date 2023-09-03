/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

 /**
  * Asynchronous function to create a skadi graphical editor widget
  *
  * @param {array} schema_urls - an array containing the URLs of one or more schema files to load
  * @param {string} element_id - the name of the document element into which skadi will be loaded
  * @param {Object} canvas_width - the width of the canvas area
  * @param {Number} canvas_height - the height of the canvas area
  * @param {Boolean} is_acyclic - true iff the graph must be acyclic
  * @param {Object} topology_store - optional, object implementing the TopologyStore interface
  * @param {Function} node_factory - optional, a function to construct node instances given a service object, rather than using backend=>classname from the schema
  */
async function start_skadi(schema_urls, element_id, canvas_width, canvas_height, is_acyclic, topology_store, node_factory) {

    if (is_acyclic == undefined || is_acyclic == null) {
        is_acyclic = true;
    }

    let skadi_instance = new SkadiApi(element_id || "canvas_container_id",
        canvas_width || SkadiApi.DEFAULT_CANVAS_WIDTH, canvas_height || SkadiApi.DEFAULT_CANVAS_HEIGHT, is_acyclic, topology_store, node_factory);
    await skadi_instance.load_schema(schema_urls);

    return skadi_instance;
}


