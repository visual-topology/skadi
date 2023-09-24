/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiWrapper {

    constructor(target, services) {
        this.target = target;
        this.services = services;
        this.instance = null;
        this.window = null;
        this.event_handlers = [];
        this.attribute_map = {}; //  element_id => attribute_name => attribute_value
        this.message_handler = null;
        this.pending_messages = [];
    }

    set_instance(instance) {
        this.instance = instance;
    }

    get_instance() {
        return this.instance;
    }

    get_property(property_name, default_value) {
        if (property_name in this.target.properties) {
            return this.target.properties[property_name];
        }
        return default_value;
    }

    set_property(property_name, property_value) {
        this.target.properties[property_name] = property_value;
    }

    set_message_handler(handler) {
        this.message_handler = handler;
        if (this.pending_messages.length > 0) {
            this.pending_messages.forEach((m) => this.message_handler(m));
            this.pending_messages = [];
        }
    }

    add_event_handler(element_id, event_type, callback, event_transform) {
       this.event_handlers.push([element_id, event_type, callback, event_transform]);
       this.send_add_event_handler(element_id,event_type,event_transform);
    }

    send_add_event_handler(element_id, event_type, event_transform) {
        let msg = {
            "type": "add_event_handler",
            "element_id": element_id,
            "event_type": event_type,
            "event_transform": event_transform
        };
        this.send_to_window(msg);
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
        if (!(element_id in this.attribute_map)) {
            this.attribute_map[element_id] = {};
        }
        for(let key in attributes) {
            this.attribute_map[element_id][key] = attributes[key];
        }
        this.send_set_attributes(element_id, attributes);
    }

    send_set_attributes(element_id, attributes) {
        let msg = {
            "type": "set_attributes",
            "element_id": element_id,
            "attributes": attributes
        }
        this.send_to_window(msg);
    }

    send_message(content) {
        let msg = {
            "type": "message",
            "content": content
        }
        this.send_to_window(msg);
    }

    handle_message(content) {
        if (this.message_handler) {
            this.message_handler(content);
        } else {
            this.pending_messages.push(content);
        }
    }

    send_to_window(msg) {
        if (this.window) {
            this.window.postMessage(msg,window.location.origin);
        }
    }

    recv_from_window(msg) {
        switch(msg.type) {
            case "event":
                this.handle_event(msg["element_id"],msg["event_type"],msg["value"]);
                break;
            case "message":
                this.handle_message(msg["content"]);
                break;
        }
    }


    open(w, width, height) {
        this.window = w;
        this.pending_messages = [];
        window.addEventListener("message", (event) => {
            if (event.source == this.window) {
                this.recv_from_window(event.data);
            }
        });
        if (this.instance.open) {
            try {
                this.instance.open(width, height);
            } catch(e) {
                console.error(e);
            }
        }
        for(var element_id in this.attribute_map) {
            this.send_set_attributes(element_id, this.attribute_map[element_id]);
        }
        for(var idx=0; idx<this.event_handlers.length; idx++) {
            let element_id = this.event_handlers[idx][0];
            let event_type = this.event_handlers[idx][1];
            let event_transform = this.event_handlers[idx][3];
            this.send_add_event_handler(element_id, event_type, event_transform);
        }
    }

    resize(width,height) {
        if (this.instance.resize) {
            try {
                this.instance.resize(width, height);
            } catch(e) {
                console.error(e);
            }
        }
    }

    close() {
        this.window = null;
        if (this.instance.close) {
            try {
                this.instance.close();
            } catch(e) {
                console.error(e);
            }
        }
        this.pending_messages = [];
    }

    reset_execution() {
        if (this.instance.reset_execution) {
            try {
                this.instance.reset_execution();
            } catch(e) {
                console.error(e);
            }
        }
    }

    async execute(inputs) {
        if (this.instance.execute) {
            return await this.instance.execute(inputs);
        } else {
            return {};
        }
    }
}