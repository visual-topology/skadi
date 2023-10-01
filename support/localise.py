#   Skadi - A visual modelling tool for constructing and executing directed graphs.
#
#   Copyright (C) 2022-2023 Visual Topology Ltd
#
#   Licensed under the Open Software License version 3.0


class L10NUtils:

    def __init__(self,bundle):
        self.bundle = bundle
        
    def localise(self,input):
        # treat the input as possibly containing embedded keys, delimited by {{ and }}, 
        # for example "say {{hello}}" embeds they key hello
        # substitute any embedded keys and the surrounding delimiters with their values, if the key is present in the bundle
        idx = 0
        s = ""
        input_len = len(input)
        while idx<input_len:
            if input[idx:idx+2] == "{{":
                startidx = idx+2
                idx += 2
                while idx<input_len:
                    if input[idx:idx+2] == "}}":
                        token = input[startidx:idx]
                        if token in self.bundle:
                            token = self.bundle[token]    
                        s += token
                        idx += 2
                        break
                    else:
                        idx += 1
            else:
                s += input[idx]
                idx += 1
        
        return s

if __name__ == '__main__':

    import argparse
    import json
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path",help="Specify path of the file to localise")
    parser.add_argument("bundle_path",help="Specify path of the localisation bundle")
    parser.add_argument("output_path",help="Specify the path to write the localised output")
    parser.add_argument("--encoding",default="utf-8",help="Specify the input and output encodings")
    args = parser.parse_args()
    
    with open(args.input_path,encoding=args.encoding) as f:
        input = f.read()
    
    with open(args.bundle_path,encoding="utf-8") as f:
        bundle = json.loads(f.read())

    localiser = L10NUtils(bundle)

    with open(args.output_path,"w",encoding=args.encoding) as f:
        f.write(localiser.localise(input))
    

