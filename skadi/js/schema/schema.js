/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiSchemaError extends Error {

    constructor(message) {
        super(message)
        this.name = "SkadiSchemaError";
    }

}


class SkadiSchema {

    constructor() {
        this.package_types = {};
        this.node_types = {};
        this.link_types = {};
        this.rl = new ResourceLoader();
    }

    async loadPackage(url,obj) {
        let id = obj["id"];

        if (id in this.package_types) { // this package already loaded?
            return;
        }

        let executor = obj["executor"]
        if (executor != "javascript") {
            throw new SkadiSchemaError("Invalid value for schema executor: found \""+executor+"\", expecting \"javascript\"");
        }

        let packageType = new SkadiPackageType(id, url, obj);
        this.package_types[packageType.get_id()] = packageType;


        let resources = [];

        if (obj["dependencies"]) {
            obj["dependencies"].forEach(item => resources.push(packageType.get_resource_url(item)));
        }

        if (obj.node_types) {
            for(let nt_id in obj.node_types) {
                let nt = obj.node_types[nt_id];
                if (nt["dependencies"]) {
                    nt["dependencies"].forEach(item => resources.push(packageType.get_resource_url(item)));
                }
            }
        }

        /* load resources defined in the package */

        let load_results = await this.rl.load_resources(resources);
        let failed_resources = [];
        for(let resource_name in load_results) {
            if (!load_results[resource_name]) {
                failed_resources.push(resource_name)
            }
        }

        /* raise an error if any resources failed to load */

        if (failed_resources.length > 0) {
            throw new SkadiSchemaError("Unable to load package resources: "+JSON.stringify(failed_resources))
        }

        let nodeTypes = obj["node_types"];
        for(let node_id in nodeTypes) {
            let nt = nodeTypes[node_id];
            let nodeType = new SkadiNodeType(node_id, packageType, nt);
            if (nodeType.is_enabled()) {
                this.node_types[nodeType.get_id()] = nodeType;
            }
        }

        let linkTypes = obj["link_types"];
        for(let link_id in linkTypes) {
            let lt = linkTypes[link_id];
            let linkType = new SkadiLinkType(link_id, packageType, lt);
            this.link_types[linkType.get_id()] = linkType;
        }

        return packageType;
    }

    get_resource_url(package_id, relative_path) {
       return this.package_types[package_id].get_resource_url(relative_path);
    }

    get_node_type(id) {
        return this.node_types[id];
    }

    get_link_type(id) {
        return this.link_types[id];
    }

    get_link_colour(id) {
        if (id in this.link_types) {
            return this.link_types[id].get_colour();
        }
        return "grey";
    }

    get_package_type(id) {
        return this.package_types[id];
    }

    get_package_types() {
        let ids = [];
        for (let key in this.package_types) {
            ids.push(key);
        }
        return ids;
    }

    get_packages_list() {
        let result = [];
        for (let key in this.package_types) {
            let pt = this.package_types[key];
            result.push({"id":pt.get_id(),"metadata":pt.get_metadata()});
        }
        return result;
    }

    get_node_types() {
        let ids = [];
        for (let key in this.node_types) {
            ids.push(key);
        }
        return ids;
    }
}

