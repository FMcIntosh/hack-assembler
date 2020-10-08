import { Machine, assign, send } from 'xstate';
import { translateVMInstruction, bootstrap } from './translateVMInstruction';
import VMFileMachine from './VMFileMachine';
const fs = global.fs;
const path = global.path;

export default Machine({
  id: 'VMTranslator',
  initial: 'init',
  context: {
    rawFile: '',
    cleanedFileArr: [],
    symbolList: {},
    encodedFile: '',
    processedFilename: '',
    queue: [],
    isDir: false,
  },
  invoke: {
    id: 'fileTranslator',
    src: VMFileMachine,
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
          target: 'openingFiles',
        },
      },
    },
    openingFiles: {
      invoke: {
        src: (ctx, event) => (callback, onReceive) => {
          // dialog to open file
          const filePaths = global.dialog
            .showOpenDialogSync({ properties: ['openFile', 'multiSelections'] })
            .filter((path) => path.endsWith('.vm'));
          console.log(ctx.encodedFile);
          if (filePaths.length > 0) {
            callback({
              type: 'LOAD_FILE_PATHS',
              filePaths,
              processedFilename: path.dirname(filePaths[0]),
            });
          } else {
            callback({
              type: 'NO_FILES',
            });
          }
        },
      },
      on: {
        LOAD_FILE_PATHS: {
          target: 'processingFiles',
          actions: [
            assign({
              queue: (ctx, event) => event.filePaths,
              processedFilename: (ctx, event) => event.processedFilename,
              isDir: (ctx, event) => event.filePaths.length > 1,
            }),
          ],
        },
        NO_FILES: {
          target: 'idle',
        },
      },
    },
    processingFiles: {
      initial: 'bootstrap',
      states: {
        bootstrap: {
          always: [
            {
              // If its a directory add the bootstrap code
              target: 'ready',
              actions: [assign({ encodedFile: bootstrap() })],
              cond: (ctx) => ctx.isDir,
            },
            { target: 'ready' },
          ],
        },
        ready: {
          entry: [(ctx) => console.log('ready', ctx.queue[0])],
          always: [
            {
              target: 'waiting',
              cond: queueNotEmpty,
              actions: [send((ctx) => ({ type: 'PROCESS_FILE', filepath: ctx.queue[0] }), { to: 'fileTranslator' })],
            },
            { target: '#VMTranslator.finishedProcessing' },
          ],
        },
        waiting: {
          on: {
            FINISHED_PROCESSING: {
              target: 'end',
              actions: [
                (ctx, event) => console.log('file', event.encodedFile),
                assign((ctx, event) => (ctx.encodedFile += event.encodedFile)),
              ],
            },
          },
        },
        end: {
          always: {
            target: 'ready',
            actions: [assign({ queue: (ctx) => ctx.queue.slice(1) })],
          },
        },
      },
    },
    finishedProcessing: {
      on: {
        SAVE_FILE: {
          target: 'savingFile',
        },
        OPEN_FILE: {
          target: 'openingFiles',
          actions: [assign({ encodedFile: '' })],
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
              ctx.processedFilename +
              '.asm',
          });
          fs.writeFile(savePath, ctx.encodedFile, function (err) {
            // file saved or err
          });

          callback({
            type: 'FILE_SAVED',
          });
        },
      },
      on: {
        FILE_SAVED: {
          target: 'idle',
          actions: [assign({ encodedFile: '' })],
        },
      },
    },
  },
});

function queueNotEmpty(ctx) {
  return ctx.queue.length > 0;
}
