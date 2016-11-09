node r.js -o baseUrl=../v1 name=timingsrc out=../lib/timingsrc-require-min.js # built and minified for requirejs usage
node r.js -o baseUrl=../v1 name=timingsrc optimize=none out=../lib/timingsrc-require.js # built for requirejs usage
node r.js -o almond-build-v1.js optimize=none out=../lib/timingsrc.js # built for regular script includes
node r.js -o almond-build-v1.js out=../lib/timingsrc-min.js # built and minified for regular script includes

node r.js -o baseUrl=../v2 name=timingsrc out=../lib/timingsrc-require-min-v2.js # built and minified for requirejs usage
node r.js -o baseUrl=../v2 name=timingsrc optimize=none out=../lib/timingsrc-require-v2.js # built for requirejs usage
node r.js -o almond-build-v2.js optimize=none out=../lib/timingsrc-v2.js # built for regular script includes
node r.js -o almond-build-v2.js out=../lib/timingsrc-min-v2.js # built and minified for regular script includes