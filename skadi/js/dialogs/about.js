/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

function skadi_populate_about(design, elt) {

    function tableize(rowdata) {
        let tbl = document.createElement("table");
        tbl.setAttribute("class", "exo-border");
        rowdata.forEach(rowitem => {
            let row = document.createElement("tr");
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

    function mklink(url) {
        let a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("target", "_new");
        a.appendChild(document.createTextNode(url));
        return a;
    }
    let rowdata = [
        [tn("Description"),tn("Version"),tn("Link")],
        [tn("Skadi"), tn("${SKADI-VERSION}"), mklink("https://github.com/visualtopology/skadi")]];

    let package_types = design.get_schema().get_package_types();
    package_types.forEach(package_type_id => {
        let pt = design.get_schema().get_package_type(package_type_id);
        let metadata = pt.get_metadata();
        rowdata.push([tn(metadata.description), tn(metadata.version), mklink(pt.get_resource_url(metadata.link))]);
    });
    elt.appendChild(tableize(rowdata));
}