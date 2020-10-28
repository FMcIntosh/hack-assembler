/* eslint-disable react/react-in-jsx-scope */
import { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import AppMachine from '../Machines/AppMachine';
import Assembler from '../tabs/Assembler';
import Compiler from '../tabs/Compiler';
import VMTranslator from '../tabs/VMTranslator';
import { inspect } from '@xstate/inspect';

// inspect({
//   url: 'https://statecharts.io/inspect',
//   iframe: false,
// });

const Home = () => {
  const [state, send] = useMachine(AppMachine, { devTools: true });
  console.log(state);
  return (
    <div>
      <button
        onClick={() => send('SWITCH_TAB_COMPILER')}
        style={{ background: state.matches('compiler') && '#0000ff55' }}
      >
        Compiler
      </button>
      <button
        onClick={() => {
          send('SWITCH_TAB_VM_TRANSLATOR');
          console.log('SWITCH_TAB_VM_TRANSLATOR');
        }}
        style={{ background: state.matches('vmTranslator') && '#0000ff55' }}
      >
        VM Translator
      </button>
      <button
        onClick={() => send('SWITCH_TAB_ASSEMBLER')}
        style={{ background: state.matches('assembler') && '#0000ff55' }}
      >
        Assembler
      </button>

      {state.matches('compiler') && <Compiler />}
      {state.matches('assembler') && <Assembler />}
      {state.matches('vmTranslator') && <VMTranslator />}
      <style jsx>{`
        h1 {
          color: red;
          font-size: 50px;
        }

        .text-content-container {
          display: flex;
        }
      `}</style>
    </div>
  );
};

export default Home;
