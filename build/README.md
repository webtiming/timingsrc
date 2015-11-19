## Build directory for Sequencer

Build javascript into target directory build/built by running shell script in terminal. Target directory build/built is included in .gitignore. To deploy new files copy js files from build/built into lib catalogue.

```
./build.sh
```

#### Require usage
Two js files are built for script loading using requirejs. 

- sequencer-require.js
- sequencer-require-min.js // minified

```javascript
require('sequencer');
```

#### Regular usage
Two js files are built for regular script loading.

- sequencer.js 
- sequencer-min.js  // minified

For regular script load the sequencer module will be made available as a property SEQUENCER on the global object. If amd.define exists, the sequencer is defined with the name 'sequencer'.





