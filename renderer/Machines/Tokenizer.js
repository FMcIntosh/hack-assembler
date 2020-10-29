const KEYWORDS = [
  'class',
  'constructor',
  'function',
  'method',
  'field',
  'static',
  'var',
  'int',
  'char',
  'boolean',
  'void',
  'true',
  'false',
  'null',
  'this',
  'let',
  'do',
  'if',
  'else',
  'while',
  'return',
];

const SYMBOLS = ['{', '}', '(', ')', '[', ']', ',', '.', ';', '+', '-', '*', '/', '&', '|', '<', '>', '=', '~'];

class Tokenizer {
  constructor(fileArr) {
    this.fileArr = fileArr;
    this.tokenArr = this.constructTokenArr(['method int getx() {', 'let y = "stringyo";', 'return x + y;']);
    this.currentToken = undefined;
  }

  constructTokenArr(fileArr) {
    console.log(fileArr);
    const tokenArr = [];
    fileArr.forEach((line) => {
      for (let i = 0; i < line.length; i++) {
        KEYWORDS.forEach((keyword) => {
          if (line.slice(i, i + keyword.length) === keyword) {
            tokenArr.push({ type: 'KEYWORD', value: keyword });
            i += keyword.length - 1;
          }
        });

        SYMBOLS.forEach((symbol) => {
          if (line.slice(i, i + symbol.length) === symbol) {
            tokenArr.push({ type: 'SYMBOL', value: symbol });
            i += symbol.length - 1;
          }
        });

        if (line.slice(i, i + 1) === '"') {
          const s = line.match(/"([^"]+)"/)[1];
          tokenArr.push({ type: 'STRING_CONST', value: s });
          i += s.length - 1;
        }

        // let remainingChunks = line.slice(i).split(' ');
        // remainingChunks.forEach(chunk => {
        //   if (chunk.length > 0) {
        //     if (isNaN(chunk)) {

        //     }
        //   }
        // })
      }
    });
    return tokenArr;
  }

  hasMoreTokens() {
    return true;
  }
}

export default Tokenizer;
