/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiNodeExecutionFailed extends Error {

    constructor(node_id, message, from_exn) {
        super(message);
        this.node_id = node_id;
        this.cause = from_exn;
    }

    toString() {
        return "Execution Failed for Node "+this.node_id+": "+this.super.toString();
    }

}