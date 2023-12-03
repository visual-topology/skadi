/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.clear_html = `
<span aria-describedby="clear-tooltip">
    {{clear.topology}}?
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="clear-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
        {{clear.topology.tooltip}}
    </div>
</div>
<div>
<input id="clear_confirm" type="button" value="{{clear}}">
<input id="clear_cancel" type="button" value="{{cancel}}">
</div>
`

skadi.populate_clear = function(design, elt, close_window) {
    elt.innerHTML = design.localise(skadi.clear_html);
    let confirm = document.getElementById("clear_confirm");
    confirm.addEventListener("click", function() {
        design.clear(false);
        close_window();
    });
    let cancel = document.getElementById("clear_cancel");
    cancel.addEventListener("click", function() {
        close_window();
    });
}