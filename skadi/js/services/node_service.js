/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.NodeService = class {

    constructor(node) {
        this.core = node.core;
        this.node_id = node.id;
        this.node_type = node.node_type;
        this.l10n_utils = this.node_type.get_package_type().get_l10n_utils();
        this.wrapper = null;
    }

    set_wrapper(wrapper) {
        this.wrapper = wrapper;
    }

    get_property(property_name, default_value) {
        return this.wrapper.get_property(property_name, default_value);
    }

    set_property(property_name, property_value) {
        this.wrapper.set_property(property_name, property_value);
    }

    get_node_id() {
        return this.node_id;
    }

    set_status_info(status_msg) {
        let localised_msg = this.l10n_utils ? this.l10n_utils.localise(status_msg): status_msg;
        this.core.update_node_status(this.node_id, skadi.StatusStates.info, localised_msg);
    }

    set_status_warning(status_msg) {
        let localised_msg = this.l10n_utils ? this.l10n_utils.localise(status_msg): status_msg;
        this.core.update_node_status(this.node_id, skadi.StatusStates.warning, localised_msg);
    }

    set_status_error(status_msg) {
        let localised_msg = this.l10n_utils ? this.l10n_utils.localise(status_msg): status_msg;
        this.core.update_node_status(this.node_id, skadi.StatusStates.error, localised_msg);
    }

    clear_status() {
        this.core.update_node_status(this.node_id, skadi.StatusStates.clear, "");
    }

    resolve_url(url) {
        return this.node_type.get_package_type().get_resource_url(url);
    }

    create_data_uri(data, mime_type) {
        return "data:"+mime_type+";base64," + btoa(data);
    }

    get_data(key) {
        let save_id = this.core.get_autosave_id();
        let is_temporary = false;
        if (!save_id) {
            save_id = this.core.get_id();
            is_temporary = true;
        }
        let folder = new skadi.DirectoryLike("/skadi/storage/"+save_id+"/node/"+this.node_id, is_temporary);
        let fileinfo = folder.get_file_info(key);
        if (fileinfo) {
            let path = fileinfo.path;
            let metadata = fileinfo.metadata;
            let mode = metadata.type === "binary" ? "rb" : "b";
            let fl = new skadi.FileLike(path, mode, is_temporary);
            return fl.read();
        } else {
            return null;
        }
    }

    set_data(key, data) {
        let save_id = this.core.get_autosave_id();
        let is_temporary = false;
        if (!save_id) {
            save_id = this.core.get_id();
            is_temporary = true;
        }
        let folder = new skadi.DirectoryLike("/skadi/storage/"+save_id+"/node/"+this.node_id, is_temporary);
        if (data !== null && data !== undefined) {
            let type = "";
            if (data instanceof ArrayBuffer) {
                type = "binary";
            } else if (data instanceof String) {
                type = "string";
            } else {
                throw new Error("data must be either String or ArrayBuffer")
            }
            let path = folder.add_file(key, {"type":type});
            let mode = type === "binary" ? "wb": "w";
            let fl = new skadi.FileLike(path, mode, is_temporary);
            fl.write(data);
        } else {
            folder.remove_file(key);
        }
    }

    get_configuration() {
        return this.core.get_configuration(this.node_type.get_package_type().get_id()).get_instance();
    }

    request_execution() {
        this.core.request_execution(this.node_id);
    }
}
