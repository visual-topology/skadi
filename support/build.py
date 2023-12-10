#   Skadi - A visual modelling tool for constructing and executing directed graphs.
#
#   Copyright (C) 2022-2023 Visual Topology Ltd
#
#   Licensed under the Open Software License version 3.0

import os
import shutil

header_comment = """/*   Skadi - A visual modelling tool for constructing and executing directed graphs.

     Copyright (C) 2022-2023 Visual Topology Ltd

     Licensed under the Open Software License version 3.0 
*/

"""

def remove_license_comments(contents):
    # treat initial lines starting with a // comment as license blocks
    filtered_lines = []
    lines = contents.split("\n")
    nr = 0
    if lines[0].startswith("/*"):
        nr += 1
        while nr < len(lines) and not lines[nr].startswith("*/"):
            nr += 1
        nr += 1
    while nr < len(lines):
        filtered_lines.append(lines[nr])
        nr += 1
    return "\n".join(filtered_lines)

repo_dir = os.path.join(os.path.split(__file__)[0],"..")

class Output:

    def __init__(self, output_filename, comment_paths=True):
        self.output_path = os.path.join(repo_dir,output_filename)
        output_dir = os.path.split(self.output_path)[0]
        os.makedirs(output_dir,exist_ok=True)
        self.of = None
        self.first_entry = True
        self.comment_paths = comment_paths    

    def __enter__(self):
        self.of = open(self.output_path,"w")
        if self.output_path.endswith(".js"):
            self.of.write(header_comment)
        return self

    def add(self, input_path, subs={}):
        fq_input_path = os.path.join(repo_dir, input_path)
        with open(fq_input_path, "r") as f:
            r = f.read()
            for (original,replacement) in subs.items():
                r = r.replace(original,replacement)
            if self.output_path.endswith(".js"):
                r = remove_license_comments(r)
            if self.comment_paths:
                self.of.write(f"/* {input_path} */\n")
            self.of.write(r)
            if self.comment_paths:
                self.of.write("\n\n")
        self.first_entry = False

    def add_str(self,s):
        self.of.write(s)

    def __exit__(self, a,b,c):
        self.of.close()
        self.of = None

print("Building: skadi-designer.js")

with Output("docs/api/skadi-designer.js") as of:
    of.add("skadi/js/common/icons.js")
    of.add("skadi/js/common/geometry.js")
    of.add("skadi/js/common/palette.js")
    of.add("skadi/js/common/palette_entry.js")
    of.add("skadi/js/common/svg_dialogue.js")
    of.add("skadi/js/common/iframe_dialogue.js")
    of.add("skadi/js/common/palette_dialogue.js")
    of.add("skadi/js/common/text_menu_dialogue.js")
    of.add("skadi/js/common/tooltip.js")
    of.add("skadi/js/common/x3.js")
    of.add("skadi/js/utils/resource_loader.js")
    of.add("skadi/js/utils/icon_utils.js")
    of.add("skadi/js/services/status_states.js")
    of.add("skadi/js/utils/topology_store.js")
    of.add("skadi/js/core/core.js")
    of.add("skadi/js/core/core_node.js")
    of.add("skadi/js/core/core_link.js")
    of.add("skadi/js/core/core_configuration.js")
    of.add("skadi/js/core/network.js")
    of.add("skadi/js/dialogs/about.js")
    of.add("skadi/js/dialogs/save.js")
    of.add("skadi/js/dialogs/load.js")
    of.add("skadi/js/dialogs/clear.js")
    of.add("skadi/js/dialogs/adjust.js")
    of.add("skadi/js/dialogs/design_metadata.js")
    of.add("skadi/js/dialogs/configuration.js")
    of.add("skadi/js/controls/button.js")
    of.add("skadi/js/controls/text_button.js")
    of.add("skadi/js/graph/designer.js")
    of.add("skadi/js/graph/node.js")
    of.add("skadi/js/graph/link.js")
    of.add("skadi/js/graph/port.js")
    of.add("skadi/js/graph/configuration.js")
    of.add("skadi/js/base/configuration_base.js")
    of.add("skadi/js/base/node_base.js")
    of.add("skadi/js/services/node_service.js")
    of.add("skadi/js/services/wrapper.js")
    of.add("skadi/js/services/configuration_service.js")
    of.add("skadi/js/schema/node_type.js")
    of.add("skadi/js/schema/link_type.js")
    of.add("skadi/js/schema/package_type.js")
    of.add("skadi/js/schema/port_type.js")
    of.add("skadi/js/schema/schema.js")
    of.add("skadi/js/skadi-api.js")
    of.add("skadi/js/skadi-designer-api.js")
    of.add("skadi/js/utils/l10n_utils.js")
    of.add("skadi/js/utils/expr_parser.js")

print("Building: skadi-application.js")

with Output("docs/api/skadi-application.js") as of:
    of.add("skadi/js/common/icons.js")
    of.add("skadi/js/common/x3.js")
    of.add("skadi/js/utils/resource_loader.js")
    of.add("skadi/js/utils/icon_utils.js")
    of.add("skadi/js/services/status_states.js")
    of.add("skadi/js/utils/topology_store.js")
    of.add("skadi/js/core/core.js")
    of.add("skadi/js/core/core_node.js")
    of.add("skadi/js/core/core_link.js")
    of.add("skadi/js/core/core_configuration.js")
    of.add("skadi/js/core/network.js")
    of.add("skadi/js/base/configuration_base.js")
    of.add("skadi/js/base/node_base.js")
    of.add("skadi/js/services/node_service.js")
    of.add("skadi/js/services/wrapper.js")
    of.add("skadi/js/services/configuration_service.js")
    of.add("skadi/js/schema/node_type.js")
    of.add("skadi/js/schema/link_type.js")
    of.add("skadi/js/schema/package_type.js")
    of.add("skadi/js/schema/port_type.js")
    of.add("skadi/js/schema/schema.js")
    of.add("skadi/js/app/application.js")
    of.add("skadi/js/skadi-api.js")
    of.add("skadi/js/skadi-application-api.js")
    of.add("skadi/js/utils/l10n_utils.js")
    of.add("skadi/js/utils/expr_parser.js")

print("Building: skadi-designer.css")

with Output("docs/api/skadi-designer.css") as of:
    of.add("skadi/css/controls.css")
    of.add("skadi/css/designer.css")
    of.add("skadi/css/dialogue.css")
    of.add("skadi/css/link.css")
    of.add("skadi/css/node.css")
    of.add("skadi/css/port.css")

print("Building: skadi-application.css")

with Output("docs/api/skadi-application.css") as of:
    of.add("skadi/css/application.css")

print("Building: skadi-executor.js")

with Output("docs/api/skadi-executor.js") as of:
    of.add("skadi-executor/js/node_execution_states.js")
    of.add("skadi-executor/js/executable_node_service.js")
    of.add("skadi-executor/js/executable_node_wrapper.js")
    of.add("skadi-executor/js/graph_link.js")
    of.add("skadi-executor/js/graph_executor.js")
    of.add("skadi-executor/js/node_execution_failed.js")

print("Copying: skadi-designer.html")

with Output("docs/api/skadi-designer.html", comment_paths=False) as of:
    of.add("skadi/html/skadi-designer.html")

print("Copying: skadi-application.html")

with Output("docs/api/skadi-application.html", comment_paths=False) as of:
    of.add("skadi/html/skadi-application.html")

print("Copying: skadi-about.html")

with Output("docs/api/skadi-about.html", comment_paths=False) as of:
    of.add("skadi/html/skadi-about.html")

print("Copying: skadi-page.js")

with Output("docs/api/skadi-page.js") as of:
    of.add("skadi-page/js/skadi-page.js")

print("Copying: l10n")

target_l10n = os.path.join(repo_dir,"docs/api/l10n")
if os.path.exists(target_l10n):
    shutil.rmtree(target_l10n)
source_l10n = os.path.join(repo_dir,"skadi/l10n")

shutil.copytree(source_l10n, target_l10n)

print("Copying: skadi-designer.html")

with Output("docs/api/skadi.svg", comment_paths=False) as of:
    of.add("skadi/images/skadi.svg")
