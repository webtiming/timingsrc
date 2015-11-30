## Build directory for Sequencer

Build javascript into target directory timingsrc/lib by running shell script in terminal.

```
./build.sh
```

#### Require usage
Two js files are built for script loading using requirejs. 

- timingsrc-require.js
- timingsrc-require-min.js // minified

```javascript
require('timingsrc');
```

#### Regular usage
Two js files are built for regular script loading.

- timingsrc.js 
- timingsrc-min.js  // minified

For regular script load the timingsrc module will be made available as a property TIMINGSRC on the global object. If amd.define exists, the module is defined with the name 'timingsrc'.





