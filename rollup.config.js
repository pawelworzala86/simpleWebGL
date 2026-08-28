// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/app.js',
  output: {
    file: 'dist/bundle.min.js',
    format: 'iife',
    sourcemap: false
  },
  plugins: [
    resolve(),
    terser()
  ]
};