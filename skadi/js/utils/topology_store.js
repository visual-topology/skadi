/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class TopologyStore {

    constructor(skadi) {
        this.skadi = skadi;
    }

    async get_save_link() {
       return "data:application/json;base64," + btoa(JSON.stringify(this.skadi.save()));
    }

    async load_from(file) {
        file.text().then(t => {
            this.skadi.load(JSON.parse(t),false);
        });
    }

    get_store_callback() {
        return undefined;
    }

    get_restore_callback() {
        return undefined;
    }
}