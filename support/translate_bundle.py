#   Skadi - A visual modelling tool for constructing and executing directed graphs.
#
#   Copyright (C) 2022-2023 Visual Topology Ltd
#
#   Licensed under the Open Software License version 3.0

import os.path
import json

from googletrans import Translator # pip3 install googletrans==4.0.0rc1
translator = Translator()

class BundleTranslator:
    
    def __init__(self,from_path):
        with open(from_path,encoding="utf-8") as f:
            self.from_bundle = json.loads(f.read()) 
        self.from_lang = os.path.splitext(os.path.split(from_path)[1])[0]
        
    def translate(self, to_path):
        if os.path.exists(to_path):
            with open(to_path,encoding="utf-8") as f:
                to_bundle = json.loads(f.read()) 
        else:
            to_bundle = {} 
        to_lang = os.path.splitext(os.path.split(to_path)[1])[0]
        for key in self.from_bundle:
            if key not in to_bundle:
                src_text=self.from_bundle[key]
                try:
                    dst_text=translator.translate(src_text,src=self.from_lang,dest=to_lang).text
                    print(f"Translated {src_text} => {dst_text}")
                    to_bundle[key] = dst_text 
                except:
                    print(f"Failed to translate {src_text}")
        with open(to_path,"w",encoding="utf-8") as f:
            f.write(json.dumps(to_bundle))


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("from_bundle")
    parser.add_argument("to_bundle")
    args = parser.parse_args()
    bt = BundleTranslator(args.from_bundle)
    bt.translate(args.to_bundle)
        