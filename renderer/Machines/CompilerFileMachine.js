import { assign, Machine, sendParent } from 'xstate';
import Tokenizer from './Tokenizer';
import { translateVMInstruction } from './translateVMInstruction';
const fs = global.fs;
const path = global.path;

const initialContext = {
  rawFile: '',
  cleanedFileArr: [],
  symbolList: {},
  encodedFile: '',
  filename: '',
  filepath: '',
  uniqueCount: 0,
  currentFunction: '',
};

export default Machine({
  initial: 'init',
  context: initialContext,
  states: {
    init: {
      always: {
        target: 'idle',
        // populate symbol list
        actions: [
          assign({
            symbolList: () => {
              const symbolList = {
                SCREEN: 16384,
                KBD: 24576,
                SP: 0,
                LCL: 1,
                ARG: 2,
                THIS: 3,
                THAT: 4,
              };
              for (let i = 0; i <= 15; i++) {
                symbolList['R' + i] = i;
              }
              return symbolList;
            },
          }),
        ],
      },
    },
    idle: {
      on: {
        PROCESS_FILE: {
          target: 'openingFile',
          actions: [
            assign((ctx, event) => {
              ctx.filepath = event.filepath;
            }),
          ],
        },
      },
    },
    openingFile: {
      invoke: {
        src: (ctx, event) => (callback, onReceive) => {
          const data = fs.readFileSync(ctx.filepath, 'utf8');
          callback({
            type: 'LOAD_FILE',
            rawFile: data,
            filename: path.basename(ctx.filepath, path.extname(ctx.filepath)),
          });
        },
      },
      on: {
        LOAD_FILE: {
          target: 'firstPass',
          actions: [assign({ rawFile: (ctx, event) => event.rawFile, filename: (ctx, event) => event.filename })],
        },
      },
    },

    firstPass: {
      // need to do two things:
      // strip out comments and empty lines
      // populate
      always: {
        target: 'secondPass',
        actions: [
          assign((ctx) => {
            const cleanedFileArr = [];
            const symbolList = { ...ctx.symbolList };
            ctx.rawFile.split('\n').forEach((line) => {
              const trimmed = line.trim().replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g, ''); // remove all comments

              if (trimmed.substring(0, 2) === '//' || trimmed === '' || trimmed.substring(0, 3) === '/**') {
                // do nothing
                // whitespace / comments
              } else {
                cleanedFileArr.push(trimmed);
              }
            });
            return { ...ctx, cleanedFileArr, symbolList };
          }),
        ],
      },
    },
    secondPass: {
      // Assemble instructions
      always: {
        target: 'end',
        actions: [
          assign({
            encodedFile: (ctx) => {
              const tokenizer = new Tokenizer(ctx.cleanedFileArr);
              console.log('tokens', tokenizer.tokenArr);
              const assembledFileArr = [];
              const setCurrentFunction = (functionName) => (ctx.currentFunction = functionName);
              ctx.cleanedFileArr.forEach((instruction) => {
                assembledFileArr.push('// ' + instruction);

                const translated = translateVMInstruction(
                  instruction,
                  ctx.filename,
                  ctx.uniqueCount,
                  ctx.currentFunction,
                  setCurrentFunction
                );
                ctx.uniqueCount = ctx.uniqueCount + 1;
                assembledFileArr.push(translated);
              });
              let encodedFile = '';
              assembledFileArr.forEach((line) => (encodedFile += line + '\n'));
              return encodedFile;
            },
          }),
        ],
      },
    },
    end: {
      always: {
        target: 'cleanup',
        actions: [sendParent((ctx) => ({ type: 'FINISHED_PROCESSING', encodedFile: ctx.encodedFile }))],
      },
    },
    cleanup: {
      always: {
        target: 'idle',
        actions: [assign(() => initialContext)],
      },
    },
  },
});
