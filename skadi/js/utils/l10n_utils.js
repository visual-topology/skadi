/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

var skadi = skadi || {};

skadi.L10NUtils = class {

    constructor(id, l10n_folder_url) {
        this.id = id;
        this.l10n_folder_url = l10n_folder_url;
        this.metadata = null;
        this.bundle = {};
        this.language = "";
        this.language_update_listeners = [];
    }

    configure_for_package(package_l10n) {
        this.metadata = package_l10n;
    }

    async initialise() {
        if (this.metadata === null) {
            this.metadata = await fetch(this.l10n_folder_url+"/index.json").then(r => r.json(), e => null);
        }
        let language = window.localStorage.getItem("skadi.settings.l10n."+this.id+".language") || this.metadata.default_language;
        await this.set_language(language); 
    }

    async set_language(language) {
        if (language === "" || !(language in this.metadata.languages)) {
            language = this.metadata.default_language;
        }
        this.bundle = {};
        if ("bundle_url" in this.metadata.languages[language]) {
            let bundle_url = this.l10n_folder_url+"/"+this.metadata.languages[language].bundle_url;    
            this.bundle = await fetch(bundle_url).then(r => r.json());
        }
        window.localStorage.setItem("skadi.settings.l10n."+this.id+".language", language);
        this.language = language;
        this.language_update_listeners.forEach((callback) => callback(language));
    }

    get_language() {
        return this.language;
    }

    get_languages() {
        let key_name_list = [];
        for(let language_key in this.metadata.languages) {
            key_name_list.push([language_key,this.metadata.languages[language_key].name]);
        }
        return key_name_list;
    }

    localise(input) {
        // for empty bundles, localise returns the input
        if (Object.keys(this.bundle).length == 0) {
            return input;
        }
        // treat the input as possibly containing embedded keys, delimited by {{ and }}, 
        // for example "say {{hello}}" embeds they key hello
        // substitute any embedded keys and the surrounding delimiters with their values, if the key is present in the bundle
        let idx = 0;
        let s = "";
        while(idx<input.length) {
            if (input.slice(idx, idx+2) === "{{") {
                let startidx = idx+2;
                idx += 2;
                while(idx<input.length) {
                    if (input.slice(idx,idx+2) === "}}") {
                        let token = input.slice(startidx,idx);
                        if (token in this.bundle) {
                            token = this.bundle[token];    
                        } 
                        s += token;
                        idx += 2;
                        break;
                    } else {
                        idx += 1;
                    }
                }
            } else {
                s += input.charAt(idx);
                idx++;
            }
        }
        console.log("localised: "+input+" => "+s);
        return s;
    }

    add_language_update_listener(listener) {
        this.language_update_listeners.push(listener);
    }

    create_language_select() {
        let select = document.createElement("select");
        let languages = this.get_languages();
        for(var idx=0; idx<languages.length; idx++) {
            let option = document.createElement("option");
            option.setAttribute("value",languages[idx][0]);
            option.appendChild(document.createTextNode(languages[idx][1]));
            select.appendChild(option);
        }
        select.value = this.get_language();
        select.addEventListener("change", (ev) => {
            this.set_language(select.value);
        });
        return select; 
    }
}

