/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.PageService = class {

    constructor(wrapper, target_window, l10n_utils) {
        this.wrapper = wrapper;
        this.event_handlers = [];
        this.page_message_handler = null;
        this.pending_page_messages = [];
        this.target_window = target_window;
        this.l10n_utils = l10n_utils;
        window.addEventListener("message", (event) => {
            if (event.source === this.target_window) {
                this.recv_from_window(event.data);
            }
        });
    }

    add_event_handler(element_id, event_type, callback, target_attribute) {
        this.event_handlers.push([element_id, event_type, callback, target_attribute]);
        let msg = {
            "type": "page_add_event_handler",
            "element_id": element_id,
            "event_type": event_type,
            "target_attribute": target_attribute || "value"
        };
        this.send_to_window([msg,null]);
    }

    handle_event(element_id, event_type, value) {
        for(let idx=0; idx<this.event_handlers.length; idx++) {
            let handler_spec = this.event_handlers[idx];
            if (element_id === handler_spec[0] && event_type === handler_spec[1]) {
                handler_spec[2](value);
            }
        }
    }

    set_attributes(element_id, attributes) {
        let msg = {
            "type": "page_set_attributes",
            "element_id": element_id
        }
        if (this.l10n_utils) {
            msg.attributes = {};
            for (let attribute_name in attributes) {
                msg.attributes[attribute_name] = this.l10n_utils.localise(attributes[attribute_name]);
            }
        } else {
            msg.attributes = attributes;
        }

        this.send_to_window([msg,null]);
    }

    send_message(...message_parts) {
        this.send_to_window([{"type":"page_message"},message_parts]);
    }

    set_message_handler(handler) {
        this.page_message_handler = handler;
        if (this.pending_page_messages.length > 0) {
            this.pending_page_messages.forEach((m) => this.page_message_handler(...m));
            this.pending_page_messages = [];
        }
    }

    send_to_window(msg) {
        if (this.target_window) {
            this.target_window.postMessage(msg,window.location.origin);
        }
    }

    recv_from_window(msg) {

        let header = msg[0];

        let type = header.type;

        switch (type) {
            case "page_message":
                let message_parts = msg[1];
                if (this.page_message_handler) {
                    this.page_message_handler(...message_parts);
                } else {
                    this.pending_page_messages.push(message_parts);
                }
                break;
            case "event":
                this.handle_event(header["element_id"], header["event_type"], header["value"]);
                break;
            default:
                console.error("Unknown message type received from page: " + msg.type);
        }
    }

    close() {
        this.page_message_handler = null;
        this.event_handlers = [];
        this.pending_messages = [];
    }
}