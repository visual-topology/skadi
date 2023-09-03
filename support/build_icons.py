#   Skadi - A visual modelling tool for constructing and executing directed graphs.
#
#   Copyright (C) 2022-2023 Visual Topology Ltd
#
#   Licensed under the Open Software License version 3.0


import os
import base64

repo_dir = os.path.join(os.path.split(__file__)[0],"..")


class IconOutput:

    JS_TEMPLATE = "let icon_%s = 'data:image/svg+xml;base64,%s';"

    def __init__(self):
        self.content = "";


    def __enter__(self):
        return self

    def add(self, svg_path):
        fq_svg_path = os.path.join(repo_dir, svg_path)
        icon_name = os.path.splitext(os.path.split(svg_path)[1])[0]

        with open(fq_svg_path, "r+b") as f:
            content = base64.b64encode(f.read()).decode('utf-8')
            self.content += "\n"
            self.content += "/* " + svg_path + "*/\n"
            self.content += IconOutput.JS_TEMPLATE % (icon_name, content)
            self.content += "\n"

    def get_content(self):
        return self.content

    def __exit__(self, a, b, c):
        pass

print("Building: icon.js")
iof = IconOutput()
iof.add("skadi/icons/close_purple.svg")
iof.add("skadi/icons/drag_indicator_purple.svg")
iof.add("skadi/icons/home_purple.svg")
iof.add("skadi/icons/file_upload_purple.svg")
iof.add("skadi/icons/file_download_purple.svg")
iof.add("skadi/icons/help_purple.svg")
iof.add("skadi/icons/palette_purple.svg")
iof.add("skadi/icons/status_error.svg")
iof.add("skadi/icons/status_info.svg")
iof.add("skadi/icons/status_warning.svg")
iof.add("skadi/icons/play.svg")
iof.add("skadi/icons/pause.svg")
iof.add("skadi/icons/delete.svg")
iof.add("skadi/icons/edit_purple.svg")
iof.add("skadi/icons/configuration_purple.svg")
icon_js = iof.get_content()

with open(os.path.join(repo_dir,"skadi/js/common/icons.js"),"w") as f:
    f.write(icon_js)

