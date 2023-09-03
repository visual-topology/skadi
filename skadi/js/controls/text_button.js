/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

class SkadiTextButton {

    constructor(height, value, onclick) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = height;
        this.value = value;
        this.onclick = onclick;
        this.cls = "";
    }

    draw(grp) {

        this.grp = grp.append("g").attr("class", this.cls);

        this.rect = this.grp.append("rect")
            .attr("x", this.x - this.width/2)
            .attr("y", this.y - this.height/2)
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("class", "text_control_area")
            .attr("fill", "none");

        this.text = this.grp.append("text")
            .attr("font-size", this.height * 0.8)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .attr("x", this.x - this.width/2)
            .attr("y", this.y)
            .attr("class", "text_control")
            .text(this.value);

        if (this.width == 0) {
            let bb = this.text.node().getBBox();
            this.width = bb.width;
            let ox = this.x - this.width / 2;
            this.rect.attr("x", ox).attr("width", this.width);
            this.text.attr("x", ox);
        }

        if (this.onclick) {
            let handler = (e) => {
                this.rect.attr("class", "text_control_area_selected");
                window.setTimeout(() => {
                    this.rect.attr("class", "text_control_area");
                }, 500);
                this.onclick(e);
            };
            this.rect.node().onclick = handler;
            this.text.node().onclick = handler;
        }
    }

    set_class(cls) {
        this.cls = cls;
    }

    get_size() {
        return {"width": this.width, "height": this.height};
    }

    get_position() {
        return {"x": this.x, "y": this.y};
    }

    update_size(width, height) {
        if (width != null) {
            this.width = width;
        }
        if (height != null) {
            this.height = height;
        }
        this.adjust();
    }

    update_position(x, y) {
        if (x != null) {
            this.x = x;
        }
        if (y != null) {
            this.y = y;
        }
        this.adjust();
    }

    remove() {
        this.grp.remove();
    }

    adjust() {

        let ox = this.x - this.width / 2;
        if (this.rect) {
            this.rect.attr("x", ox)
                .attr("y", this.y - this.height / 2)
                .attr("width", this.width)
                .attr("height", this.height);
        }

        this.text.attr("x", ox).attr("y", this.y);
    }
}

