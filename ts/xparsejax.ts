
import { Configuration } from 'mathjax-full/mjs/input/tex/Configuration.js';
import { CommandMap } from 'mathjax-full/mjs/input/tex/TokenMap.js';
import { Macro } from 'mathjax-full/mjs/input/tex/Token.js';
import { ParseMethod } from 'mathjax-full/mjs/input/tex/Types.js';
import TexError from 'mathjax-full/mjs/input/tex/TexError.js';
import TexParser from 'mathjax-full/mjs/input/tex/TexParser.js';
import { ParseUtil } from 'mathjax-full/mjs/input/tex/ParseUtil.js';
import { UnitUtil } from 'mathjax-full/mjs/input/tex/UnitUtil.js';

const XPARSEMAP = 'xparseCmdMap';

let xparseMethods: Record<string, ParseMethod> = {};

interface SimpleArg {
  type: 'm' | 'o' | 's'
}

interface OptionalDefaultArg {
  type: 'O',
  default: string
}

interface TokenArg {
  type: 't',
  token: string
}

type Arg = SimpleArg | OptionalDefaultArg | TokenArg

type ArgSpec = Arg[]

const DocumentCommand = (parser: TexParser, name: string, macro: string, argSpec_: string) => {
  const argSpec = JSON.parse(argSpec_);
  if (argSpec.length) {
    const args: string[] = [];
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
      }
    }
    macro = ParseUtil.substituteArgs(parser, args, macro);
  }
  parser.string = ParseUtil.addArgs(parser, macro, parser.string.slice(parser.i));
  parser.i = 0;
  ParseUtil.checkMaxMacros(parser);
};

function GetCsNameArgument(parser: TexParser, name: string) {
  let cs = UnitUtil.trimSpaces(parser.GetArgument(name));
  if (cs.charAt(0) === '\\') {
    cs = cs.substring(1);
  }
  if (!cs.match(/^(.|[a-z]+)$/i)) {
    throw new TexError('IllegalControlSequenceName',
      'First argument of \'%1\' must be a command.', parser.currentCS);
  }
  return cs;
}

function GetArgumentSpec(parser: TexParser): ArgSpec {
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
            spec.push({ type: c, default: def });
            break;
          }
          case 's':
            spec.push({ type: c });
            break;
          case 't': {
            const tok = parser.GetArgument('t');
            spec.push({ type: c, token: tok });
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

xparseMethods.documentCmd = function (parser: TexParser, name: string) {
  const cs = GetCsNameArgument(parser, name);
  const argSpec = GetArgumentSpec(parser);
  const def = parser.GetArgument(name);

  const handlers = parser.configuration.handlers;
  const handler = handlers.retrieve(XPARSEMAP) as CommandMap;
  handler.add(cs, new Macro(cs, DocumentCommand, [def, JSON.stringify(argSpec)]));
}

xparseMethods.ifBoolean = function (parser: TexParser, name: string, mode: string) {
  const cs = UnitUtil.trimSpaces(parser.GetArgument(name));
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
}

xparseMethods.ifNoValue = function (parser: TexParser, name: string, mode: string) {
  const cs = UnitUtil.trimSpaces(parser.GetArgument(name));
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
}, xparseMethods);

export const configuration = Configuration.create(
  'xparse', { handler: { macro: [XPARSEMAP] } }
);
