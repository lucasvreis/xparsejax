const webpack = require('webpack');
const PACKAGE = require('mathjax-full/components/webpack.common.js');

module.exports = {
  ...PACKAGE(
    'xparsejax',                          // the name of the package to build
    '../node_modules/mathjax-full/js',    // location of the mathjax library
    [                                     // packages to link to
      'components/src/core/lib',
      'components/src/input/tex-base/lib'
    ],
    __dirname,                            // our directory
    '../build/'                                   // where to put the packaged component
  ),
  // optimization: {
  //   minimize: false
  // },
};
