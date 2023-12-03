/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.ExecutableNodeWrapper = class extends skadi.Wrapper {

    constructor(node, services) {
        super(node, services);
    }

    set_executing(is_executing) {
        // TODO
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
            try {
                return await this.instance.execute(inputs);
            } catch(e) {
                console.error(e);
            }
        }
    }
}