# xparsejax

This is a simple implementation of LaTeX `xparse` package for MathJax. Currently it provides three family of commands:

- `NewDocumentCommand` (also `Renew...`, `Provide...` and `Declare...` variants as aliases);
- `IfBooleanTF` (also `T` and `F` variants);
- `IfNoValueTF` (also `T` and `F` variants).

Supported argument type specifiers are:
- `m`: mandatory argument;
- `o`: optional argument;
- `O⟨default⟩`: optional argument with default;
- `s`: optional star;
- `t⟨token⟩`: optional token.

Please refer to `xparse` documentation on CTAN for more information about the commands.

Note that `NewDocumentEnviroment` is not implemented but should not be hard to do so. There are also many other argument types that could be implemented with varying degrees of difficulty. 

## Usage

There is a packed minified version under [`browser`](browser). You can serve it under your website (say, at `/path/to/xparsejax.js`) and load it in your MathJax configuration like so:

```js
MathJax = {
  loader: {
    load: ['[xparsejax]/xparsejax.js'],
    paths: {xparsejax: '/path/to'} // specify your path here
  },
  tex: {
    packages: {'[+]': ['xparsejax']},
  },
  [... other stuff ...]
}
```

To compile it yourself, it should suffice to do:
```sh
cd xparsejax
npm install
npm run build
```
