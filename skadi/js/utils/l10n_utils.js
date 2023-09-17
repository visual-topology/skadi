/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0
*/

class SkadiL10NUtils {

    constructor(l10n_folder_url) {
        this.l10n_folder_url = l10n_folder_url;
        this.metadata = {};
        this.bundle = {};
    }

    async initialise(language) {
        this.metadata = await fetch(this.l10n_folder_url+"/index.json").then(r => r.json());
        let bundle_url = this.l10n_folder_url+"/"+this.metadata[language].url;    
        this.bundle = await fetch(bundle_url).then(r => r.json());
    }

    
    get_languages() {
        let key_name_list = [];
        for(let language_key in this.metadata) {
            key_name_list.push([language_key,this.metadata[language_key].name]);
        }
        return key_name_list;
    }

    localise(html) {
        let idx = 0;
        let s = "";
        while(idx<html.length-1) {
            if (html.slice(idx, idx+2) == "||") {
                let startidx = idx+2;
                idx += 2;
                while(idx<html.length-1) {
                    if (html.slice(idx,idx+2) == "||") {
                        let token = html.slice(startidx,idx);
                        s += this.lookup(token);
                        idx += 2;
                        break;
                    } else {
                        idx += 1;
                    }
                }
            } else {
                s += html.charAt(idx);
                idx++;
            }
        }
        return s;
    }

    lookup(key) {
        if (key in this.bundle) {
            return this.bundle[key];
        }
        console.warn("Translation failed for key: "+key);
        return "$$"+key+"$$";
    }
}

