// Rollup plugins
import {terser} from 'rollup-plugin-terser';
export default {
    input: 'v3/index.js',
    output: {
        file: "bundle.js",
        format: "es"
    },
    plugins: [
        (process.env.BUILD === 'production' && terser()),
    ],
};
