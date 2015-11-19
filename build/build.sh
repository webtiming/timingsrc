node r.js -o baseUrl=../source name=timingsrc out=../lib/timingsrc-require-min.js # built and minified for requirejs usage
node r.js -o baseUrl=../source name=timingsrc optimize=none out=../lib/timingsrc-require.js # built for requirejs usage
node r.js -o almond-build.js optimize=none out=../lib/timingsrc.js # built for regular script includes
node r.js -o almond-build.js out=../lib/timingsrc-min.js # built and minified for regular script includes