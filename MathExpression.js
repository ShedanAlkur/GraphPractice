const SPLIT_TO_TOKENS_PATTERN =
    /\d+(?:[.]\d+)?|,|\+|-|\*|\/|\^|>=|>|<=|<|==|!=|&&|\|\||!|\(|\)|[A-Za-z1-9_]+/g;

const BINARY_OPERATORS = ['+', '-', '*', '/', '^'];
const FUNCTIONS = ['sin', 'cos', 'tan', 'floor', 'ceil',
    'round', 'trunc', 'max', 'min', 'minus', 'sqrt', 'abs',
    'sign', 'log', 'log10', 'log2'];
const CONSTANTS = ['pi', 'e'];

const PRIORITIES = {
    '+': 5,
    '-': 5,
    '*': 6,
    '/': 6,
    '^': 7,
    ')': 9,
    '(': 10,
}
const FUNCTIONS_PRIORITY = 8;

const RIGHTASSOCIATIVE_OPERATORS = ['^'];

(function () {
    for (let func in FUNCTIONS) {
        PRIORITIES[FUNCTIONS[func]] = FUNCTIONS_PRIORITY;
    }
})();

const DICT_TOKEN_TO_JS = {
    'sin': 'Math.sin',
    'cos': 'Math.cos',
    'tan': 'Math.tan',
    'floor': 'Math.floor',
    'ceil': 'Math.ceil',
    'round': 'Math.round',
    'trunc': 'Math.trunc',
    'sqrt': 'Math.sqrt',
    'max': 'Math.max',
    'min': 'Math.min',
    'abs': 'Math.abs',
    'sign': 'Math.sign',
    'log': 'Math.log',
    'log10': 'Math.log10',
    'log2': 'Math.log2',

    'pi': 'Math.PI',
    'e': 'Math.E',
}

function _isOperator(token) {
    return token in PRIORITIES;
}

function _isRightAssociativeOperator(token) {
    return RIGHTASSOCIATIVE_OPERATORS.includes(token);
}

function _isBinaryOperator(token) {
    return BINARY_OPERATORS.includes(token);
}

function _isFunction(token) {
    return FUNCTIONS.includes(token);
}

function _isConstant(token) {
    return CONSTANTS.includes(token);
}

function _isBiggerPriority(op1, op2) {
    if (_isRightAssociativeOperator(op1) && _isRightAssociativeOperator(op2))
        return PRIORITIES[op1] >= PRIORITIES[op2]; // todo: исправить откровенный костыль!
    else return PRIORITIES[op1] > PRIORITIES[op2];
}

function Expression(stringExpression, varBeginStr, varEndStr) {
    this.row = stringExpression;
    this.varBeginStr = varBeginStr ? varBeginStr : '';
    this.varEndStr = varEndStr ? varEndStr : '';
    this.tokens = [...stringExpression.matchAll(SPLIT_TO_TOKENS_PATTERN)].map(x => x[0]);
    this.variables = new Set();
    for (let t in this.tokens) {
        if (isNaN(this.tokens[t])
            && !(this.tokens[t] in PRIORITIES)
            && !(this.tokens[t] in CONSTANTS))
            this.variables.add(this.tokens[t]);
    }

    // console.debug('tokens', this.tokens);
    // console.debug('variables', this.variables);

    this.node = new MathNode(null, this.tokens);
    this.string = null;
    this.mathjax = null;
    this.js = null;
}

Expression.prototype.getString = function () {
    if (!this.string) this.string = this.node.toString();
    return this.string;
};

Expression.prototype.getMathjax = function () {
    if (!this.mathjax) this.mathjax = this.node.toMathjax();
    return this.mathjax;
};

Expression.prototype.getJS = function () {
    // console.log('Expression vars_container', vars_container)
    if (!this.js) this.js = this.node.toJS(this.varBeginStr, this.varEndStr);
    return this.js;
};


function MathNode(parent, tokens) {
    // console.debug('tokens:', tokens);
    this.parent = parent;

    // searching index of operator/function to split tokens
    let lowestPriorityToken = null;
    let lowestPriorityTokenIndex = -1;
    let firstFunctionIndex = -1;
    let openingParenthesisCounter = 0;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') ++openingParenthesisCounter;
        else if (tokens[i] === ')') --openingParenthesisCounter;

        // console.debug('openingParenthesisCounter', openingParenthesisCounter, 'is0', new Boolean(openingParenthesisCounter));
        if (lowestPriorityTokenIndex === -1 ||
            (!openingParenthesisCounter && !_isBiggerPriority(tokens[i], lowestPriorityToken))
        ) {
            if (_isOperator(tokens[i])) {
                lowestPriorityToken = tokens[i];
                lowestPriorityTokenIndex = i;
                if (firstFunctionIndex === -1 && _isFunction(tokens[i]))
                    firstFunctionIndex = i;
            }
        }
    }

    // console.debug('firstFunctionIndex', firstFunctionIndex);
    if (firstFunctionIndex >= 0
        && !(PRIORITIES[lowestPriorityToken] < FUNCTIONS_PRIORITY)
    ) {
        lowestPriorityTokenIndex = firstFunctionIndex;
        lowestPriorityToken = tokens[lowestPriorityTokenIndex];
    }

    // console.debug('lowestPriorityToken', lowestPriorityToken);
    // is there are no operators, create a leaf with operand
    if (lowestPriorityTokenIndex === -1) {
        this.operator = null;
        this.children = tokens[0];
        return;
    }

    // splitting tokens on children by founded index
    this.children = [];
    if (lowestPriorityToken === ')') {
        // console.debug('lowestPriorityTokenIndex', lowestPriorityTokenIndex);
        this.operator = '()';
        let argumentTokens = [];
        openingParenthesisCounter = 0;
        for (let i = 1; i < tokens.length - 1; i++) {
            if (tokens[i] === '(') ++openingParenthesisCounter;
            else if (tokens[i] === ')') --openingParenthesisCounter;

            if (tokens[i] === ',' && openingParenthesisCounter === 0) {
                this.children.push(new MathNode(this, argumentTokens));
                argumentTokens = [];
            } else argumentTokens.push(tokens[i]);
        }
        this.children.push(new MathNode(this, argumentTokens));
        argumentTokens = [];
    } else {
        this.operator = lowestPriorityToken;
        if (lowestPriorityTokenIndex > 0)
            this.children.push(
                new MathNode(this, tokens.slice(0, lowestPriorityTokenIndex))
            )
        if (lowestPriorityTokenIndex < tokens.length)
            this.children.push(
                new MathNode(this, tokens.slice(lowestPriorityTokenIndex + 1))
            );
    }
}

MathNode.prototype.toString = function () {
    if (this.operator == null) return this.children;
    else {
        let outputString =
            this.operator +
            '[' +
            this.children.map(x => x.toString()).join(',') +
            ']';
        return outputString;
    }
};

MathNode.prototype.toMathjax = function () {
    if (this.operator === null)
        return this.children;

    let outputString = '';
    if (this.operator === '()') {
        outputString += '\\left({';
        if (this.children.length > 0) {
            outputString += this.children[0].toMathjax();
            for (let i = 1; i < this.children.length; i++)
                outputString += ',' + this.children[i].toMathjax();
        }
        outputString += '}\\right)';
    } else if (this.operator === '/') {
        outputString += '\\frac {' +
            this.children[0].toMathjax() + '} {' +
            this.children[1].toMathjax() + '}';
    } else if (_isBinaryOperator(this.operator)) {
        if (this.children[1] === undefined) {
            outputString += this.operator + this.children[0].toMathjax();
        }
        else {
            outputString += '{' + this.children[0].toMathjax() + '}' +
                this.operator +
                '{' + this.children[1].toMathjax() + '}';
        }
    } else {
        outputString += '\\' + this.operator +
            ' { ' + this.children[0].toMathjax() + '}';
    }

    return outputString;
};

MathNode.prototype.toJS = function (varBeginStr, varEndStr) {
    // console.log('vars_container', vars_container)
    if (this.operator === null)
        if (!isNaN(this.children))
            return this.children;
        else if (_isConstant(this.children)) return DICT_TOKEN_TO_JS[this.children];
        else { // is variable
            if (this.children !== 'x')
                return varBeginStr + this.children + varEndStr;
            else return this.children;
        }

    let outputString = '';
    if (this.operator === '()') {
        let isNeededParentheses = this.parent && !_isFunction(this.parent.operator);
        if (isNeededParentheses) outputString += '(';
        if (this.children.length > 0) {
            outputString += this.children[0].toJS(varBeginStr, varEndStr);
            for (let i = 1; i < this.children.length; i++)
                outputString += ',' + this.children[i].toJS(varBeginStr, varEndStr);
        }
        if (isNeededParentheses) outputString += ')';
    } else if (this.operator === '^') {
        outputString += 'Math.pow(' +
            this.children[0].toJS(varBeginStr, varEndStr) + ',' +
            this.children[1].toJS(varBeginStr, varEndStr) + ')';
    } else if (_isBinaryOperator(this.operator)) {
        if (this.children[1] === undefined) {
            outputString += this.operator + this.children[0].toJS(varBeginStr, varEndStr);
        } else {
            outputString += this.children[0].toJS(varBeginStr, varEndStr) +
                this.operator + this.children[1].toJS(varBeginStr, varEndStr);
        }
    } else {// functions        
        let op = DICT_TOKEN_TO_JS[this.operator];
        if (op === undefined) throw 'unknown math function ' + this.operator;
        outputString += '' + op +
            '(' + this.children[0].toJS(varBeginStr, varEndStr) + ')';
    }
    return outputString;
};