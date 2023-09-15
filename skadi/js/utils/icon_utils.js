/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

function skadi_create_icon_for_status_state(status_state) {
    let status_icon_url = null;

    switch(status_state) {
        case SkadiStatusStates.info:
            status_icon_url = icon_status_info;
            break;
        case SkadiStatusStates.warning:
            status_icon_url = icon_status_warning;
            break;
        case SkadiStatusStates.error:
            status_icon_url = icon_status_error;
            break;
    }

    if (status_icon_url) {
        let status_icon = document.createElement( "img");
        status_icon.setAttribute("width",32);
        status_icon.setAttribute("height",32);
        status_icon.setAttribute("style","vertical-align:middle;margin-right:10px;");
        status_icon.setAttribute("src",status_icon_url);
        return status_icon;
    }
}