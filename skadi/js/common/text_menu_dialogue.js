/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiTextMenuDialogue extends SkadiSvgDialogue {

    constructor(design, items, closeHandler, owner, x, y, title) {
        super(owner.get_id() + "text_menu", design, title, x, y, 100, 500, closeHandler, null, false, true, false,
            function (grp) {
                this.draw(grp);
            });
        this.design = design;
        this.font_size = 24;
        this.items = items;
        this.entries = [];

        for (let i = 0; i < this.items.length; i++) {
            let item = this.items[i];
            let cb = this.create_cb(item.get_handler());
            let t = new SkadiTextButton(this.font_size, item.get_label(), cb);
            t.set_class("menuitem");
            this.entries.push(t);
        }
    }

    draw(grp) {
        for(let i=0; i<this.entries.length; i++) {
            this.entries[i].draw(grp);
        }
        this.pack();
    }

    pack() {
        let max_w = 0;
        let sum_h = 0;
        let w = this.width;
        for (let idx = 0; idx < this.entries.length; idx++) {
            let sz = this.entries[idx].get_size();
            if (sz.width > max_w) {
                max_w = sz.width;
            }
            sum_h += sz.height;
        }
        let y_pos = this.header_sz + this.padding;
        for (let idx = 0; idx < this.entries.length; idx++) {
            let sz = this.entries[idx].get_size();
            this.entries[idx].update_position(this.padding + max_w / 2, y_pos + sz.height / 2);
            this.entries[idx].update_size(max_w, null);
            y_pos += sz.height;
        }
        this.set_content_size(max_w, sum_h);
    }

    create_cb(handler) {
        let that = this;
        return function (e) {
            handler(e);
            that.remove();
        }
    }

    remove() {
        this.close();
    }
}

SkadiTextMenuDialogue.MenuItem = class {

    constructor(label, handler) {
        this.label = label;
        this.handler = handler;
    }

    get_label() {
        return this.label;
    }

    get_handler() {
        return this.handler;
    }
}