/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.design_metadata_html = `
<span aria-describedby="edit-metadata-tooltip">
    {{topology.metadata.editor}}
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
        {{topology.metadata.editor.tooltip}}
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{metadata.name}}:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_name" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{metadata.filename}}:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_filename" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{metadata.description}}:
        </div>
        <div class="exo-2-cell">
            <textarea id="edit_metadata_description" rows="10" class="exo-full-width"></textarea>
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{metadata.authors}}:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_authors" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{metadata.version}}:
        </div>
        <div class="exo-2-cell">
            <input id="edit_metadata_version" type="text" value="" class="exo-full-width">
        </div>
    </div>
</div>
`

skadi.populate_design_metadata = function(design, elt, close_window) {
    elt.innerHTML = design.localise(skadi.design_metadata_html);
    let edit_metadata_name = document.getElementById("edit_metadata_name");
    let edit_metadata_description = document.getElementById("edit_metadata_description");
    let edit_metadata_filename = document.getElementById("edit_metadata_filename");
    let edit_metadata_authors = document.getElementById("edit_metadata_authors");
    let edit_metadata_version = document.getElementById("edit_metadata_version");
    let design_metadata = design.get_design_metadata();
    edit_metadata_name.value = design_metadata["name"] || "";
    edit_metadata_description.value = design_metadata["description"] || "";
    edit_metadata_filename.value = design_metadata["filename"] || "";
    edit_metadata_authors.value = design_metadata["authors"] || "";
    edit_metadata_version.value = design_metadata["version"] || "";
    edit_metadata_name.addEventListener("change", (evt) => {
       design_metadata["name"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_description.addEventListener("change", (evt) => {
       design_metadata["description"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_filename.addEventListener("change", (evt) => {
       design_metadata["filename"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_authors.addEventListener("change", (evt) => {
       design_metadata["authors"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
    edit_metadata_version.addEventListener("change", (evt) => {
       design_metadata["version"] = evt.target.value;
       design.update_design_metadata(design_metadata);
    });
}