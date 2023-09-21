/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.CsvImportNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.imported_table = null;
        this.is_open = false;
        this.update_status();

        if (this.load_custom) {
            this.load_custom_content();
        } else {
            this.upload("iris.csv");
        }

        this.node_service.add_event_handler("upload", "exo-file-changed", (files) => {
            for(let filename in files) {
                this.filename = filename;
                let f = files[filename];
                f.arrayBuffer().then( buf => {
                    this.custom_content = buf;
                    this.load_custom_content();
                });
            }
            this.update_status();
        }, "(event) => event.detail");
    }

    get load_custom() { return this.node_service.get_property("load_custom",false) }
    set load_custom(v) { this.node_service.set_property("load_custom",v); }

    get filename() { return this.node_service.get_property("filename",""); }
    set filename(v) { this.node_service.set_property("filename",v); }

    get custom_content() { return this.node_service.get_property("custom_content",null); }
    set custom_content(v) { this.node_service.set_property("custom_content",v); }

    update_status() {
        if (this.filename) {
            this.node_service.set_status_info(this.filename);
        } else {
            this.node_service.set_status_warning(this.node_service.localise("no.file.selected"));
        }
    }

    async upload(filename) {
        let url = this.node_service.resolve_url(filename)
        await fetch(url).then(r => r.text()).then(txt => {
            this.imported_table = aq.fromCSV(txt);
            this.filename = filename;
            this.imported_table.print();
            this.node_service.request_execution();
        });
        this.update_status();
    }

    load_custom_content() {
        let decoder = new TextDecoder();
        let txt = decoder.decode(this.custom_content);
        this.imported_table = aq.fromCSV(txt);
        this.imported_table.print();
        this.node_service.request_execution();
    }

    open(w,h) {
        this.is_open = true;

        if (this.load_custom) {
            this.node_service.set_attributes("use_custom",{"checked": "true"});
            this.node_service.set_attributes("upload_section",{"style": "display:block;"});
        } else {
            this.node_service.set_attributes("use_iris",{"checked": "true"});
            this.node_service.set_attributes("upload_section",{"style": "display:none;"});
        }

        this.node_service.add_event_handler("use_custom","input",(evt) => {
            this.node_service.set_attributes("upload_section",{"style":"display:block;"});
            this.load_custom = true;
            this.filename = "";
            this.imported_table = null;
            this.update_status();
            this.node_service.request_execution();
        });

        this.node_service.add_event_handler("use_iris","input", async (evt) => {
            this.node_service.set_attributes("upload_section",{"style":"display:none;"});
            this.load_custom = false;
            this.filename = "iris.csv";
            this.custom_content = null;
            await this.upload("iris.csv");
        });
    }

    close() {
        this.is_open = false;
    }

    async execute(inputs) {
        if (this.imported_table) {
            return {
                "data_out": this.imported_table
            };
        } else {
            return {};
        }
    }
}
