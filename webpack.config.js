module.exports = {
	entry: "./v2/timingsrc.js",
	output: {
		path: __dirname,
		filename: "./lib/webpack-timingsrc-v2.js",
		libraryTarget: "var", // export itself to global var
  		library: "TIMINGSRC" // name of global var
	}
};