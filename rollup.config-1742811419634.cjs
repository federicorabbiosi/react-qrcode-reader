'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var resolve = require('@rollup/plugin-node-resolve');
var commonjs = require('@rollup/plugin-commonjs');
var typescript = require('@rollup/plugin-typescript');
var dts = require('rollup-plugin-dts');
var terser = require('@rollup/plugin-terser');
var peerDepsExternal = require('rollup-plugin-peer-deps-external');
var babel = require('@rollup/plugin-babel');
var postcss = require('rollup-plugin-postcss');

const packageJson = require("./package.json");

var rollup_config = [
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: false,
      },
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: false,
      },
    ],
    plugins: [
      babel({
        exclude: "node_modules/**"
      }),
      peerDepsExternal(),
      resolve(),
      postcss(),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" }),
      terser(),
    ],
    external: ["react", "react-dom", "/.css"],
  },
  {
    input: "src/index.ts",
    output: [{ file: "dist/types.d.ts", format: "es" }],
    plugins: [
      dts.default(),
      postcss(),
    ],
  }
];

exports.default = rollup_config;
