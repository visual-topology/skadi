/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var DataVizExample = DataVizExample || {};

DataVizExample.CsvImportNode = class {

    constructor(node_service) {
        this.node_service = node_service;
        this.imported_table = null;
        this.update_status();

        this.example_dataset_filenames = {
            "iris": "iris.csv",
            "drug-use-by-age": "drug-use-by-age.csv"
        }

        if (this.load_custom) {
            this.load_custom_content();
        } else {
            this.upload(this.example_dataset);
        }
    }

    get load_custom() { return this.node_service.get_property("load_custom",false) }
    set load_custom(v) { this.node_service.set_property("load_custom",v); }

    get example_dataset() { return this.node_service.get_property("example_dataset","iris"); }
    set example_dataset(v) { return this.node_service.set_property("example_dataset",v); }

    get filename() { return this.node_service.get_property("filename",""); }
    set filename(v) { this.node_service.set_property("filename",v); }

    get custom_content() { return this.node_service.get_property("custom_content",null); }
    set custom_content(v) { this.node_service.set_property("custom_content",v); }

    update_status() {
        if (this.filename) {
            this.node_service.set_status_info(this.filename);
        } else {
            this.node_service.set_status_warning("No file selected");
        }
    }

    async upload(dataset_name) {
        let filename = this.example_dataset_filenames[dataset_name];
        let url = this.node_service.resolve_url("assets/"+filename);
        await fetch(url).then(r => r.text()).then(txt => {
            this.imported_table = aq.fromCSV(txt);
            this.filename = filename;
            this.imported_table.print();
            this.node_service.request_execution();
        });
        this.update_status();
    }

    load_custom_content() {
        if (this.custom_content) {
            this.imported_table = aq.fromCSV(this.custom_content);
            this.node_service.request_execution();
        } else {
            this.imported_table = null;
            this.update_status();
            this.node_service.request_execution();
        }
    }

    page_open() {
        this.node_service.page_set_attributes("select_example_dataset",{"value":this.example_dataset});

        if (this.load_custom) {
            this.node_service.page_set_attributes("use_custom",{"checked": "true"});
            this.node_service.page_set_attributes("upload_section",{"style": "display:block;"});
        } else {
            this.node_service.page_set_attributes("use_example",{"checked": "true"});
            this.node_service.page_set_attributes("upload_section",{"style": "display:none;"});
        }

        this.node_service.page_add_event_handler("select_example_dataset","input", async (value) => {
            this.example_dataset = value;
            await this.upload(this.example_dataset);
        });

        this.node_service.page_add_event_handler("use_custom","input",(evt) => {
            this.node_service.page_set_attributes("upload_section",{"style":"display:block;"});
            this.load_custom = true;
            this.filename = "";
            this.node_service.page_set_attributes("upload",{"filename":""});
            this.imported_table = null;
            this.update_status();
            this.node_service.request_execution();
        });

        this.node_service.page_add_event_handler("use_example","input", async (evt) => {
            this.node_service.page_set_attributes("upload_section",{"style":"display:none;"});
            this.load_custom = false;
            this.custom_content = null;
            await this.upload(this.example_dataset);
        });

        this.node_service.page_add_event_handler("upload", "exo-file-changed", (files) => {
            for(let filename in files) {
                this.filename = filename;
                let f = files[filename];
                f.arrayBuffer().then( buf => {
                    try {
                        let decoder = new TextDecoder();
                        this.custom_content = decoder.decode(buf);
                        this.load_custom_content();
                    } catch(ex) {
                        this.custom_content = null;
                        this.filename = '';
                        this.node_service.set_status_error("Unable to load data from "+filename);
                    }
                });
            }
            this.update_status();
        }, "(event) => event.detail");
    }

    page_resize(w,h) {
    }

    page_close() {
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
