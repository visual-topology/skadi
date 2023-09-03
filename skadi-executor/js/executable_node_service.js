/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiExecutableNodeService extends SkadiNodeService {

    constructor(node, graph_executor) {
        super(node);
        this.graph_executor = graph_executor;
    }

    request_execution() {
        this.graph_executor.request_execution(this.node_id);
    }

    set_executing(is_executing) {
        this.wrapper.set_executing(is_executing);
    }

    raise_execution_failed(message, from_exn) {
        let exn = new SkadiNodeExecutionFailed(this.node_id, message, from_exn);
        throw(exn);
    }

}
