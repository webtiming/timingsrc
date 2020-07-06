# timingsrc

Web Documentation for timingsrc available at [http://webtiming.github.io/timingsrc/](http://webtiming.github.io/timingsrc/)

Timingsrc includes source code and documentation for timing related libraries managed by [Multi-Device Timing Community Group](https://www.w3.org/community/webtiming/)

The timingsrc library is available under the LGPL licence.

### Timing Object

[timingobject](v2/timingobject)

This implements the [Timing Object Draft Spec](https://github.com/webtiming/timingobject) as well as a set of Timing Converters.

### Sequencing

[sequencing](v2/sequencing)

This implements tools for timed sequencing based on the Timing Object.


### Compile


Install Node and NPM (Node Packet Manager)

#### Ubuntu Instructions

Update if necessary

```sh
sudo apt update
sudo apt-get update
```

Add NodeSource repository for Nodejs and NPM (Node Packet Manager)

[Install Nodejs on Ubuntu](https://github.com/nodesource/distributions)

```sh
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -

# script output
# Run `sudo apt-get install -y nodejs` to install Node.js 14.x and npm
# You may also need development tools to build native addons:
#     sudo apt-get install gcc g++ make
# To install the Yarn package manager, run:
#     curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
#     echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
#     sudo apt-get update && sudo apt-get install yarn


# install both node and npm
sudo apt-get install -y nodejs
```


#### Install Package Dependencies

- Bundler: [Rollup](https://rollupjs.org/guide/en/).
- Script Minifier: [Terser](https://terser.org/)
- Bundler Plugin: [Rollup-Plugin-Terser](https://www.npmjs.com/package/rollup-plugin-terser)

Install from package.json

```sh
cd ~/timingsrc
npm install
```

Alternatively, install manually

```sh
# Install Rollup
npm install rollup --save-dev
npm install terser --save-dev
npm install rollup-plugin-terser --save-dev
```



Install node modules
- rollup
- terser
- rollup-plugin-terser


```sh
./compile.py v3
```
