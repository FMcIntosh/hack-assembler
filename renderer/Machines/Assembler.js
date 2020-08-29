import { Machine, assign } from 'xstate';
const fs = global.fs;

const encodeAInstruction = (address) => {
  // convert to binary and pad with 0's
  return address.toString(2).padStart(16, '0');
};

const encodeCInstruction = (instruction) => {
  // split string into comp dest jump
  let [dest, rest] = instruction.split('=');
  let [comp, jump] = (rest || dest).split(';');

  // comp
  let encodedComp;
  let aOrMBit = '0';
  if (comp.includes('M')) {
    aOrMBit = '1';
  }
  comp = comp.replace('M', 'A');

  encodedComp = compEncoder[comp];

  // dest
  let encodedDest;
  if (!instruction.includes('=')) {
    encodedDest = '000';
  } else {
    encodedDest = destEncoder[dest];
  }

  // jump
  let encodedJump;
  if (!instruction.includes(';')) {
    encodedJump = '000';
  } else {
    encodedJump = jumpEncoder[jump];
  }
  return '111' + aOrMBit + encodedComp + encodedDest + encodedJump;
};
const compEncoder = {
  0: '101010',
  1: '111111',
  '-1': '111010',
  D: '001100',
  A: '110000',
  '!D': '001101',
  '!A': '110001',
  '-D': '001111',
  '-A': '110011',
  'D+1': '011111',
  'A+1': '110111',
  'D-1': '001110',
  'A-1': '110010',
  'D+A': '000010',
  'D-A': '010011',
  'A-D': '000111',
  'D&A': '000000',
  'D|A': '010101',
};

const destEncoder = {
  M: '001',
  D: '010',
  MD: '011',
  A: '100',
  AM: '101',
  AD: '110',
  AMD: '111',
};

const jumpEncoder = {
  JGT: '001',
  JEQ: '010',
  JGE: '011',
  JLT: '100',
  JNE: '101',
  JLE: '110',
  JMP: '111',
};

export default Machine({
  initial: 'init',
  context: {
    rawFile: '',
    cleanedFileArr: [],
    symbolList: {},
    encodedFile: '',
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
          callback({ type: 'LOAD_FILE', rawFile: data });
        },
      },
      on: {
        LOAD_FILE: {
          target: 'firstPass',
          actions: [assign({ rawFile: (ctx, event) => event.rawFile })],
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
            let instructionCount = 0;
            ctx.rawFile.split('\n').forEach((line) => {
              const trimmed = line
                .trim()
                .replace(/ /g, '') // remvoe all whitespace
                .replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g, ''); // remove all comments

              if (trimmed.substring(0, 2) === '//' || trimmed === '') {
                // do nothing
                // whitespace / comments
              } else if (trimmed.substring(0, 1) === '(') {
                // symbol
                // (symbol) - this regex gets the string 'symbol
                const symbol = line.match(/\(([^)]+)\)/)[1];
                symbolList[symbol] = instructionCount;
              } else {
                cleanedFileArr.push(trimmed);
                instructionCount++;
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
          assign((ctx) => {
            const assembledFileArr = [];
            let num = 16;
            ctx.cleanedFileArr.forEach((instruction) => {
              let lineEncoded;
              // check if it's an A or C instruction
              if (instruction[0] === '@') {
                // A instruction
                let address = instruction.substring(1);
                if (isNaN(address)) {
                  // symbol
                  if (ctx.symbolList[address]) {
                    // we have already seen the symbol
                    address = ctx.symbolList[address];
                  } else {
                    // new symbol, give it a number
                    address = num;
                    num++;
                  }
                }
                lineEncoded = encodeAInstruction(parseInt(address));
              } else {
                lineEncoded = encodeCInstruction(instruction);
              }
              assembledFileArr.push(lineEncoded);
            });
            let encodedFile = '';
            assembledFileArr.forEach((line) => (encodedFile += line + '\n'));
            return { ...ctx, encodedFile };
          }),
        ],
      },
    },
    end: {},
  },
});
