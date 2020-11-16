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
const UNARY_OPS_TO_VM = { '-': 'neg', '~': 'not' };

const SYMBOLS = ['{', '}', '(', ')', '[', ']', ',', '.', ';', '+', '-', '*', '/', '&', '|', '<', '>', '=', '~'];

const OPS_TO_VM = {
  '+': 'add',
  '-': 'sub',
  '*': 'call Math.multiply 2',
  '/': 'call Math.divide 2',
  '&': 'and',
  '|': 'or',
  '<': 'lt',
  '>': 'gt',
  '=': 'eq',
};
const typeToString = {
  KEYWORD: 'keyword',
  SYMBOL: 'symbol',
  STRING_CONST: 'stringConstant',
  IDENTIFIER: 'identifier',
  INT_CONST: 'integerConstant',
};

class JackAnalyzer {
  constructor(tokenArr, fileName) {
    this.tokenArr = tokenArr;
    this.tokenIndex = 0;
    this.compiled = '';
    this.currentToken = tokenArr[0];
    this.symbolTable = new SymbolTable();
    this.subroutineSymbolTable = {};
    this.className = '';
    this.codeStream = '';
    this.fileName = fileName;
  }

  nextToken() {
    this.tokenIndex++;
    this.currentToken = this.tokenArr[this.tokenIndex];
    return this.currentToken;
  }

  currentToken() {
    return this.tokenArr[this.tokenIndex];
  }

  peek() {
    if (this.tokenIndex < this.tokenArr.length - 1) {
      return this.tokenArr[this.tokenIndex + 1];
    }
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
      let fieldCount = 0;
      while (this.currentToken && this.currentToken.value !== '}') {
        if (['static', 'field'].some((el) => this.currentToken.value === el)) {
          // class var dec
          fieldCount += this.compileClassVarDec();
        } else if (['constructor', 'method', 'function'].some((el) => this.currentToken.value === el)) {
          this.compileSubroutineDec(fieldCount);
        }
      }
      console.log('symbol', this.symbolTable.classSymbolTable, this.symbolTable.subroutineSymbolTable);
      // }
      this.compiled += this.tokenToXML(this.currentToken);
      this.compiled += '</class>\n';
    }

    return this.codeStream;
  }

  compileClassVarDec() {
    console.log('compileClassVarDec');
    //  static boolean test, another;
    this.compiled += '<classVarDec>\n';
    let fieldCount = 0;
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
          if (kind === 'field') {
            fieldCount++;
          }
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
    return fieldCount;
  }

  compileSubroutineDec(fieldCount) {
    // function / method / constructor
    console.log('compileSubroutineDec', this.currentToken.value);
    const subroutineType = this.currentToken.value;

    if (subroutineType === 'method') {
      this.symbolTable.define({ name: 'this', type: this.className, kind: 'argument' });
    }
    this.symbolTable.startSubroutine();
    // return type
    this.nextToken();
    const returnType = this.currentToken.value;

    // name
    this.nextToken();
    const name = this.currentToken.value;
    this.codeStream += 'function ' + this.fileName + '.' + name + ' ';

    // (
    this.nextToken();
    // start param list
    this.nextToken();
    this.compileParameterList();
    // )
    this.nextToken();

    this.compileSubroutineBody(subroutineType, fieldCount);
    console.log('RETURN TYPE', returnType, name);
    if (returnType === 'void') {
      console.log('RETURN', name);
      this.codeStream += 'push constant 0\n';
      console.log(this.codeStream);
    }
    this.codeStream += 'return\n';
    console.log('subroutineSymbolTable', this.symbolTable.subroutineSymbolTable);
  }

  compileParameterList() {
    console.log('compileParameterList', this.currentToken.value);
    let type;
    while (this.currentToken && this.currentToken.value !== ')') {
      if (this.currentToken.value !== ',') {
        console.log('PARAM LIST', this.currentToken.value);
        if (!type) {
          type = this.currentToken.value;
        } else {
          let name = this.currentToken.value;

          this.symbolTable.define({ name, kind: 'argument', type });
          console.log('SYMBOL DEFINE', this.symbolTable.subroutineSymbolTable);
          name = undefined;
          type = undefined;
        }
      }
      this.nextToken();
    }
  }

  compileSubroutineBody(subroutineType, fieldCount) {
    console.log('compileSubroutineBody', this.currentToken.value);
    // {
    console.log('jaja');
    this.nextToken();
    console.log('hey');
    let varDecCount = 0;
    while (this.currentToken && this.currentToken.value !== '}') {
      if (this.currentToken.value === 'var') {
        // class var dec
        varDecCount += this.compileVarDec();
      } else {
        this.codeStream += varDecCount + '\n';
        if (subroutineType === 'constructor') {
          this.writeConstructorSetup(fieldCount);
        }

        if (subroutineType === 'method') {
          this.writeMethodSetup();
        }

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
    let count = 0;
    console.log('compileVarDec', this.currentToken.value);
    let kind, type;
    while (this.currentToken && this.currentToken.value !== ';') {
      if (this.currentToken.value !== ',') {
        console.log('yo', kind, type);
        if (!kind) {
          kind = this.currentToken.value;
        } else if (!type) {
          type = this.currentToken.value;
        } else {
          let name = this.currentToken.value;
          count++;
          this.symbolTable.define({ name, kind: 'local', type });
          name = undefined;
        }
      }
      this.nextToken();
      console.log('COUNT', count);
      console.log('next', this.currentToken.value);
    }
    // ;
    console.log('end', this.currentToken.value);

    this.nextToken();
    console.log('end2', this.currentToken.value);
    return count;
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
    // let
    // varname
    this.nextToken();
    const varName = this.currentToken.value;

    // check if it's an expression
    this.nextToken();
    if (this.currentToken.value === '[') {
      // [
      this.nextToken();
      this.compileExpression();
      // ]
      this.nextToken();
    }
    // =
    this.nextToken();

    this.compileExpression();
    // ;
    this.nextToken();
    this.writePopVar(varName);

    console.log('end compileLet', this.currentToken.value);
  }

  compileIf() {
    console.log('compileIf');
    const statementOneId = 'L1-' + global.uuid();
    const statementTwoId = 'L2-' + global.uuid();
    // if
    this.nextToken();
    // (
    this.nextToken();

    // expressions
    this.compileExpression();

    // )
    this.nextToken();

    // {
    this.nextToken();
    this.codeStream += 'not\n';
    this.writeIfGoto(statementOneId);
    this.compileStatements();
    this.writeGoto(statementTwoId);

    // }
    this.nextToken();

    this.writeLabel(statementOneId);
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
    this.writeLabel(statementTwoId);

    console.log('end if', this.currentToken.value);
    this.compiled += '</ifStatement>\n';
  }

  compileWhile() {
    console.log('compileWhile');
    const statementOneId = 'WHILE_EXP-' + global.uuid();
    const statementTwoId = 'WHILE_END-' + global.uuid();
    this.writeLabel(statementOneId);
    // while
    this.nextToken();

    // (
    this.nextToken();

    // expressions
    this.compileExpression();

    // )
    this.nextToken();

    // {
    this.nextToken();
    this.codeStream += 'not\n';
    this.writeIfGoto(statementTwoId);
    this.compileStatements();
    this.writeGoto(statementOneId);

    // }
    this.nextToken();
    this.writeLabel(statementTwoId);
    console.log('end while', this.currentToken.value);
  }

  compileDo() {
    console.log('compileDo');
    // do

    // varname
    this.nextToken();
    let functionName = this.currentToken.value;

    // ( or .
    this.nextToken();

    if (this.currentToken.value === '(') {
      // (
      this.nextToken();
      // must be method call ??
      this.writePushPointer(0);
      console.log('DO METHOD');
      const expressionCount = this.compileExpressionList();
      this.writeCall(this.className + '.' + functionName, expressionCount + 1);

      // )
      this.nextToken();
    } else if (this.currentToken.value === '.') {
      // .

      // subroutine name
      this.nextToken();
      console.log('COMPILE DO ', this.currentToken.value);

      let expressionCount = 0;
      // subroutine name
      let funcPrefx = functionName;
      if (!KEYWORDS.includes(funcPrefx) && this.symbolTable.get(funcPrefx)) {
        // must be an object
        // push the variable to make the object a parameter
        this.writePushVar(funcPrefx);
        const symbol = this.symbolTable.get(funcPrefx);

        // use the objects class as the prefix
        funcPrefx = symbol.type;

        // passes the object in implicitly
        expressionCount++;
      }

      const funcName = funcPrefx + '.' + this.currentToken.value;

      this.nextToken();
      // (
      this.nextToken();
      expressionCount += this.compileExpressionList();
      this.writeCall(funcName, expressionCount);
      // )
      this.nextToken();
    }

    // ;
    this.nextToken();

    this.codeStream += 'pop temp 0\n';
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
      let opToken = this.currentToken;
      this.nextToken();
      console.log('current token ', this.currentToken.value, OPS.includes(this.currentToken.value));
      this.compileTerm();
      this.compileOp(opToken);
    }
    console.log('end compileExpression', this.currentToken.value);
    this.compiled += '</expression>\n';
  }

  compileTerm() {
    console.log('compileTerm', this.currentToken.value);
    const prevToken = this.currentToken;
    // var, const, string etc
    if (this.currentToken.value === '(') {
      // (
      this.nextToken();
      this.compileExpression();
      // )
      this.nextToken();
    } else if (UNARY_OPS.includes(this.currentToken.value)) {
      this.nextToken();
      this.compileTerm();
      this.compileOp(prevToken, true);
    } else {
      const nextToken = this.peek();

      // check if it's an expression

      if (nextToken.value === '[') {
        this.nextToken();
        // [
        this.nextToken();
        this.compileExpression();
        // ]
        this.nextToken();
      } else if (nextToken.value === '(') {
        this.nextToken();
        // (
        this.nextToken();
        const expressionCount = this.compileExpressionList();
        this.writeCall(prevToken.value, expressionCount);
        // )
        this.nextToken();
      } else if (nextToken.value === '.') {
        this.nextToken();
        console.log('dot');
        // .
        this.nextToken();
        // subroutine name
        let expressionCount = 0;
        // subroutine name
        let funcPrefx = prevToken.value;
        if (!KEYWORDS.includes(funcPrefx) && this.symbolTable.get(funcPrefx)) {
          // must be an object
          // push the variable to make the object a parameter
          this.writePushVar(funcPrefx);
          const symbol = this.symbolTable.get(funcPrefx);

          // use the objects class as the prefix
          funcPrefx = symbol.type;

          // passes the object in implicitly
          expressionCount++;
        }

        const funcName = funcPrefx + '.' + this.currentToken.value;
        // (
        this.nextToken();
        // expression
        this.nextToken();
        expressionCount += this.compileExpressionList();
        this.writeCall(funcName, expressionCount);
        // )
        this.nextToken();
      } else {
        console.log('current token type', this.currentToken.type);
        if (this.currentToken.type === 'INT_CONST') {
          this.writePushConst(this.currentToken.value);
        }

        if (this.currentToken.type === 'KEYWORD') {
          this.writePushKeyword(this.currentToken.value);
        }
        console.log('WHOAH', this.currentToken);
        if (this.currentToken.type === 'IDENTIFIER') {
          this.writePushVar(this.currentToken.value);
        }
        this.nextToken();
      }
    }
    console.log('end compileTerm', this.currentToken.value);
  }

  compileOp(token, unary = false) {
    this.codeStream += unary ? UNARY_OPS_TO_VM[token.value] : OPS_TO_VM[token.value];
    this.codeStream += '\n';
  }

  writeFunction(name, args) {
    this.codeStream += 'call ' + name + ' ' + args + '\n';
  }

  writePushConst(val) {
    this.codeStream += 'push constant ' + val + '\n';
  }

  writePopPointer(thisOrThat) {
    this.codeStream += 'pop pointer ' + thisOrThat + '\n';
  }

  writePushPointer(thisOrThat) {
    this.codeStream += 'push pointer ' + thisOrThat + '\n';
  }

  writeConstructorSetup(fieldCount) {
    this.writePushConst(fieldCount);
    this.writeCall('Memory.alloc', 1);
    this.writePopPointer(0);
  }

  writeMethodSetup() {
    console.log('WRITE METHOD SETUP');
    this.codeStream += 'push argument 0\n';
    this.codeStream += 'pop pointer 0\n';
  }

  kindToSegment(kind) {
    if (kind === 'field') {
      return 'this';
    }

    return kind;
  }

  writePushVar(varName) {
    console.log('writePushVar', varName);
    const symbolObj = this.symbolTable.get(varName);
    this.codeStream += 'push ' + this.kindToSegment(symbolObj.kind) + ' ' + symbolObj.index + '\n';
  }

  writePopVar(varName) {
    const symbolObj = this.symbolTable.get(varName);
    this.codeStream += 'pop ' + this.kindToSegment(symbolObj.kind) + ' ' + symbolObj.index + '\n';
  }

  writePushKeyword(keyword) {
    if (keyword === 'true') {
      this.writePushConst(0);
      this.codeStream += 'not\n';
    } else if (keyword === 'false' || keyword === 'null') {
      this.writePushConst(0);
    }
    if (keyword === 'this') {
      this.writePushPointer(0);
    }
  }

  writeCall(functionName, expressionCount) {
    this.codeStream += 'call ' + functionName + ' ' + expressionCount + '\n';
  }

  writeLabel(label) {
    this.codeStream += 'label ' + label + '\n';
  }

  writeIfGoto(label) {
    this.codeStream += 'if-goto ' + label + '\n';
  }

  writeGoto(label) {
    this.codeStream += 'goto ' + label + '\n';
  }

  compileExpressionList() {
    console.log('compileExpressionList');
    this.compiled += '<expressionList>\n';
    let expressionCount = 0;
    if (this.currentToken.value !== ')') {
      this.compileExpression();
      expressionCount++;
      while (this.currentToken.value === ',') {
        // ,
        this.compiled += this.tokenToXML(this.currentToken);
        this.nextToken();
        this.compileExpression();
        expressionCount++;
      }
      console.log('end compileExpressionList', this.currentToken.value);
    }
    this.compiled += '</expressionList>\n';
    return expressionCount;
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
