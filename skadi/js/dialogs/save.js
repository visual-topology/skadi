/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let skadi_download_html = `
<span aria-describedby="edit-metadata-tooltip">
    {{download.topology}}
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="edit-metadata-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         {{download.topology.tooltip}}
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{download.file}}:
        </div>
        <div class="exo-2-cell">
            <div class="exo-button exo-dark-blue-fg exo-light-blue-bg">
                <a id="skadi_designer_download_file" download=""
                     href="">
                    {{download}}
                </a>
            </div>
        </div>
    </div>
</div>`

function skadi_populate_save(design, elt) {
    elt.innerHTML = design.localise(skadi_download_html);
    let link = document.getElementById("skadi_designer_download_file");
    link.appendChild(document.createTextNode("Preparing Download..."));
    design.get_topology_store().getSaveLink().then(url => {
        link.innerHTML = "Download";
        link.setAttribute("href", url);
        const filename = design.metadata.filename || "topology.json";
        link.setAttribute("download", filename);
    });
}