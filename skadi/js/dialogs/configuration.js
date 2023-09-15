/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

let skadi_configuration_header_html = `
<h1>Package Configurations</h1>
`

let skadi_status_divs = {};

let skadi_configuration_status = {};

function skadi_update_configuration_status_div(package_id) {
    let message = "";
    let status_state = SkadiStatusStates.clear;
    if (package_id in skadi_configuration_status) {
        status_state = skadi_configuration_status[package_id].state;
        message = skadi_configuration_status[package_id].message;
    }
    if (package_id in skadi_status_divs) {
        let status_div = skadi_status_divs[package_id];
        status_div.innerHTML = "";
        let status_icon = skadi_create_icon_for_status_state(status_state);
        if (status_icon) {
            status_div.appendChild(status_icon);
        }
        if (message) {
            let text = document.createElement("span");
            text.appendChild(document.createTextNode(message));
            text.setAttribute("style","vertical-align:middle;");
            status_div.appendChild(text);
        }
    }
}

function skadi_close_configuration() {
    this.skadi_status_divs = {};
}

function skadi_update_configuration_status(package_id, state, message) {
    skadi_configuration_status[package_id] = {
        "state": state,
        "message": message
    }
    skadi_update_configuration_status_div(package_id);
}

function skadi_populate_configuration(design, elt, close_window) {
    let header_div = document.createElement("div");
    header_div.innerHTML = skadi_configuration_header_html;
    elt.appendChild(header_div);
    for(let package_id in design.network.configurations) {
        let configuration = design.network.configurations[package_id];
        let package_type = configuration.get_package_type();
        let name = package_type.get_metadata().name;
        if (configuration.get_url()) {
            let btn = document.createElement("input");
            btn.setAttribute("type","button");
            btn.setAttribute("value", "Open Configuration");
            btn.addEventListener("click", (ev) => {
                design.open_configuration(package_id);
            });
            let row = document.createElement("div");
            row.setAttribute("class","exo-row");

            let name_cell = document.createElement("div");
            name_cell.setAttribute("class","exo-2-cell");
            name_cell.appendChild(document.createTextNode(name));
            row.appendChild(name_cell);

            let btn_cell = document.createElement("div");
            btn_cell.setAttribute("class","exo-2-cell");
            btn_cell.appendChild(btn);
            row.appendChild(btn_cell);

            elt.appendChild(row);

            let status_row = document.createElement("div");
            status_row.setAttribute("class","exo-row skadi_status");
            let status_cell = document.createElement("div");
            status_cell.setAttribute("class","exo-4-cell");
            status_cell.setAttribute("style","display:inline-block;");

            status_row.appendChild(status_cell);

            skadi_status_divs[package_id] = status_cell;
            skadi_update_configuration_status_div(package_id);

            elt.appendChild(status_row);
            elt.append(document.createElement("hr"));
        }
    }
}