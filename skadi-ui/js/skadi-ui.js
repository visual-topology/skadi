/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.UI = class {

    constructor() {
        this.message_handler = null;
        this.pending_messages = [];
        this.parent_window = window.opener || window.parent;
        this.parent_window.addEventListener("unload", (event) => {
            window.close();
        });
    }

    set_message_handler(handler) {
        this.message_handler = handler;
        for(let idx=0; idx<this.pending_messages.length; idx++) {
            this.message_handler(this.pending_messages[idx]);
        }
        this.pending_messages = [];
    }

    handle_message(msg) {
        let type = msg["type"];
        switch(type) {
            case "set_attributes":
                this.set_attributes(msg["element_id"], msg["attributes"]);
                break;
            case "add_event_handler":
                this.add_event_handler(msg["element_id"], msg["event_type"], msg["event_transform"]);
                break;
            case "message":
                let content = msg["content"];
                if (this.message_handler === null) {
                    this.pending_messages.push(content);
                } else {
                    this.message_handler(content);
                }
                break;
        }
    }

    set_attributes(element_id, attributes) {
        let elt = document.getElementById(element_id);
        if (elt) {
            for(let name in attributes) {
                let value = attributes[name];
                if (name === "innerHTML") {
                    elt.innerHTML = value;
                } else if (name === "value") {
                    elt.setAttribute(name, value);
                    elt.value = value;
                } else {
                    elt.setAttribute(name, value);
                }
            }
        } else {
            this.report_missing_element(element_id);
        }
    }

    add_event_handler(element_id, event_type, event_transform) {
        let elt = document.getElementById(element_id);
        let fn = null;
        if (event_transform) {
            this.transform_count += 1;
            fn = eval(event_transform);
        }
        if (elt) {
            elt.addEventListener(event_type, (event) => {
                let value = null;
                if (fn) {
                    value = fn(event);
                } else {
                    value = event.target.value;
                }
                this.send_to_network({
                   "type": "event",
                   "element_id": element_id,
                   "event_type": event_type,
                   "value": value
                });
            })
        } else {
            this.report_missing_element(element_id);
        }
    }

    report_missing_element(element_id) {
        console.error("[SkadiUI] element "+element_id+" does not exist");
    }

    send_to_network(msg) {
        this.parent_window.postMessage(msg,"*");
    }

    page_send_message(content) {
        let msg = {
            "type": "message",
            "content": content
        };
        this.send_to_network(msg);
    }
}

skadi.ui = new skadi.UI();

window.addEventListener("message", (event) => skadi.ui.handle_message(event.data));