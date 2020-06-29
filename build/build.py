#!/usr/bin/python3

import sys
import os
import subprocess

versions = ["v1", "v2"]


def build(version):
    srcdir = os.path.join("../", version)
    libdir = "../docs/lib"

    baseUrl = "baseUrl={}".format(srcdir)
    almond = "almond-build-{}.js".format(version)

    # requirejs - unminified
    out = "out={}/timingsrc-require-{}.js".format(libdir, version)
    args = [
        "node", "r.js", "-o", baseUrl,
        "optimize=none", "name=timingsrc", out
    ]
    print(" ".join(args))
    subprocess.call(args)

    # requirejs - minified
    out = "out={}/timingsrc-require-min-{}.js".format(libdir, version)
    args = ["node", "r.js", "-o", baseUrl, "name=timingsrc", out]
    print(" ".join(args))
    subprocess.call(args)

    # plain - unminified
    out = "out={}/timingsrc-{}.js".format(libdir, version)
    args = ["node", "r.js", "-o", almond, "optimize=none", out]
    print(" ".join(args))
    subprocess.call(args)

    # plain - minified
    out = "out={}/timingsrc-min-{}.js".format(libdir, version)
    args = ["node", "r.js", "-o", almond, out]
    print(" ".join(args))
    subprocess.call(args)


if __name__ == '__main__':

    if len(sys.argv) > 1:
        _versions = [sys.argv[1]]
    else:
        _versions = versions

    for version in _versions:
        build(version)
