/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

class SkadiL10NUtils {

    constructor(l10n_folder_url) {
        this.l10n_folder_url = l10n_folder_url;
        this.metadata = null;
        this.bundle = {};
        this.language = "";
    }

    configure_for_package(package_l10n) {
        this.metadata = package_l10n;
    }

    async initialise(language) {
        if (this.metadata === null) {
            this.metadata = await fetch(this.l10n_folder_url+"/index.json").then(r => r.json(), e => null);
        }
        await this.set_language(language); 
    }

    async set_language(language) {
        if (language === "" || !(language in this.metadata.languages)) {
            language = this.metadata.default_language;
        }
        let bundle_url = this.l10n_folder_url+"/"+this.metadata.languages[language].bundle_url;    
        this.bundle = await fetch(bundle_url).then(r => r.json());
        this.language = language;
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
        if (input in this.bundle) {
            return this.bundle[input];
        }
        let idx = 0;
        let s = "";
        while(idx<input.length) {
            if (input.slice(idx, idx+2) === "||") {
                let startidx = idx+2;
                idx += 2;
                while(idx<input.length) {
                    if (input.slice(idx,idx+2) === "||") {
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
        return s;
    }
}

