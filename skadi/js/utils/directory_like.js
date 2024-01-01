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