/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class ResourceLoader {

    constructor(js_parent, css_parent) {
        this.loading_resources = {}; // resource_name -> true
        this.loaded_resources = {}; // resource name -> true|false
        this.js_parent = js_parent || document.head;
        this.css_parent = css_parent || document.head;
    }

    async css_load(resource) {
        let that = this;
        await fetch(resource).then(r => r.text(), e => that.notify(resource,false)).then(txt => {
            let ele = document.createElement("style");
            ele.appendChild(document.createTextNode(txt));
            this.css_parent.appendChild(ele);
            that.notify(resource,true);
        });
    }

    async js_load(resource) {
        let script = document.createElement("script");
        script.onload = (evt) => this.notify(resource, true);
        script.setAttribute("src",resource);
        document.head.appendChild(script);
        while(true) {
            await new Promise(r => setTimeout(r, 100));
            if (resource in this.loaded_resources) {
                break;
            }
        }

    }

    async load(resource) {
        // start new load
        this.loading_resources[resource] = true;
        if (resource.endsWith(".js")) {
            await this.js_load(resource);
        } else if (resource.endsWith(".css")) {
            await this.css_load(resource);
        }
    }

    notify(resource,success) {
        delete this.loading_resources[resource];
        this.loaded_resources[resource] = success;
    }

    async load_resources(resource_list) {
        let load_tasks = [];
        for(let idx=0; idx<resource_list.length; idx++) {
            let resource = resource_list[idx];
            if (resource in this.loading_resources || resource in this.loaded_resources) {
                /* resource already loaded or failed to load */
            } else {
                load_tasks.push(await this.load(resource));
            }
        }
        if (load_tasks.length > 0) {
            await Promise.all(load_tasks);
        }
        let results = {};
        for(let idx=0; idx<resource_list.length; idx++) {
            let resource = resource_list[idx];
            results[resource] = this.loaded_resources[resource];
        }
        return results;
    }
}

