/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.StatusStates = class {
    static get info() { return "info" };
    static get warning() { return "warning" };
    static get error() { return "error" };
    static get clear() { return "" };
}