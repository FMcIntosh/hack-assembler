import { Machine, assign } from 'xstate';
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
            ctx.cleanedFileArr.forEach((instruction) => {
              const translated = translateInstruction(instruction, ctx.filename);

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

function translateInstruction(instruction, filename) {
  const [command, segment, i] = instruction.split(' ');
  switch (command) {
    // arithmetic
    case 'add': {
      return convert2ParamInstruction('+');
    }
    case 'sub': {
      return convert2ParamInstruction('-');
    }
    case 'neg': {
      return convert1ParamInstruction('-');
    }
    case 'and': {
      return convert2ParamInstruction('&');
    }
    case 'or': {
      return convert2ParamInstruction('|');
    }
    case 'not': {
      return convert1ParamInstruction('!');
    }
    case 'gt': {
      return convertComparisonInstruction('JGT');
    }
    case 'eq': {
      return convertComparisonInstruction('JEQ');
    }
    case 'lt': {
      return convertComparisonInstruction('JLT');
    }
    case 'push': {
      switch (segment) {
        case 'constant': {
          return `
          // D = i
          @${i}
          D = A
          // *SP = D
          @SP
          A = M
          M = D
          // SP++
          @SP
          M = M + 1`;
        }
        case 'local': {
          return convertPushInstruction('LCL', i);
        }
        case 'argument': {
          return convertPushInstruction('ARG', i);
        }
        case 'this': {
          return convertPushInstruction('THIS', i);
        }
        case 'that': {
          return convertPushInstruction('THAT', i);
        }
        case 'static': {
          return `
          // D = *(LCL + i)
          @${filename + '.' + i}
          D = A
          @${0}
          A = D + A
          D = M
          // *SP = D
          @SP
          A = M
          M = D
          // SP++
          @SP
          M = M + 1
        `;
        }
        case 'temp': {
          return `
          // D = *(LCL + i)
          @${5}
          D = A
          @${i}
          A = D + A
          D = M
          // *SP = D
          @SP
          A = M
          M = D
          // SP++
          @SP
          M = M + 1
        `;
        }
        case 'pointer': {
          return convertPointerPushInstruction(i === '0' ? 'THIS' : 'THAT');
        }
        default: {
        }
      }
      break;
    }
    case 'pop': {
      switch (segment) {
        case 'local': {
          return convertPopInstruction('LCL', i);
        }
        case 'argument': {
          return convertPopInstruction('ARG', i);
        }
        case 'this': {
          return convertPopInstruction('THIS', i);
        }
        case 'that': {
          return convertPopInstruction('THAT', i);
        }
        case 'static': {
          return `
          @${filename + '.' + i}
          D = A
          @${0}
          D = D + A
          @temp
          M = D
        
          // SP--
          @SP
          M = M - 1
          A = M
          D = M
        
          // LCL + i = SP--
          @temp
          A = M
          M = D`;
        }
        case 'temp': {
          return `
          @${5}
          D = A
          @${i}
          D = D + A
          @temp
          M = D
        
          // SP--
          @SP
          M = M - 1
          A = M
          D = M
        
          // LCL + i = SP--
          @temp
          A = M
          M = D`;
        }
        case 'pointer': {
          return convertPointerPopInstruction(i === '0' ? 'THIS' : 'THAT');
        }
        default: {
        }
      }
      break;
    }

    default: {
    }
  }
}

function convertPointerPushInstruction(thisOrThat) {
  return `
    @${thisOrThat}
    D = M
    @SP
    // *SP = D
    @SP
    A = M
    M = D
    // SP++
    @SP
    M = M + 1
  `;
}

function convertPointerPopInstruction(thisOrThat) {
  return `
  // SP--
  @SP
  M = M - 1
  A = M
  D = M
  @${thisOrThat}
  M = D
  `;
}

function convert2ParamInstruction(operator) {
  return `
  @SP
  M = M - 1
  A = M
  D = M
  @SP
  A = M - 1
  M = M ${operator} D`;
}

function convert1ParamInstruction(operator) {
  return `
  // *(SP -1) = {operator} *(SP -1)
  @SP
  A = M - 1
  M = ${operator} M`;
}

function convertComparisonInstruction(condition) {
  return `
  @SP
  M = M - 1
  A = M
  D = M
  @SP
  A = M - 1
  D = M - D
  @True
  D;${condition}
  @SP
  A = M - 1
  M = 0
  @End
  0;JMP

  (True)
  @SP
  A = M - 1
  M = -1

  (End)`;
}

function convertPushInstruction(pointer, i) {
  return `
  // D = *(LCL + i)
  @${pointer}
  A = M
  D = A
  @${i}
  A = D + A
  D = M
  // *SP = D
  @SP
  A = M
  M = D
  // SP++
  @SP
  M = M + 1
`;
}

function convertPopInstruction(pointer, i) {
  return `
  @${pointer}
  A = M
  D = A
  @${i}
  D = D + A
  @temp
  M = D

  // SP--
  @SP
  M = M - 1
  A = M
  D = M

  // LCL + i = SP--
  @temp
  A = M
  M = D`;
}

// init stack points
// @1024
// D = A
// @SP
// M = D

// // push const 17
// @17
// D = A
// @SP
// A = M
// M = D
// @SP
// M = M + 1

// // push const 10
// @10
// D = A
// @SP
// A = M
// M = D
// @SP
// M = M + 1

// // neg
// @SP
// A = M - 1
// D = - M

// // add
// @SP
// M = M - 1
// A = M
// D = M
// @SP
// M = M - 1
// A = M
// D = D + M
// @SP
// A = M
// M = D
// @SP
// M = M + 1

// // sub
// @SP
// M = M - 1
// A = M
// D = M
// @SP
// M = M - 1
// A = M
// D = M - D
// @SP
// A = M
// M = D
// @SP
// M = M + 1
