/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiConfigurationService {

    constructor(configuration) {
        this.core = configuration.core;
        this.package_type = configuration.package_type;
        this.package_id = this.package_type.get_id();
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

    get_package_id() {
        return this.package_id;
    }

    set_status_info(status_msg) {
        this.core.update_configuration_status(this.package_id, SkadiStatusStates.info, status_msg);
    }

    set_status_warning(status_msg) {
        this.core.update_configuration_status(this.package_id, SkadiStatusStates.warning, status_msg);
    }

    set_status_error(status_msg) {
        this.core.update_configuration_status(this.package_id, SkadiStatusStates.error, status_msg);
    }

    clear_status() {
        this.core.update_configuration_status(this.package_id, SkadiStatusStates.clear, "");
    }

    resolve_url(url) {
        return this.get_package_type().get_resource_url(url);
    }

    create_data_uri(data, mime_type) {
        return "data:"+mime_type+";base64," + btoa(data);
    }

}
