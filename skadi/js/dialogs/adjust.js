/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

let skadi_adjust_html = `<span aria-describedby="adjust-tooltip">
    {{node.adjust}}
</span>
<div class="exo-icon exo-icon-inline exo-icon-help exo-help-tooltip"
     tabindex="0">
    <div id="adjust-tooltip" class="exo-help-content exo-white-bg exo-border"
         role="tooltip">
         {{node.adjust.tooltip}}
    </div>
</div>
<div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{node.name}}:
        </div>
        <div class="exo-2-cell">
            <input id="$edit_name_id" type="text" value="" class="exo-full-width">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{node.description}}:
        </div>
        <div class="exo-2-cell">
            <textarea id="$edit_description_id" rows="10" class="exo-full-width"></textarea>
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
            {{node.orientation}}:
        </div>
        <div class="exo-2-cell">
            <input type="number" id="$rotate_id" step="1">
        </div>
    </div>
    <div class="exo-row">
        <div class="exo-2-cell">
        </div>
        <div class="exo-1-cell">
            <button id="$rotate_left_id">
                <img alt="Rotate icon left" src="${icon_rotate_left}" class="exo-icon-large">
            </button>
        </div><div class="exo-1-cell">
            <button id="$rotate_right_id">
                <img alt="Rotate icon right" src="${icon_rotate_right}" class="exo-icon-large">
            </button>
        </div>
    </div>
</div>
`

function skadi_populate_adjust(design, node, elt, close_window) {
    let edit_name_id = "edit_node_"+node.get_id()+"_name";
    let edit_description_id = "edit_description_"+node.get_id()+"_description";
    let rotate_id = "rotate_node_"+node.get_id();
    let rotate_left_id = "rotate_left_node_"+node.get_id();
    let rotate_right_id = "rotate_right_node_"+node.get_id();
    
    elt.innerHTML = design.localise(skadi_adjust_html)
        .replace("$edit_name_id",edit_name_id)
        .replace("$edit_description_id", edit_description_id)
        .replace("$rotate_id",rotate_id)
        .replace("$rotate_left_id",rotate_left_id)
        .replace("$rotate_right_id",rotate_right_id);
    
    let name_input = document.getElementById(edit_name_id);
    name_input.value = node.metadata["name"];
    let description_input = document.getElementById(edit_description_id);
    description_input.value = node.metadata["description"];
    let rotate_input = document.getElementById(rotate_id);
    let rotate_left_button = document.getElementById(rotate_left_id);
    let rotate_right_button = document.getElementById(rotate_right_id);

    let cb = (evt) => {
      let new_metadata = {
         "name": name_input.value,
         "description": description_input.value
      };
      node.design.update_metadata(node.id, new_metadata, false);
    };
    name_input.addEventListener("change", cb);
    description_input.addEventListener("change", cb);
    rotate_input.value = node.get_rotation().toFixed(0);
    rotate_input.addEventListener("change", ev=> {
        let a = Number.parseInt(rotate_input.value);
        node.set_rotation(a);
        node.update_position(node.x, node.y);
    });
    rotate_left_button.addEventListener("click",(evt) => {
        node.set_rotation(node.get_rotation()-45);
        node.update_position(node.x, node.y);
        rotate_input.value = ""+node.get_rotation();
      });
    rotate_right_button.addEventListener("click",(evt) => {
      node.set_rotation(node.get_rotation()+45);
      node.update_position(node.x, node.y);
      rotate_input.value = ""+node.get_rotation();
    });
}