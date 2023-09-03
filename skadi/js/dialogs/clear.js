/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let skadi_clear_html = `
<span aria-describedby="clear-tooltip">
    Really Clear
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="clear-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
        Press the clear button to remove all nodes and links from the design.  Press cancel or close this window to leave the design unchanged.
    </div>
</div>
<div>
<input id="clear_confirm" type="button" value="Clear All">
<input id="clear_cancel" type="button" value="Cancel">
</div>
`

function skadi_populate_clear(design, elt, close_window) {
    elt.innerHTML = skadi_clear_html;
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