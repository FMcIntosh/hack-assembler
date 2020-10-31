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

const typeToString = {
  KEYWORD: 'keyword',
  SYMBOL: 'symbol',
  STRING_CONST: 'stringConstant',
  IDENTIFIER: 'identifier',
  INT_CONST: 'integerConstant',
};

class Tokenizer {
  constructor(fileArr) {
    this.fileArr = fileArr;
    this.tokenArr = this.constructTokenArr(fileArr);
    this.currentToken = undefined;
  }

  constructTokenArr(fileArr) {
    const tokenArr = [];
    fileArr.forEach((line) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === ' ') {
          continue;
        }

        let skip = false;

        KEYWORDS.forEach((keyword) => {
          if (line.slice(i, i + keyword.length) === keyword) {
            if (
              i + keyword.length === line.length ||
              line[i + keyword.length] === ' ' ||
              SYMBOLS.includes(line[i + keyword.length])
            ) {
              tokenArr.push({ type: 'KEYWORD', value: keyword });
              i += keyword.length - 1;
              skip = true;
            }
          }
        });
        if (skip) {
          continue;
        }

        SYMBOLS.forEach((symbol) => {
          if (line.slice(i, i + symbol.length) === symbol) {
            tokenArr.push({ type: 'SYMBOL', value: symbol });
            i += symbol.length - 1;
            skip = true;
          }
        });
        if (skip) {
          continue;
        }

        if (line[i] === '"') {
          const s = line.match(/"([^"]+)"/)[1];
          tokenArr.push({ type: 'STRING_CONST', value: s });
          i += s.length + 1;
          skip = true;
        }
        if (skip) {
          continue;
        }

        let startI = i;
        while (!SYMBOLS.includes(line[i]) && line[i] !== ' ' && i < line.length) {
          i++;
        }

        const value = line.slice(startI, i);
        if (isNaN(value[0])) {
          tokenArr.push({ type: 'IDENTIFIER', value });
        } else {
          tokenArr.push({ type: 'INT_CONST', value });
        }
        i--;
      }
    });
    return tokenArr;
  }

  getXML() {
    let xml = '<tokens>\n';
    this.tokenArr.forEach((token) => {
      const { value, type } = token;
      xml += `  <${typeToString[type]}> ${this.sanitiseXML(value)} </${typeToString[type]}>\n`;
    });
    xml += '</tokens>';
    return xml;
  }

  sanitiseXML(value) {
    if (value === '<') {
      return '&lt;';
    }

    if (value === '>') {
      return '&gt;';
    }
    if (value === '"') {
      return '&quot;';
    }

    if (value === '&') {
      return '&amp;';
    }

    return value;
  }

  hasMoreTokens() {
    return true;
  }
}

export default Tokenizer;
