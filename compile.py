#!/usr/bin/python3

import sys
import os
import subprocess

versions = ["v1", "v2", "v3"]


def build(version):
    srcdir = os.path.join(".", version)
    libdir = "docs/lib"

    if version == "v3":

        entry_file = os.path.join(srcdir, "index.js")
        rollup_config = os.path.join(".", "rollup.config.js")

        # classic - unminified
        # out = os.path.join(libdir, f'timingsrc-classic-{version}.js')
        # args = ["rollup", "-m", "-f", "iife", "--name", "TIMINGSRC", "-o", out, entry_file]
        # print(" ".join(args))
        # subprocess.call(args)

        # classic - minified
        # out = os.path.join(libdir, f'timingsrc-classic-min-{version}.js')
        # args = ["rollup",
        #        "-f", "iife",
        #        "--name", "TIMINGSRC",
        #        "-m",
        #        "--environment", "BUILD:production",
        #        "-c", rollup_config,
        #        "-o", out,
        #        entry_file]
        # print(" ".join(args))
        # subprocess.call(args)

        # module export - unminified
        out = os.path.join(libdir, f'timingsrc-{version}.js')
        args = ["rollup", "-m", "-f", "es", "-o", out, entry_file]
        print(" ".join(args))
        subprocess.call(args)

        # module export - minified
        out = os.path.join(libdir, f'timingsrc-min-{version}.js')
        args = ["rollup",
                "-f", "es",
                "-m",
                "--environment", "BUILD:production",
                "-c", rollup_config,
                "-o", out,
                entry_file]
        print(" ".join(args))
        subprocess.call(args)

    else:
        builddir = "build"
        baseUrl = "baseUrl={}".format(srcdir)
        almond = os.path.join(builddir, "almond-build-{}.js".format(version))
        rjs = os.path.join(builddir, "r.js")

        # requirejs - unminified
        out = "out={}/timingsrc-require-{}.js".format(libdir, version)
        args = [
            "node", rjs, "-o", baseUrl,
            "optimize=none", "name=timingsrc", out
        ]
        print(" ".join(args))
        subprocess.call(args)

        # requirejs - minified
        out = "out={}/timingsrc-require-min-{}.js".format(libdir, version)
        args = ["node", rjs, "-o", baseUrl, "name=timingsrc", out]
        print(" ".join(args))
        subprocess.call(args)

        # plain - unminified
        out = "out={}/timingsrc-{}.js".format(libdir, version)
        args = ["node", rjs, "-o", almond, "optimize=none", out]
        print(" ".join(args))
        subprocess.call(args)

        # plain - minified
        out = "out={}/timingsrc-min-{}.js".format(libdir, version)
        args = ["node", rjs, "-o", almond, out]
        print(" ".join(args))
        subprocess.call(args)


if __name__ == '__main__':

    if len(sys.argv) > 1:
        _versions = [sys.argv[1]]
    else:
        _versions = versions

    for version in _versions:
        build(version)
