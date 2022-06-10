var controller = new (function Controller(con) {
    // user defined properties 
    /*this.graph = con.graph;
    this.hExpressionsContainer = con.hExpressionsContainer;
    this.hVariablesContainer = con.hVariablesContainer;*/

    this._graph;
    this.hExpressionsContainer;
    this.hVariablesContainer;

    // constants
    this.graphThickness = 2;

    // relationships
    // this.hCanvas = this.graph.domCanvas;

    // containers
    this.expressions = []; // Array[Expression]
    this.expressionContainers = []; // Array[tagElement]
    this.delegates = []; // Array[Function]
    this.variables = new Map(); // Map(str, float)
    this.variableContainersMap = new Map(); // map(str, tagElement)
    this.variableUsageMap = new Map(); // map(str, set(index))


    // graph.drawPolEquation(0, function (fi) {
    //     // return r = fi/2;
    //     return r = 10 * Math.sin(3/2 * fi);
    // }, "green", 1);


    Controller.prototype.setGraph = function (graph) {
        this._graph = graph;
        this._graph.domCanvas.addEventListener('mousedown', _onmousedownCanvas);
        this._graph.domCanvas.addEventListener('mouseup', _onmouseupCanvas);
        this._graph.domCanvas.addEventListener('mouseenter', _onmouseenterCanvas);
        this._graph.domCanvas.addEventListener('mousemove', _onmousemoveCanvas);
        this._graph.domCanvas.addEventListener('mouseleave', _onmouseleaveCanvas);
        this._graph.domCanvas.addEventListener('wheel', _onwheelCanvas);
    }

    Controller.prototype.render = function () { this._graph.render(); }

    Controller.prototype.getFloatCoordText = function (x, y) {
        let accuracyX = this._graph.recommendedAccuracyX;
        return `(${+((x - this._graph._centerX) / this._graph._scaleX).toFixed(accuracyX)
            }, ${+((y - this._graph._centerY) / -this._graph._scaleY).toFixed(accuracyX)
            })`;
    }

    Controller.prototype.addExpression = function () {
        let index = this.expressionContainers.length;
        this.expressionContainers.push( // el[]
            this.hExpressionsContainer.appendChild( // html
                _createExpressionContainer(index)));
    }

    Controller.prototype.removeExpression = function (index) {
        this.expressionContainers[index].remove(); // html
        this.expressionContainers.splice(index, 1); // el[]
        this.expressions.splice(index, 1); // exps
        this.delegates.splice(index, 1); // func[] 
        this._graph.graphLayers.splice(index, 1); // graph[]
    }


    Controller.prototype.addVariable = function (name) {
        let variableContainer = _createVariableContainer(name);
        this.variableContainersMap.set(name, variableContainer); // map(v -> el)
        this.hVariablesContainer.appendChild(variableContainer); // html
        this.variables.set(name, 0); // v[]
        this.variableUsageMap.set(name, new Set()); // map(var -> exprs)
    }

    Controller.prototype.removeVariable = function (name) {
        this.variableContainersMap.get(name).remove(); // html
        this.variableContainersMap.delete(name); // map(v -> el)
        this.variables.delete(name); // v[]
        this.variableUsageMap.delete(name); // map(var -> exprs)
    }

    Controller.prototype.redrawByIndex = function (index) {
        let element = this.expressionContainers[index];
        let color = element.querySelector('#expression-color').value;

        this._graph.drawEquationByX(index, this.delegates[index], color, this.graphThickness);
    }

    Controller.prototype.redrawAllGraphs = function () {
        for (let i in this.expressions) {
            this.redrawByIndex(i);
        }
    }

    Controller.prototype.offset = function (moveX, moveY) {
        // console.log('moveX, moveY',moveX, moveY)
        let offsetX = moveX / this._graph._scaleX;
        let offsetY = moveY / this._graph._scaleY;
        // console.log('offsetX', offsetX);

        this._graph.offset(offsetX, offsetY);
        // console.log('this._graph._minX', this._graph._minX)

        this._graph.drawAxis();
        this.redrawAllGraphs();

        this.render();
    }

    Controller.prototype.scale = function (cenX, cenY, scaleX, scaleY) {
        cenX = (cenX - this._graph._centerX) / this._graph._scaleX;
        cenY = (cenY - this._graph._centerY) / this._graph._scaleY;
        this._graph.scale(cenX, -cenY, scaleX, scaleY);
        this._graph.drawAxis();
        this.redrawAllGraphs();
        this.render();
    }
})();

//////////////////////
/// ON GRAPH EVENT ///
//////////////////////
const _onmousedownCanvas = function (event) {
    controller.mousePressed = true;
}

const _onmouseupCanvas = function (event) {
    controller.mousePressed = false;
    controller.lastMouseX = undefined;
    controller.lastMouseY = undefined;
}

const _onmouseenterCanvas = function (event) {
    let el = document.getElementById('float-coord');
    el.style.setProperty('display', 'block');
}

const _onmouseleaveCanvas = function (event) {
    let el = document.getElementById('float-coord');
    el.style.setProperty('display', 'none');

    controller.mousePressed = false;
    controller.lastMouseX = undefined;
    controller.lastMouseY = undefined;
}

const _onmousemoveCanvas = function (event) {
    let [x, y] = getMousePos(event);
    let el = document.getElementById('float-coord');
    if (controller.mousePressed) {
        let moveX = controller.lastMouseX - x;
        let moveY = controller.lastMouseY - y;
        controller.lastMouseX = x;
        controller.lastMouseY = y;
        controller.offset(moveX ? moveX : 0, moveY ? moveY : 0);

        el.style.left = '-100px';
        el.style.top = '-100px';
    } else {
        el.innerText = controller.getFloatCoordText(x, y);
        el.style.left = Math.max(event.clientX - el.offsetWidth - 20, 0) + 'px';
        el.style.top = Math.max(event.clientY - el.offsetHeight - 20, 0) + 'px';
    }
}

const _onwheelCanvas = function (event) {
    let [x, y] = getMousePos(event);
    let el = document.getElementById('float-coord');

    let scale = event.deltaY > 0 ? 1.2 : 1 / 1.2;
    controller.scale(x, y, scale, scale);

    el.innerText = controller.getFloatCoordText(x, y);
}


//////////////////////////////
/// HTML BLOCK CONTRUCTORS ///
//////////////////////////////
function _createExpressionContainer(index) {
    let container = document.createElement('div');
    container.className = "expression-container";
    // container.id = 'expression-container-' + index;

    let el;
    let lineContainer;

    lineContainer = document.createElement('div');
    // color
    el = document.createElement('input');
    el.type = 'color';
    el.className = 'expression-container__color';
    el.id = 'expression-color';
    el.value = '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
    el.addEventListener('change', _onChangeExpressionColor);
    lineContainer.appendChild(el);
    // function
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'expression-container__function';
    el.id = 'expression-function';
    el.addEventListener('input', _onInputExpression);
    el.addEventListener('blur', _onBlurExpression);
    el.addEventListener('change', _onChangeExpression);
    lineContainer.appendChild(el);
    container.appendChild(lineContainer);

    lineContainer = document.createElement('div');
    // br and span
    // lineContainer.appendChild(document.createElement('br'));
    lineContainer.appendChild(document.createElement('span')).innerText = 'MathJax: ';
    // mathJax
    el = document.createElement('span');
    el.id = 'expression-mathjax';
    lineContainer.appendChild(el);
    container.appendChild(lineContainer);

    return container;
}

function _createVariableContainer(name) {
    let container = document.createElement('div');
    container.className = "variable-container";
    container.varName = name;

    let el;
    let lineContainer;

    lineContainer = document.createElement('div');
    // name
    el = document.createElement('span');
    el.innerText = name + ':';
    lineContainer.appendChild(el);
    // value
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'variable-container__value';
    el.id = 'variable';
    el.addEventListener('input', _onInputVariable);
    el.value = 0;
    lineContainer.appendChild(el);
    container.appendChild(lineContainer);

    lineContainer = document.createElement('div');
    // br
    // container.appendChild(document.createElement('br'));
    // min
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'variable-container__limit';
    el.id = 'variable-min';
    el.placeholder = 'min'
    el.value = -10;
    el.addEventListener('change', _onChangeVariableMin);
    lineContainer.appendChild(el);
    // slider
    el = document.createElement('input');
    el.type = 'range';
    el.className = 'variable-container__range';
    console.log(el);
    el.id = 'variable-range';
    el.addEventListener('input', _onInputVariableRange);
    el.value = 0;
    el.min = -10;
    el.max = 10;
    el.step = (10 - (-10)) / 100;
    lineContainer.appendChild(el);
    // max
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'variable-container__limit';
    el.id = 'variable-max';
    el.placeholder = 'max'
    el.value = 10;
    el.addEventListener('change', _onChangeVariableMax);
    lineContainer.appendChild(el);
    container.appendChild(lineContainer);

    return container;
}

///////////////////////////
/// ON EXPRESSION EVENT ///
///////////////////////////
const _onChangeExpressionColor = function (event) {
    let element = event.currentTarget;
    let inputIndex = controller.expressionContainers.indexOf(element.parentNode.parentNode);

    graph.drawEquationByX(inputIndex, controller.delegates[inputIndex]
        , element.value, controller.graphThickness);
    graph.render();
}

const _onInputExpression = function (event) {
    let element = event.currentTarget;
    let inputIndex = controller.expressionContainers.indexOf(element.parentNode.parentNode);
    let str = element.value.toLowerCase().trim();

    // creating new input block
    if (inputIndex === controller.expressionContainers.length - 1 && str) {
        controller.addExpression();
    }

    // redrawing expression 
    if (!controller.expressions[inputIndex] || str !== controller.expressions[inputIndex].row) {
        controller.expressions[inputIndex] = new Expression(str, 'controller.variables.get("', '")');
        controller.delegates[inputIndex] = null;

        // mathjax
        let mathJax = element.parentNode.parentNode.querySelector('#expression-mathjax');
        mathJax.innerHTML = '\\(' + controller.expressions[inputIndex].getMathjax() + '\\)';
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, mathJax]);

        //graph       
        let js = controller.expressions[inputIndex].getJS();
        console.log(js);
        controller.delegates[inputIndex] =
            _createDelegate(js, 'x');
        let color = element.parentNode.parentNode.querySelector('#expression-color').value;
        graph.drawEquationByX(inputIndex, controller.delegates[inputIndex]
            , color, controller.graphThickness);
        controller._graph.render();
    }
}

const _onBlurExpression = function (event) {
    let element = event.currentTarget;
    let inputIndex = controller.expressionContainers.indexOf(element.parentNode.parentNode);
    let str = element.value.toLowerCase().trim();


    // removing empty expression-container
    if (inputIndex !== controller.expressionContainers.length - 1 && !str) {
        {
            controller.removeExpression(inputIndex);
            for (let [_, value] of controller.variableUsageMap)
                value.delete(inputIndex);
        }
    }

    // founding all existing variables in expressions
    let currentVariables;
    currentVariables = new Set();
    controller.variableUsageMap.clear();
    for (let i in controller.expressions) {
        for (let v of controller.expressions[i].variables) {
            if (!controller.variableUsageMap.has(v)) {
                controller.variableUsageMap.set(v, new Set());
            }
            controller.variableUsageMap.get(v).add(parseInt(i));
            currentVariables.add(v)
        }
    }

    // removing elements for removed variables
    for (let [key, _] of controller.variableContainersMap) {
        if (!currentVariables.has(key)) {
            controller.removeVariable(key);
        }
    }
}

const _onChangeExpression = function (event) {
    let element = event.currentTarget;
    let inputIndex = controller.expressionContainers.indexOf(element.parentNode.parentNode);
    let str = element.value.toLowerCase().trim();


    // processing variables from expressions  
    let newVars = []
    let explressionVariables = controller.expressions[inputIndex].variables;
    for (let v of explressionVariables) { // adding a new vars to expression
        if (!controller.variables.has(v) && v !== 'x' && !_isConstant(v)) {
            newVars.push(v);
            controller.addVariable(v);
        }
    }

    if (newVars.length > 0) { // redrawing graph after adding variable (value=0)
        controller.redrawByIndex(inputIndex)
        graph.render();
    }

    let currentVariables;
    currentVariables = new Set();
    controller.variableUsageMap.clear();
    for (let i in controller.expressions) {
        // console.log('i', i);
        for (let v of controller.expressions[i].variables) {
            // console.log('v', v);
            if (!controller.variableUsageMap.has(v)) {
                // console.log('adding')
                controller.variableUsageMap.set(v, new Set());
            }
            controller.variableUsageMap.get(v).add(parseInt(i));
            currentVariables.add(v)
        }
    }
    // console.log(controller.variableUsageMap);

    // removing elements for removed variables
    for (let [key, _] of controller.variableContainersMap) {
        if (!currentVariables.has(key)) {
            controller.removeVariable(key);
        }
    }
    // console.log(controller.variableUsageMap);
}

/////////////////////////
/// ON VARIABLE EVENT ///
/////////////////////////
const _onInputVariable = function (event) {
    let element = event.currentTarget;
    let name = element.parentNode.parentNode.varName;

    controller.variables.set(name, parseFloat(element.value));
    element.parentNode.parentNode.querySelector('#variable-range').value = element.value;

    let color;
    for (let i of controller.variableUsageMap.get(name)) {
        color = controller.expressionContainers[i]
            .querySelector('#expression-color').value;
        controller.redrawByIndex(i);
    }
    controller._graph.render();
}

const _onChangeVariableMin = function (event) {
    let element = event.currentTarget;

    let min = parseFloat(element.value);
    let max = parseFloat(element.parentNode.parentNode.querySelector('#variable-max').value);
    let step = (max - min) / 100;

    let range = element.parentNode.parentNode.querySelector('#variable-range');
    range.min = min;
    range.step = step;
}

const _onChangeVariableMax = function (event) {
    let element = event.currentTarget;

    let min = parseFloat(element.parentNode.parentNode.querySelector('#variable-min').value);
    let max = parseFloat(element.value);
    let step = (max - min) / 100;

    let range = element.parentNode.parentNode.querySelector('#variable-range');
    range.max = max;
    range.step = step;
}

const _onInputVariableRange = function (event) {
    let element = event.currentTarget;
    let name = element.parentNode.parentNode.varName;

    controller.variables.set(name, parseFloat(element.value));
    element.parentNode.parentNode.querySelector('#variable').value = element.value;

    let color;
    for (let i of controller.variableUsageMap.get(name)) {
        color = controller.expressionContainers[i]
            .querySelector('#expression-color').value;
        controller.redrawByIndex(i);
    }
    controller._graph.render();
}

/////////////////
/// UTILITIES ///
/////////////////
var getId = (function () {
    var incrementingId = 0;
    return function (prefix) {
        return prefix + incrementingId++;
    };
}());


function _createDelegate(expression, paramName) {
    let str = 'return function(' + paramName + '){return (' + expression + ')}';
    // console.log('expression', expression);
    return Function(str)();
}

function getMousePos(event) {
    let canvas = event.currentTarget;
    let rect = canvas.getBoundingClientRect(), // abs. size of element
        scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for x
        scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for y

    return [
        (event.clientX - rect.left) * scaleX   // scale mouse coordinates after they have
        , (event.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    ]
}