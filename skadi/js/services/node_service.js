/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiNodeService {

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

    add_event_handler(element_id, event_type, callback, event_transform) {
        this.wrapper.add_event_handler(element_id, event_type, callback, event_transform);
    }

    set_attributes(element_id, attributes) {
        this.wrapper.set_attributes(element_id, attributes);
    }

    send_message(message) {
        this.wrapper.send_message(message);
    }

    set_message_handler(handler) {
        this.wrapper.set_message_handler(handler);
    }

    get_node_id() {
        return this.node_id;
    }

    set_status_info(status_msg) {
        let localised_msg = this.l10n_utils ? this.l10n_utils.localise(status_msg): status_msg;
        this.core.update_node_status(this.node_id, SkadiStatusStates.info, localised_msg);
    }

    set_status_warning(status_msg) {
        let localised_msg = this.l10n_utils ? this.l10n_utils.localise(status_msg): status_msg;
        this.core.update_node_status(this.node_id, SkadiStatusStates.warning, localised_msg);
    }

    set_status_error(status_msg) {
        let localised_msg = this.l10n_utils ? this.l10n_utils.localise(status_msg): status_msg;
        this.core.update_node_status(this.node_id, SkadiStatusStates.error, localised_msg);
    }

    clear_status() {
        this.core.update_node_status(this.node_id, SkadiStatusStates.clear, "");
    }

    resolve_url(url) {
        return this.node_type.get_package_type().get_resource_url(url);
    }

    create_data_uri(data, mime_type) {
        return "data:"+mime_type+";base64," + btoa(data);
    }

    get_configuration() {
        return this.core.get_configuration(this.node_type.get_package_type().get_id()).get_instance();
    }

    request_execution() {
        this.core.request_execution(this.node_id);
    }
}
