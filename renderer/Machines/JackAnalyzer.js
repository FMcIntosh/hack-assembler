import { toInvokeSource } from 'xstate/lib/utils';
import SymbolTable from './SymbolTable';

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
const OPS = ['+', '-', '*', '/', '&', '|', '<', '>', '='];
const UNARY_OPS = ['-', '~'];

const SYMBOLS = ['{', '}', '(', ')', '[', ']', ',', '.', ';', '+', '-', '*', '/', '&', '|', '<', '>', '=', '~'];

const typeToString = {
  KEYWORD: 'keyword',
  SYMBOL: 'symbol',
  STRING_CONST: 'stringConstant',
  IDENTIFIER: 'identifier',
  INT_CONST: 'integerConstant',
};

class JackAnalyzer {
  constructor(tokenArr) {
    this.tokenArr = tokenArr;
    this.tokenIndex = 0;
    this.compiled = '';
    this.currentToken = tokenArr[0];
    this.symbolTable = new SymbolTable();
    this.subroutineSymbolTable = {};
    this.className = '';
  }

  nextToken() {
    this.tokenIndex++;
    this.currentToken = this.tokenArr[this.tokenIndex];
    return this.currentToken;
  }

  currentToken() {
    return this.tokenArr[this.tokenIndex];
  }

  compileClass() {
    console.log('compileClass', this.currentToken.value, this.tokenArr);
    if (this.currentToken && this.currentToken.value === 'class') {
      this.compiled += '<class>\n';
      this.compiled += this.tokenToXML(this.currentToken);
      // Class name
      this.nextToken();
      this.compiled += this.tokenToXML(this.currentToken);
      this.className = this.currentToken.value;
      // {
      this.nextToken();
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();

      while (this.currentToken && this.currentToken.value !== '}') {
        if (['static', 'field'].some((el) => this.currentToken.value === el)) {
          // class var dec
          this.compileClassVarDec();
        } else if (['constructor', 'method', 'function'].some((el) => this.currentToken.value === el)) {
          this.compileSubroutineDec();
        }
      }
      console.log('symbol', this.symbolTable.classSymbolTable, this.symbolTable.subroutineSymbolTable);
      // }
      this.compiled += this.tokenToXML(this.currentToken);
      this.compiled += '</class>\n';
    }
    return this.compiled;
  }

  compileClassVarDec() {
    console.log('compileClassVarDec');
    //  static boolean test, another;
    this.compiled += '<classVarDec>\n';

    let kind, type;
    while (this.currentToken && this.currentToken.value !== ';') {
      this.compiled += this.tokenToXML(this.currentToken);
      if (this.currentToken.value !== ',') {
        if (!kind) {
          kind = this.currentToken.value;
        } else if (!type) {
          type = this.currentToken.value;
        } else {
          let name = this.currentToken.value;

          this.symbolTable.define({ name, kind, type });
          name = undefined;
        }
      }
      this.nextToken();
    }
    // ;
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compiled += '</classVarDec>\n';
  }

  compileSubroutineDec() {
    console.log('compileSubroutineDec', this.currentToken.value);
    this.compiled += '<subroutineDec>\n';
    this.symbolTable.startSubroutine();
    this.compiled += this.tokenToXML(this.currentToken);
    while (this.currentToken && this.currentToken.value !== '(') {
      this.nextToken();
      this.compiled += this.tokenToXML(this.currentToken);
    }
    this.nextToken();
    this.compileParameterList();
    // )
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compileSubroutineBody();
    console.log('subroutineSymbolTable', this.symbolTable.subroutineSymbolTable);
    this.compiled += '</subroutineDec>\n';
  }

  compileParameterList() {
    console.log('compileParameterList');
    this.compiled += '<parameterList>\n';
    this.symbolTable.define({ name: 'this', type: this.className, kind: 'arg' });
    let type;
    while (this.currentToken && this.currentToken.value !== ')') {
      this.compiled += this.tokenToXML(this.currentToken);
      if (this.currentToken.value !== ',') {
        if (!type) {
          type = this.currentToken.value;
        } else {
          let name = this.currentToken.value;

          this.symbolTable.define({ name, kind: 'arg', type });
          name = undefined;
        }
      }
      this.nextToken();
    }
    //
    this.compiled += '</parameterList>\n';
  }

  compileSubroutineBody() {
    console.log('compileSubroutineBody', this.currentToken.value);
    this.compiled += '<subroutineBody>\n';
    // {
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    while (this.currentToken && this.currentToken.value !== '}') {
      if (this.currentToken.value === 'var') {
        // class var dec
        this.compileVarDec();
      } else {
        this.compileStatements();
      }
    }
    // }
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compiled += '</subroutineBody>\n';
    console.log('end compileSubroutineBody', this.currentToken.value);
  }

  compileVarDec() {
    console.log('compileVarDec', this.currentToken.value);
    this.compiled += '<varDec>\n';
    let kind, type;
    while (this.currentToken && this.currentToken.value !== ';') {
      this.compiled += this.tokenToXML(this.currentToken);
      if (this.currentToken.value !== ',') {
        console.log('yo', kind, type);
        if (!kind) {
          kind = this.currentToken.value;
        } else if (!type) {
          type = this.currentToken.value;
        } else {
          let name = this.currentToken.value;

          this.symbolTable.define({ name, kind, type });
          name = undefined;
          kind = undefined;
        }
      }
      this.nextToken();
      console.log('next', this.currentToken.value);
    }
    // ;
    console.log('end', this.currentToken.value);

    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    console.log('end2', this.currentToken.value);

    this.compiled += '</varDec>\n';
  }

  compileStatements() {
    console.log('compileStatements', this.currentToken.value);
    this.compiled += '<statements>\n';
    // {
    while (this.currentToken && this.currentToken.value !== '}') {
      switch (this.currentToken.value) {
        case 'let': {
          this.compileLet();
          break;
        }
        case 'if': {
          this.compileIf();
          break;
        }
        case 'while': {
          this.compileWhile();
          break;
        }
        case 'do': {
          this.compileDo();
          break;
        }
        case 'return': {
          this.compileReturn();
          break;
        }
        default: {
        }
      }
    }
    this.compiled += '</statements>\n';
    console.log('end compileStatements', this.currentToken.value);
  }

  compileLet() {
    console.log('compileLet', this.currentToken.value);
    this.compiled += '<letStatement>\n';
    // let
    this.compiled += this.tokenToXML(this.currentToken);
    // varname
    this.nextToken();
    this.compiled += this.tokenToXML(this.currentToken);

    // check if it's an expression
    this.nextToken();
    if (this.currentToken.value === '[') {
      // [
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      this.compileExpression();
      // ]
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
    }
    // =

    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    this.compileExpression();
    // ;
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compiled += '</letStatement>\n';
    console.log('end compileLet', this.currentToken.value);
  }

  compileIf() {
    console.log('compileIf');
    this.compiled += '<ifStatement>\n';
    // if
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    // (
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // expressions
    this.compileExpression();

    // )
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // {
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compileStatements();

    // }
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    if (this.currentToken.value === 'else') {
      // else
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      // {
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      this.compileStatements();

      // }
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
    }
    console.log('end if', this.currentToken.value);
    this.compiled += '</ifStatement>\n';
  }

  compileWhile() {
    console.log('compileWhile');
    this.compiled += '<whileStatement>\n';
    // while
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // (
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // expressions
    this.compileExpression();

    // )
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // {
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compileStatements();

    // }
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compiled += '</whileStatement>\n';
    console.log('end while', this.currentToken.value);
  }

  compileDo() {
    console.log('compileDo');
    this.compiled += '<doStatement>\n';
    // do
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // varname
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    if (this.currentToken.value === '(') {
      // (
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      this.compileExpressionList();
      // )
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
    } else if (this.currentToken.value === '.') {
      // .
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      // subroutine name
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      // (
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      this.compileExpressionList();
      // )
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
    }

    // ;
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    this.compiled += '</doStatement>\n';
    console.log('end compileDo', this.currentToken.value);
  }

  compileReturn() {
    console.log('compileReturn');
    this.compiled += '<returnStatement>\n';
    // return
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();

    // expression?
    if (this.currentToken.value !== ';') {
      this.compileExpression();
    }
    // ;
    this.compiled += this.tokenToXML(this.currentToken);
    this.nextToken();
    this.compiled += '</returnStatement>\n';
    console.log('end compileDo', this.currentToken.value);
  }

  compileExpression() {
    console.log('compileExpression', this.currentToken.value);
    this.compiled += '<expression>\n';
    this.compileTerm();
    while (OPS.includes(this.currentToken.value)) {
      // op
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      console.log('current token ', this.currentToken.value, OPS.includes(this.currentToken.value));
      this.compileTerm();
    }
    console.log('end compileExpression', this.currentToken.value);
    this.compiled += '</expression>\n';
  }

  compileTerm() {
    console.log('compileTerm', this.currentToken.value);
    this.compiled += '<term>\n';
    // var, const, string etc
    if (this.currentToken.value === '(') {
      // (
      this.compiled += this.tokenToXML(this.currentToken);
      console.log('yozayoza');
      this.nextToken();
      this.compileExpression();
      // )
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
    } else if (UNARY_OPS.includes(this.currentToken.value)) {
      console.log('UNARY');
      this.compiled += this.tokenToXML(this.currentToken);
      this.nextToken();
      this.compileTerm();
    } else {
      console.log('start');
      this.compiled += this.tokenToXML(this.currentToken);
      // check if it's an expression
      this.nextToken();
      if (this.currentToken.value === '[') {
        // [
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        this.compileExpression();
        // ]
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
      } else if (this.currentToken.value === '(') {
        // (
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        this.compileExpressionList();
        // )
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
      } else if (this.currentToken.value === '.') {
        console.log('dot');
        // .
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        // subroutine name
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        // (
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        this.compileExpressionList();
        // )
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
      }
    }
    console.log('end compileTerm', this.currentToken.value);
    this.compiled += '</term>\n';
  }

  compileExpressionList() {
    console.log('compileExpressionList');
    this.compiled += '<expressionList>\n';
    if (this.currentToken.value !== ')') {
      this.compileExpression();
      while (this.currentToken.value === ',') {
        // ,
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        this.compileExpression();
      }
      console.log('end compileExpressionList', this.currentToken.value);
    }
    this.compiled += '</expressionList>\n';
  }

  hasMoreTokens() {
    return true;
  }

  tokenToXML(token) {
    const { type, value } = token;
    const xml = `  <${typeToString[type]}> ${this.sanitiseXML(value)} </${typeToString[type]}>\n`;
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
}

export default JackAnalyzer;
