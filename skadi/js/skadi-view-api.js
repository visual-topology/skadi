/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

class SkadiViewApi extends SkadiApi {

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
    init(element_id, node_factory, configuration_factory) {
        this.application = new SkadiApplication(this.l10n_utils, this.schema, element_id, node_factory, configuration_factory);
        this.set_instance(this.application);
        super.init();
    }

    /**
     * Load topology into skadi
     *
     * @param {string} topology_url - the topology to load
     */
    async load_topology(topology_url) {
        return await fetch(topology_url)
            .then(response => response.json())
            .then(topology => this.application.deserialise(topology, true));
    }

    add_node_event_handler(node_event_type, handler) {
    }

    add_link_event_handler(link_event_type, handler) {
    }

    add_design_event_handler(design_event_type, handler) {
    }

    init() {
        super.init();
        this.application.open_display();
    }
}




