/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let skadi_design_configuration_html = `
<h1>Configuration</h1>
`

function skadi_populate_design_configuration(design, elt, close_window) {
    elt.innerHTML = skadi_design_configuration_html;
}