const typeToString = {
  KEYWORD: 'keyword',
  SYMBOL: 'symbol',
  STRING_CONST: 'stringConstant',
  IDENTIFIER: 'identifier',
  INT_CONST: 'integerConstant',
};

class SymbolTable {
  constructor() {
    this.classSymbolTable = {};
    this.subroutineSymbolTable = {};
  }

  startSubroutine() {
    this.subroutineSymbolTable = {};
  }

  define({ name, type, kind }) {
    const index = this.varCount(kind);
    console.log('DEFINE', kind);
    if (kind === 'static' || kind === 'field') {
      this.classSymbolTable[name] = { name, type, kind, index };
    } else {
      this.subroutineSymbolTable[name] = { name, type, kind, index };
    }
  }

  varCount(kind) {
    let count = 0;
    if (kind === 'static' || kind === 'field') {
      count = Object.values(this.classSymbolTable).filter((symbol) => symbol.kind === kind).length;
    } else {
      count = Object.values(this.subroutineSymbolTable).filter((symbol) => symbol.kind === kind).length;
    }

    return count;
  }

  get(name) {
    return this.subroutineSymbolTable[name] || this.classSymbolTable[name] || undefined;
  }
}

export default SymbolTable;
