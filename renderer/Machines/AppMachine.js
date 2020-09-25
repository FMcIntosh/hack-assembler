import { createMachine, assign } from 'xstate';
const fs = global.fs;

export default createMachine({
  id: 'App',
  initial: 'assembler',
  context: {},
  states: {
    assembler: {},
    vmTranslator: {},
  },
  on: {
    SWITCH_TAB_ASSEMBLER: {
      target: 'assembler',
    },
    SWITCH_TAB_VM_TRANSLATOR: {
      target: 'vmTranslator',
    },
  },
});
