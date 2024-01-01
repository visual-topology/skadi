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