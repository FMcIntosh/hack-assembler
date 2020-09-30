export default function translateVMInstruction(instruction, filename, uniqueId, currentFunction, setCurrentFunction) {
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
      return convertComparisonInstruction('JGT', filename, uniqueId);
    }
    case 'eq': {
      return convertComparisonInstruction('JEQ', filename, uniqueId);
    }
    case 'lt': {
      return convertComparisonInstruction('JLT', filename, uniqueId);
    }
    case 'push': {
      switch (segment) {
        case 'constant': {
          return convertPushConstant(i);
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
    case 'label': {
      return `(${filename}.${currentFunction}.${segment})`;
    }
    case 'goto': {
      return `
      @${filename}.${currentFunction}.${segment}
      0;JMP
      `;
    }
    case 'if-goto': {
      return `
      M = M - 1
      A = M
      D = M
      @${filename}.${currentFunction}.${segment}
      D;JNE
    `;
    }
    case 'function': {
      setCurrentFunction(segment);
      const functionAddress = `${filename}.${segment}`;
      let pushNVars = '';
      for (let count = 0; count < i; count++) {
        pushNVars += convertPushConstant(0);
      }
      return `
      (${functionAddress})
      ${pushNVars}
      `;
    }
    case 'call': {
      const returnAddress = `${filename}.${segment}$ret.${uniqueId}`;
      const functionAddress = `${filename}.${segment}`;
      // save return address (create label)
      return `
      ${convertPushConstant(returnAddress)}
      ${convertPushPointer('LCL')}
      ${convertPushPointer('ARG')}
      ${convertPushPointer('THIS')}
      ${convertPushPointer('THAT')}
      // ARG = SP - 5 - nArgs
      @SP
      D = M
      @5
      D = D - A
      @${i}
      D = D - A
      @ARG
      M = D
      // LCL = SP
      @SP
      D = M
      @LCL
      M = D
      @${functionAddress}
      0;JMP
      (${returnAddress})
      `;
      //
    }
    case 'return': {
      return `
      @LCL
      D = M
      @endframe.temp.var
      M = D
      @5
      A = D - A
      D = M
      @retAddr.temp.var
      M = D
      ${convertPopInstruction('ARG', 0)}
      @ARG
      D = M + 1
      @SP
      M = D
      ${restorePointerFromEndframe('THAT', 1)}
      ${restorePointerFromEndframe('THIS', 2)}
      ${restorePointerFromEndframe('ARG', 3)}
      ${restorePointerFromEndframe('LCL', 4)}
      @retAddr.temp.var
      A = M
      0;JMP
      `;
    }

    default: {
    }
  }
}

function restorePointerFromEndframe(pointer, offset) {
  return `@endframe.temp.var
  D = M
  @${offset}
  A = D - A
  D = M
  @${pointer}
  M = D`;
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

function convertPushConstant(value) {
  return `
  // D = i
  @${value}
  D = A
  // *SP = D
  @SP
  A = M
  M = D
  // SP++
  @SP
  M = M + 1`;
}

function convertPushPointer(pointer) {
  return `
   // D = i
   @${pointer}
   D = M
   // *SP = D
   @SP
   A = M
   M = D
   // SP++
   @SP
   M = M + 1`;
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

function convertComparisonInstruction(condition, filename, uniqueId) {
  return `
  @SP
  M = M - 1
  A = M
  D = M
  @SP
  A = M - 1
  D = M - D
  @${filename}.True.${uniqueId}
  D;${condition}
  @SP
  A = M - 1
  M = 0
  @${filename}.End.${uniqueId}
  0;JMP

  (${filename}.True.${uniqueId})
  @SP
  A = M - 1
  M = -1

  (${filename}.End.${uniqueId})`;
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
