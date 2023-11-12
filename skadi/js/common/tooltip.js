/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

var skadi = skadi || {};

skadi.Tooltip = class {

    constructor(target,parent,text) {
        this.target = target;
        this.parent = parent;
        this.content = text;
        this.svg_ns = "http://www.w3.org/2000/svg";
        this.tip = document.createElementNS(this.svg_ns,"g");
        this.tip.setAttributeNS(null,"class","tooltip");
        this.tip.setAttributeNS(null,"visibility","hidden");

        this.background = document.createElementNS(this.svg_ns,"rect");
        
        this.background.setAttributeNS(null,"x",0);
        this.background.setAttributeNS(null,"y",0);
        this.background.setAttributeNS(null,"width",100);
        this.background.setAttributeNS(null,"height",100);
        
        
        this.text = document.createElementNS(this.svg_ns,"text");
        this.text.setAttributeNS(null,"x",5);
        this.text.setAttributeNS(null,"y",5);
        this.text.appendChild(document.createTextNode(text));

        this.tip.appendChild(this.background);
        this.tip.appendChild(this.text);
        this.parent.appendChild(this.tip);
        
        let that = this;
        that.target.addEventListener("mouseover",function(evt) {
            that.show(evt);
        });
        that.target.addEventListener("mousemove",function(evt) {
            that.move(evt);
        });
        that.target.addEventListener("mouseout",function(evt) {
            that.hide();
        });
    }

    update_text(content) {
        this.content = content;
        while(this.text.firstChild) {
            this.text.firstChild.remove();
        }
        this.text.appendChild(document.createTextNode(content));
    }

    show(evt) {
        if (!this.content) {
            return;
        }
        let x = evt.clientX;
        let y = evt.clientY;
        this.tip.setAttributeNS(null,"visibility","visible");
        this.tip.setAttributeNS(null,"transform","translate("+(x+10)+" "+(y+10)+")");
        let bb = this.text.getBBox();
        this.background.setAttributeNS(null,"width",bb.width+10);
        this.background.setAttributeNS(null,"height",bb.height+10);
    }

    move(evt) {
        let x = evt.clientX;
        let y = evt.clientY;
        this.tip.setAttributeNS(null,"transform","translate("+(x+10)+" "+(y+10)+")");
    }

    hide() {
        this.tip.setAttributeNS(null,"visibility","hidden");
    }
    
    remove() {
        this.tip.remove();
    }
}