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

    update_status() {
        if (this.imported_table == null) {
            if (this.load_custom && this.filename) {
                this.node_service.set_status_error("Uploaded file "+this.filename+" not found in browser storage,\n please re-upload.");
            } else {
                this.node_service.set_status_error("No file selected.");
            }
        } else {
            if (this.filename) {
                this.node_service.set_status_info(this.filename);
            } else {
                this.node_service.set_status_warning("No file selected");
            }
        }
    }

    async upload(dataset_name) {
        let filename = this.example_dataset_filenames[dataset_name];
        let url = this.node_service.resolve_url("assets/"+filename);
        await fetch(url).then(r => r.text()).then(txt => {
            this.imported_table = aq.fromCSV(txt);
            this.filename = filename;
            this.node_service.request_execution();
        });
        this.update_status();
    }

    load_custom_content() {
        let custom_content = this.node_service.get_data("custom_content");
        let csv = custom_content ? custom_content.read() : null;
        if (csv) {
            this.imported_table = aq.fromCSV(csv);
            this.update_status();
            this.node_service.request_execution();
        } else {
            this.imported_table = null;
            this.update_status();
            this.node_service.request_execution();
        }
    }

    page_open(page_id, page_service) {
        page_service.set_attributes("select_example_dataset", {"value": this.example_dataset});

        if (this.load_custom) {
            page_service.set_attributes("use_custom", {"checked": "true"});
            page_service.set_attributes("upload_section", {"style": "display:block;"});
        } else {
            page_service.set_attributes("use_example", {"checked": "true"});
            page_service.set_attributes("upload_section", {"style": "display:none;"});
        }

        page_service.add_event_handler("select_example_dataset", "input", async (value) => {
            this.example_dataset = value;
            await this.upload(this.example_dataset);
        });

        page_service.add_event_handler("use_custom", "input", (evt) => {
            page_service.set_attributes("upload_section", {"style": "display:block;"});
            this.load_custom = true;
            this.filename = "";
            page_service.set_attributes("upload", {"filename": ""});
            this.imported_table = null;
            this.update_status();
            this.node_service.request_execution();
        });

        page_service.add_event_handler("use_example", "input", async (evt) => {
            page_service.set_attributes("upload_section", {"style": "display:none;"});
            this.load_custom = false;
            this.node_service.set_data("custom_content",null);
            await this.upload(this.example_dataset);
        });

        page_service.set_message_handler((header, content) => {
            this.recv_page_message(header, content);
        });
    }

    page_close(page_id, page_service) {
    }

    recv_page_message(header,content) {
        try {
            this.node_service.set_data("custom_content",content);
            this.load_custom_content();
            this.filename = header["filename"];
            this.update_status();
        } catch(ex) {
            this.filename = '';
            this.node_service.set_status_error("Unable to load data from "+header["filename"]);
        }
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
