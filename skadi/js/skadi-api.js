/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

class SkadiApi {

    constructor() {
        this.schema = null;
        this.instance = null; // designer or application
    }

    async load_l10n(api_base_url) {
        this.l10n_utils = new SkadiL10NUtils(api_base_url+"/l10n");
        await this.l10n_utils.initialise("en");
    }

    set_instance(designer_or_application) {
        this.instance = designer_or_application;
    }

    /**
     * Load schemas into skadi
     *
     * @param {Array} package_urls - an array of urls pointing to schema files
     */
    async load_schema(package_urls) {
        async function loadPackageFromUrl(url,schema) {
            return await fetch(url)
                .then(response => response.json())
                .then(schema_config => schema.loadPackage(url, schema_config));
        }

        this.schema = new SkadiSchema();
        let packages = [];
        for (let idx = 0; idx < package_urls.length; idx++) {
            packages.push(await loadPackageFromUrl(package_urls[idx],this.schema));
        }
        return packages;
    }

    init() {
        // load up configurations for any packages that specify them
        for(let package_id in this.schema.package_types) {
            let package_type = this.schema.package_types[package_id];
            if (package_type.get_configuration_classname()) {
                let conf = new SkadiConfiguration(this.instance,package_type,{});
                conf.create_instance();
                this.instance.add_configuration(conf);
            }
        }
    }

    get_schema() {
        return this.schema;
    }

    get_l10n_utils() {
        return this.l10n_utils;
    }

    set_graph_executor(executor) {
        this.instance.set_graph_executor(executor);
    }

    get_network() {
        return this.instance.get_network();
    }

    set_status(node_id, status_msg, state) {
        this.instance.update_node_status(node_id, state, status_msg);
    }

    set_configuration_status(package_id, status_msg, state) {
        this.instance.update_configuration_status(package_id, state, status_msg);
    }

    update_execution_state(node_id, state) {
        this.instance.update_execution_state(node_id, state);
    }

    execution_complete() {
        this.instance.execution_complete();
    }

    get_version() {
        return "${SKADI-VERSION}"; // placeholder substituted with actual version by the build.py script
    }

}

SkadiApi.STATUS_STATE_INFO = "info";
SkadiApi.STATUS_STATE_WARNING = "warning";
SkadiApi.STATUS_STATE_ERROR = "error";
SkadiApi.STATUS_STATE_CLEAR = "";

SkadiApi.EXECUTION_STATE_PENDING = "pending";
SkadiApi.EXECUTION_STATE_EXECUTING = "executing";
SkadiApi.EXECUTION_STATE_EXECUTED = "executed";
SkadiApi.EXECUTION_STATE_FAILED = "failed";
SkadiApi.EXECUTION_STATE_CLEAR = "";

SkadiApi.DEFAULT_CANVAS_WIDTH = 4000;
SkadiApi.DEFAULT_CANVAS_HEIGHT = 2000;


