/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.TopologyDirectoryApi = class {

    constructor() {

        this.name_ctrl = document.getElementById("topology_name");
        this.create_btn = document.getElementById("open_new");
        this.create_btn.addEventListener("click", (evt) => {
           let service_name = this.name_ctrl.value;
           if (service_name) {
               window.open("skadi-designer.html?service="+service_name);
           }
        });
    }

    send(msg) {
        this.services.send(JSON.stringify(msg));
    }

    recv(msg_txt) {
        let ele = document.getElementById("topology_directory_content");
        let msg = JSON.parse(msg_txt);
        ele.innerHTML = "";
        msg.topologies.forEach(
            topology => {
                let service_name = topology.service_name;
                let p = document.createElement("p");
                ele.appendChild(p);
                let h4 = p.appendChild(document.createElement("h4"));
                h4.appendChild(document.createTextNode(service_name));
                let a1 = document.createElement("a");
                a1.setAttribute("href",this.base_url+"/app/"+this.designer_app_name+"/index.html?service="+service_name);
                a1.appendChild(document.createTextNode("Open in topology designer"));
                p.appendChild(a1);
                if (this.viewer_app_name) {
                    let a2 = document.createElement("a");
                    a2.setAttribute("href",this.base_url+"/app/"+this.viewer_app_name+"/index.html?topology="+service_name);
                    a2.appendChild(document.createTextNode("Open in topology viewer"));
                    p.appendChild(a2);
                }
            }
        );
    }
}



