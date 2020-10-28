import { createMachine } from 'xstate';
const fs = global.fs;

export default createMachine({
  id: 'App',
  initial: 'compiler',
  context: {},
  states: {
    assembler: {},
    vmTranslator: {},
    compiler: {},
  },
  on: {
    SWITCH_TAB_COMPILER: {
      target: 'compiler',
    },
    SWITCH_TAB_ASSEMBLER: {
      target: 'assembler',
    },
    SWITCH_TAB_VM_TRANSLATOR: {
      target: 'vmTranslator',
    },
  },
});
