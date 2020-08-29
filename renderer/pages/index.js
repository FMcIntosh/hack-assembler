/* eslint-disable react/react-in-jsx-scope */
import { useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import Assembler from '../Machines/Assembler';

const Home = () => {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState(null);
  const [state, send] = useMachine(Assembler);
  const { rawFile, encodedFile } = state.context;

  useEffect(() => {
    console.log('yoza');
    const handleMessage = (event, message) => setMessage(message);
    global.ipcRenderer.on('message', handleMessage);

    return () => {
      global.ipcRenderer.removeListener('message', handleMessage);
    };
  }, []);

  return (
    <div>
      <button onClick={() => send('OPEN_FILE')}>Open File</button>
      <button onClick={() => send('ASSEMBE')}>Assemble File</button>
      <div className='text-content-container'>
        <pre>{rawFile}</pre>
        <pre>{encodedFile}</pre>
      </div>

      <style jsx>{`
        h1 {
          color: red;
          font-size: 50px;
        }
        pre {
          width: 40%;
          height: 500px;
          overflow: auto;
          border: 1px solid black;
        }
        .text-content-container {
          display: flex;
        }
      `}</style>
    </div>
  );
};

export default Home;
