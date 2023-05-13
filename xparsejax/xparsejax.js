import {Configuration}  from '../node_modules/mathjax-full/js/input/tex/Configuration.js';
import {CommandMap} from '../node_modules/mathjax-full/js/input/tex/SymbolMap.js';
import {Macro} from '../node_modules/mathjax-full/js/input/tex/Symbol.js';
import TexError from '../node_modules/mathjax-full/js/input/tex/TexError.js';
import ParseUtil from '../node_modules/mathjax-full/js/input/tex/ParseUtil.js';

const XPARSEMAP = 'xparseCmdMap';

const DocumentCommand = (parser, name, macro, argSpec) => {
  const args = [];

  if (argSpec.length) {
    for (const arg of argSpec) {
      switch (arg.type) {
        case 'm':
          args.push(
            parser.GetArgument(name)
          );
          break;
        case 'o':
          args.push(
            parser.GetBrackets(name) || '-NoValue-'
          );
          break;
        case 'O':
          args.push(
            parser.GetBrackets(name) || arg.default
          );
          break;
        case 's':
          args.push(
            parser.GetStar() ? '\\BooleanTrue' : '\\BooleanFalse'
          );
          break;
        case 't': {
          const tok = (parser.GetNext() === arg.token);
          if (tok) {
            parser.i++;
          }
          args.push(
            tok ? '\\BooleanTrue' : '\\BooleanFalse'
          );
          break;
        }
        default:
          throw new TexError('NotImplemented', 'Argument type \'' + arg.type + '\' not yet implemented!');
      }
    }
    macro = ParseUtil.substituteArgs(parser, args, macro);
  }
  parser.string = ParseUtil.addArgs(parser, macro, parser.string.slice(parser.i));
  parser.i = 0;
  ParseUtil.checkMaxMacros(parser);
};

function GetCsNameArgument(parser, name) {
  let cs = ParseUtil.trimSpaces(parser.GetArgument(name));
  if (cs.charAt(0) === '\\') {
    cs = cs.substr(1);
  }
  if (!cs.match(/^(.|[a-z]+)$/i)) {
    throw new TexError('IllegalControlSequenceName',
                       'First argument of \'%1\' must be a command.', parser.currentCS);
  }
  return cs;
}

function GetArgumentSpec(parser) {
  const spec = [];
  switch (parser.GetNext()) {
    case '}':
      throw new TexError('ExtraCloseMissingOpen',
                         'Extra close brace or missing open brace');
    case '{':
      parser.i++;
      while (parser.i < parser.string.length) {
        while (parser.nextIsSpace()) {
          parser.i++;
        }
        const c = parser.string.charAt(parser.i++);
        switch (c) {
          case 'm':
          case 'o':
          case 'O': {
            const def = parser.GetArgument('O');
            spec.push({type: c, default: def});
            break;
          }
          case 's':
            spec.push({type: c});
            break;
          case 't': {
            const tok = parser.GetArgument('t');
            spec.push({type: c, token: tok});
            break;
          }
          case '}':
            return spec;
          case 'r':
          case 'R':
          case 'v':
          case 'd':
          case 'D':
          case 'e':
          case 'E':
            throw new TexError('NotImplemented', 'Argument type \'' + c + '\' not yet supported!');
          default:
            throw new TexError('DocumentCommand', 'Invalid argument spec \'' + c + '\' in command definition.');
        }
      }
      throw new TexError('MissingCloseBrace', 'aaMissing close brace');
    default:
      throw new TexError('MissingArgFor', 'Missing argument for %1', parser.currentCS);
  }
}

new CommandMap(XPARSEMAP, {
  NewDocumentCommand: ['documentCmd', 'new'],
  RenewDocumentCommand: ['documentCmd', 'renew'],
  ProvideDocumentCommand: ['documentCmd', 'provide'],
  DeclareDocumentCommand: ['documentCmd', 'declare'],
  IfBooleanTF: ['ifBoolean', 'tf'],
  IfBooleanT: ['ifBoolean', 't'],
  IfBooleanF: ['ifBoolean', 'f'],
  IfNoValueTF: ['ifNoValue', 'tf'],
  IfNoValueT: ['ifNoValue', 't'],
  IfNoValueF: ['ifNoValue', 'f'],
}, {
  documentCmd(parser, name, _type) {
    const cs = GetCsNameArgument(parser, name);
    const argSpec = GetArgumentSpec(parser);
    const def = parser.GetArgument(name);

    const handlers = parser.configuration.handlers;
    const handler = handlers.retrieve(XPARSEMAP);
    handler.add(cs, new Macro(cs, DocumentCommand, [def, argSpec]));
  },
  ifBoolean(parser, name, mode) {
    const cs = ParseUtil.trimSpaces(parser.GetArgument(name));
    const yes = parser.GetArgument(name);
    const no = mode === 'tf' ? parser.GetArgument(name) : '';
    const choice = (() => {
      switch (cs) {
        case '\\BooleanTrue':
          return !(mode === 'f');
        case '\\BooleanFalse':
          return mode === 'f';
        default:
          throw new TexError('InvalidArgument', 'Invalid argument ' + cs + ' to ' + parser.currentCS);
      }
    })();
    parser.string = ParseUtil.addArgs(parser, choice ? yes : no, parser.string.slice(parser.i));
    parser.i = 0;
    ParseUtil.checkMaxMacros(parser);
  },
  ifNoValue(parser, name, mode) {
    const cs = ParseUtil.trimSpaces(parser.GetArgument(name));
    const yes = parser.GetArgument(name);
    const no = mode === 'tf' ? parser.GetArgument(name) : '';
    const choice = (() => {
      switch (cs) {
        case '-NoValue-':
          return !(mode === 'f');
        default:
          return mode === 'f';
      }
    })();
    parser.string = ParseUtil.addArgs(parser, choice ? yes : no, parser.string.slice(parser.i));
    parser.i = 0;
    ParseUtil.checkMaxMacros(parser);
  }
});

Configuration.create(
   'xparse', {handler: {macro: [XPARSEMAP]}}
);
