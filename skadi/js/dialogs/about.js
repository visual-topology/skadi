/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

function skadi_populate_about(design, elt) {

    function tableize(rowdata,header_row_class) {
        let tbl = document.createElement("table");
        tbl.setAttribute("class", "exo-full-width exo-border");
        rowdata.forEach(rowitem => {
            let row = document.createElement("tr");
            if (rowitem === rowdata[0] && header_row_class) {
                row.setAttribute("class",header_row_class);
            }
            rowitem.forEach(item => {
                let cell = document.createElement("td");
                cell.appendChild(item);
                row.appendChild(cell);
            });
            tbl.appendChild(row);
        });
        return tbl;
    }

    function tn(txt) {
        return document.createTextNode(txt);
    }

    function mklink(text,url) {
        let a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("target", "_new");
        a.appendChild(document.createTextNode(text));
        return a;
    }
    let rowdata_platform = [
        [tn("Name"),tn("Version"),tn("Link")],
        [tn("Skadi"), tn("${SKADI-VERSION}"), mklink("About", skadi_api_home_url+"/skadi-about.html")]
    ];

    let rowdata_packages = [[tn("Name"),tn("Version"),tn("Link")]];
    let package_types = design.get_schema().get_package_types();
    package_types.forEach(package_type_id => {
        let pt = design.get_schema().get_package_type(package_type_id);
        let metadata = pt.get_metadata();
        rowdata_packages.push([tn(metadata.name), tn(metadata.version), mklink("About",pt.get_resource_url(metadata.link))]);
    });
    elt.appendChild(document.createElement("h2").appendChild(tn("Platform")));
    elt.appendChild(tableize(rowdata_platform,"exo-dark-purple-bg exo-white-fg"));
    elt.appendChild(document.createElement("h2").appendChild(tn("Packages")));
    elt.appendChild(tableize(rowdata_packages,"exo-dark-orange-bg exo-white-fg"));
}