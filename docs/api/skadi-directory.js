/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

/* skadi/js/skadi-directory-api.js */

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





/* skadi/js/utils/directory_like.js */
var skadi = skadi || {};

skadi.DirectoryLike = class {

    constructor(path,is_temporary) {
        this.key = path;
        this.is_temporary = is_temporary;
        this.storage = is_temporary ? sessionStorage : localStorage;
        this.files = {};
        this.directories = [];
        let item = this.storage.getItem(this.key);
        if (item != null) {
            let o = JSON.parse(item);
            this.files = o.files || {};
            this.directories = o.directories || {};
        }
    }

    get_files() {
        return this.files.keys();
    }

    get_directories() {
        return this.directories.keys();
    }

    add_file(name, metadata) {
        this.files[name] = metadata;
        this.update();
        return this.key + "/" + name;
    }

    get_file_info(name) {
        if (name in this.files) {
            return {
                "path": this.key + "/" + name,
                "metadata": this.files[name]
            };
        } else {
            return null;
        }
    }

    remove_file(name) {
        if (name in this.files) {
            delete this.files[name];
            this.update();
        }

        this.storage.removeItem(this.key + "/" + name);
    }

    add_directory(name, metadata) {
        this.directories[name] = metadata;
        this.update();
        return this.key + "/" + name;
    }

    get_directory_info(name) {
        if (name in this.directories) {
            return {
                "path": this.key + "/" + name,
                "metadata": this.directories[name]
            };
        } else {
            return null;
        }
    }

    remove_directory(name) {
        if (name in this.directories) {
            delete this.directories[name];
            this.update();
        }

        let dl = new skadi.DirectoryLike(this.key + "/" + name, this.is_temporary);
        dl.remove();
    }

    update() {
        this.storage.setItem(this.key,JSON.stringify({"files":this.files,"directories":this.directories}));
    }

    clear() {
        for(let filename in this.files) {
            this.storage.removeItem(this.key + "/" + filename);
        }

        for(let dirname in this.directories) {
            this.storage.removeItem(this.key + "/" + dirname);
        }

        this.files = {};
        this.directories = {};
        this.update();
    }

    remove() {
        this.clear();
        this.storage.removeItem(this.key);
    }

}

/* skadi/js/utils/file_like.js */
var skadi = skadi || {};

skadi.FileLike = class {

    constructor(path,mode,is_temporary) {
        this.key = path;
        this.storage = is_temporary ? sessionStorage : localStorage;
        this.content = undefined;
        switch(mode) {
            case "w":
                this.text = true;
                this.writable = true;
                break;
            case "wb":
                this.text = true;
                this.writable = true;
                break;
            case "r":
                this.text = true;
                this.writable = false;
                break;
            case "rb":
                this.text = false;
                this.writable = false;
                break;
        }
    }

    read() {
        if (this.content === undefined) {
            this.load();
        }
        return this.content;
    }

    write(data) {
        // data should be ArrayBuffer or string
        if (!this.writable) {
            throw new Error("Cannot write to read only file");
        } else {
            this.content = data;
        }
        this.save();
    }

    load() {
        let item = this.storage.getItem(this.key);
        if (item === null) {
            this.content = this.text ? "" : new ArrayBuffer(0);
        } else {
            if (this.text) {
                this.content = item;
            } else {
                this.content = Uint8Array.from(item, (m) => m.codePointAt(0)).buffer;
            }
        }
    }

    save() {
       let item = this.content;
        if (!this.text) {
            item = btoa(String.fromCodePoint(...this.content));
        }
        this.storage.setItem(this.key,item);
    }

    remove() {
        this.storage.removeItem(this.key);
    }

}

