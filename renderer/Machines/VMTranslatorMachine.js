import { Machine, assign } from 'xstate';
import translateVMInstruction from './translateVMInstruction';
const fs = global.fs;
const path = global.path;

export default Machine({
  initial: 'init',
  context: {
    rawFile: '',
    cleanedFileArr: [],
    symbolList: {},
    encodedFile: '',
    filename: '',
    uniqueCount: 0,
    currentFunction: '',
  },
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
        OPEN_FILE: {
          target: 'openingFile',
        },
      },
    },
    openingFile: {
      invoke: {
        src: (context, event) => (callback, onReceive) => {
          // dialog to open file
          const filePaths = global.dialog.showOpenDialogSync({ properties: ['openFile'] });
          const data = fs.readFileSync(filePaths[0], 'utf8');
          console.log(filePaths);
          callback({
            type: 'LOAD_FILE',
            rawFile: data,
            filename: path.basename(filePaths[0], path.extname(filePaths[0])),
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
    fileOpen: {
      on: {
        ASSEMBLE: {
          target: 'firstPass',
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

              if (trimmed.substring(0, 2) === '//' || trimmed === '') {
                // do nothing
                // whitespace / comments
              } else {
                cleanedFileArr.push(trimmed);
              }
            });
            console.log(cleanedFileArr);
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
          assign((ctx) => {
            const assembledFileArr = [];
            const setCurrentFunction = (functionName) => (ctx.currentFunction = functionName);
            ctx.cleanedFileArr.forEach((instruction) => {
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
            return { ...ctx, encodedFile };
          }),
        ],
      },
    },
    end: {
      on: {
        SAVE_FILE: {
          target: 'savingFile',
        },
        OPEN_FILE: {
          target: 'openingFile',
        },
      },
    },
    savingFile: {
      invoke: {
        src: (ctx, event) => (callback, onReceive) => {
          // dialog to open file
          var savePath = global.dialog.showSaveDialogSync({
            defaultPath:
              'C:\\Users\\fraserm\\Documents\\programming\\other\\nand2…s\\projects\\07\\MemoryAccess\\BasicTest\\' +
              ctx.filename +
              '.asm',
          });
          fs.writeFile(savePath, ctx.encodedFile, function (err) {
            // file saved or err
          });

          console.log('file saved');
          callback({
            type: 'FILE_SAVED',
          });
        },
      },
      on: {
        FILE_SAVED: {
          target: 'idle',
        },
      },
    },
  },
});
