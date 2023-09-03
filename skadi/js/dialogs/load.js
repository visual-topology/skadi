/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let skadi_upload_html = `
<span aria-describedby="edit-metadata-tooltip">
    Upload Topology
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         Use this form to upload a topology to the designer
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            File:
        </div>
        <div class="exo-2-cell">
            <input class="exo-dark-blue-fg exo-light-blue-bg" type="file" id="skadi_designer_upload_file">
        </div>
    </div>
</div>`

function skadi_populate_load(design, elt, close_fn) {
    elt.innerHTML = skadi_upload_html;
    let input = document.getElementById("skadi_designer_upload_file");
    input.addEventListener("change", async function() {
        let file = input.files[0];
        await design.get_topology_store().loadFrom(file);
        design.metadata.filename = file.name;
        close_fn();
    });
}