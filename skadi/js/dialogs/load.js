/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.upload_html = `
<span aria-describedby="edit-metadata-tooltip">
    {{upload.topology}}
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         {{upload.topology.tooltip}}
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{upload.file}}:
        </div>
        <div class="exo-2-cell">
            <input class="exo-dark-blue-fg exo-light-blue-bg" type="file" id="skadi_designer_upload_file">
        </div>
    </div>
    <div class="exo-row" style="visibility:hidden;" id="restore_updates_row">
        <div class="exo-2-cell">
            {{restore.label}}:
        </div>
        <div class="exo-2-cell">
            <input type="button" id="restore_updates_btn" value="{{restore}}">
        </div>
    </div>
</div>`

skadi.populate_load = function(design, elt, close_fn) {
    elt.innerHTML = design.localise(skadi.upload_html);
    let input = document.getElementById("skadi_designer_upload_file");
    input.addEventListener("change", async function() {
        let file = input.files[0];
        await design.get_topology_store().load_from(file);
        design.metadata.filename = file.name;
        close_fn();
    });
    let restore_cb = design.get_topology_store().get_restore_callback();
    if (restore_cb) {
         skadi.$("restore_updates_row").style.visibility = "visible";
         skadi.$("restore_updates_btn").addEventListener("click", (e) =>{
            restore_cb();
        });
    }
}