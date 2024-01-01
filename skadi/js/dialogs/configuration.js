/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.configuration_header_html = `
<h1>Package Configurations</h1>
`

skadi.status_divs = {};

skadi.configuration_status = {};

skadi.update_configuration_status_div = function(package_id) {
    let message = "";
    let status_state = skadi.StatusStates.clear;
    if (package_id in skadi.configuration_status) {
        status_state = skadi.configuration_status[package_id].state;
        message = skadi.configuration_status[package_id].message;
    }
    if (package_id in skadi.status_divs) {
        let status_div = skadi.status_divs[package_id];
        status_div.innerHTML = "";
        let status_icon = skadi.create_icon_for_status_state(status_state);
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

skadi.close_configuration = function() {
    skadi.status_divs = {};
}

skadi.update_configuration_status = function(package_id, state, message) {
    skadi.configuration_status[package_id] = {
        "state": state,
        "message": message
    }
    skadi.update_configuration_status_div(package_id);
}

skadi.open_configuration_callback = function(design, package_id, page_id) {
    return (ev) => {
        design.open_configuration(package_id, page_id);
    }
}

skadi.populate_configuration = function(design, elt, close_window) {
    let header_div = document.createElement("div");
    header_div.innerHTML = skadi.configuration_header_html;
    elt.appendChild(header_div);
    {
        let select = design.get_l10n_utils().create_language_select();
        let row = document.createElement("div");
        row.setAttribute("class","exo-row");

        let lang_cell = document.createElement("div");
        lang_cell.setAttribute("class","exo-2-cell");
        lang_cell.appendChild(document.createTextNode("System Language"));
        row.appendChild(lang_cell);

        let l10n_cell = document.createElement("div");
        l10n_cell.setAttribute("class","exo-2-cell");
        l10n_cell.appendChild(select);
        row.appendChild(l10n_cell);

        elt.appendChild(row);
    }

    elt.append(document.createElement("hr"));
    

    for(let package_id in design.network.configurations) {
        let configuration = design.network.configurations[package_id];
        let package_type = configuration.get_package_type();
        let l10n_utils = package_type.get_l10n_utils();
        
        if (!l10n_utils && configuration.get_page_ids().length === 0) {
            continue;
        }

        {
            let name = package_type.get_metadata().name;
            let row = document.createElement("div");
            row.setAttribute("class","exo-row");

            let label_cell = document.createElement("div");
            label_cell.setAttribute("class","exo-2-cell");
            label_cell.appendChild(document.createTextNode("Package Name"));
            row.appendChild(label_cell);

            let name_cell = document.createElement("div");
            name_cell.setAttribute("class","exo-2-cell");
            name_cell.appendChild(document.createTextNode(name));
            row.appendChild(name_cell);
            elt.appendChild(row);
        }

        if (l10n_utils) {
            
            let select = l10n_utils.create_language_select();
            let row = document.createElement("div");
            row.setAttribute("class","exo-row");

            let lang_cell = document.createElement("div");
            lang_cell.setAttribute("class","exo-2-cell");
            lang_cell.appendChild(document.createTextNode("Language"));
            row.appendChild(lang_cell);

            let l10n_cell = document.createElement("div");
            l10n_cell.setAttribute("class","exo-2-cell");
            l10n_cell.appendChild(select);
            row.appendChild(l10n_cell);

            elt.appendChild(row);
        }

        configuration.get_page_ids().forEach(page_id => {
            let url = configuration.get_url(page_id);
            let page = configuration.get_page(page_id);
            if (url) {
                let row = document.createElement("div");
                row.setAttribute("class", "exo-row");

                let cfg_cell = document.createElement("div");
                cfg_cell.setAttribute("class", "exo-2-cell");
                cfg_cell.appendChild(document.createTextNode(page.title));
                row.appendChild(cfg_cell);

                let btn = document.createElement("input");
                btn.setAttribute("type", "button");
                btn.setAttribute("value", page.button_label || "Open...");
                btn.addEventListener("click", skadi.open_configuration_callback(design,package_id,page_id));

                let btn_cell = document.createElement("div");
                btn_cell.setAttribute("class", "exo-2-cell");
                btn_cell.appendChild(btn);
                row.appendChild(btn_cell);
                elt.appendChild(row);
            }
        });


        let status_row = document.createElement("div");
        status_row.setAttribute("class","exo-row skadi_status");

        let st_cell = document.createElement("div");
        st_cell.setAttribute("class","exo-2-cell");
        st_cell.appendChild(document.createTextNode("Configuration Status"));
        status_row.appendChild(st_cell);

        let status_cell = document.createElement("div");
        status_cell.setAttribute("class","exo-2-cell");
        status_cell.setAttribute("style","display:inline-block;");

        status_row.appendChild(status_cell);

        skadi.status_divs[package_id] = status_cell;
        skadi.update_configuration_status_div(package_id);

        elt.appendChild(status_row);

    }


}



