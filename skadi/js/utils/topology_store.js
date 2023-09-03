/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class TopologyStore {

    constructor(skadi) {
        this.skadi = skadi;
    }

    async getSaveLink() {
       return "data:application/json;base64," + btoa(JSON.stringify(this.skadi.save()));
    }

    get_example_links() {
        return [];
    }

    async loadFrom(file) {
        file.text().then(t => {
            this.skadi.load(JSON.parse(t),false);
        });
    }
}