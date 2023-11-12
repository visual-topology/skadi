/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.ExecutableNodeService = class extends skadi.NodeService {

    constructor(node, graph_executor) {
        super(node);
        this.graph_executor = graph_executor;
    }

    request_execution() {
        this.graph_executor.request_execution(this.node_id);
    }
}
