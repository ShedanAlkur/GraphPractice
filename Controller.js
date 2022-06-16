var controller = new (function Controller(con) {
    this._graph;
    this.hExpressionsContainer;
    this.hVariablesContainer;

    // constants
    this.graphThickness = 2;

    // user input
    this.isMoving = false;
    this.lastX = null;
    this.lastY = null;
    this.lastCenterX = null;
    this.lastCenterY = null;
    this.lastDist = null;

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
        this._graph.domCanvas.addEventListener('mousedown', _onCanvasMousedown);
        this._graph.domCanvas.addEventListener('mouseup', _onCanvasMouseup);
        this._graph.domCanvas.addEventListener('mouseenter', _onCanvasMouseenter);
        this._graph.domCanvas.addEventListener('mousemove', _onmousemoveCanvas);
        this._graph.domCanvas.addEventListener('mouseleave', _onCanvasMouseleave);
        this._graph.domCanvas.addEventListener('wheel', _onwheelCanvas);

        this._graph.domCanvas.addEventListener('touchcancel', _onCanvasTouchcancel);
        this._graph.domCanvas.addEventListener('touchend', _onCanvasTouchend);
        this._graph.domCanvas.addEventListener('touchmove', _onCanvasTouchmove);
        this._graph.domCanvas.addEventListener('touchstart', _onCanvasTouchstart);
    }

    Controller.prototype.render = function () { this._graph.render(); }

    Controller.prototype.getFloatCoordText = function (x, y) {
        let [graphX, graphY] = this._graph.CoordsCanvasToGraph(x, y);
        return `(${graphX}, ${graphY})`;
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
        let id = element.id.replace('expression-container-', '');
        let color = document.getElementById('expression-color-' + id).value;

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
const _onCanvasMousedown = function (event) {
    console.log('_onmousedownCanvas')
    controller.isMoving = true;
}

const _onCanvasTouchstart = function (event) {
    console.log('_onTouchstartCanvas');
    console.log(event);
    controller.isMoving = true;

    event.preventDefault();
}

const _onCanvasMouseup = function (event) {
    console.log('_onmouseupCanvas')
    controller.isMoving = false;
    controller.lastX = null;
    controller.lastY = null;
}

const _onCanvasTouchend = function (event) {
    console.log('_onTouchendCanvas');
    controller.isMoving = false;
    controller.lastX = null;
    controller.lastY = null;
    controller.lastCenterX = null;
    controller.lastCenterY = null;
    controller.lastDist = null;
}

const _onCanvasTouchcancel = function (event) {
    console.log('_onTouchcancelCanvas');
    console.log(event);
}

const _onCanvasMouseenter = function (event) {
    console.log('_onmouseenterCanvas')
    let el = document.getElementById('float-coord');
    el.style.setProperty('display', 'block');
}

const _onCanvasMouseleave = function (event) {
    console.log('_onmouseleaveCanvas')
    let el = document.getElementById('float-coord');
    el.style.setProperty('display', 'none');

    controller.isMoving = false;
    controller.lastX = null;
    controller.lastY = null;
}

const _onCanvasTouchmove = function (event) {
    console.log('_onTouchmoveCanvas');
    console.log(event);

    let touch1, touch2;

    switch (event.touches.length) {
        case 1:
            touch1 = event.touches[0];
            let [x, y] = getMousePos(event.currentTarget, touch1.clientX, touch1.clientY);
            if (controller.isMoving) {
                if (controller.lastX) {
                    let moveX = controller.lastX - x;
                    let moveY = controller.lastY - y;
                    controller.offset(moveX ? moveX : 0, moveY ? moveY : 0);
                }
                controller.lastX = x;
                controller.lastY = y;
            }
            break;
        case 2:
            touch1 = event.touches[0];
            touch2 = event.touches[1];
            controller.isMoving = false;

            let [p1x, p1y] = getMousePos(event.currentTarget, touch1.clientX, touch1.clientY);
            let [p2x, p2y] = getMousePos(event.currentTarget, touch2.clientX, touch2.clientY);

            if (!controller.lastCenterX) {
                controller.lastCenterX = (p1x + p2x) / 2;
                controller.lastCenterY = (p1y + p2y) / 2;
                return;
            }
            newCenterX = (p1x + p2x) / 2;
            newCenterY = (p1y + p2y) / 2;

            let dist = Math.hypot(p2x - p1x, p2y - p1y);

            if (controller.lastDist){
                controller.lastDist = dist;
            }

            let scale = dist / controller.lastDist;

            controller.scale(newCenterX, newCenterY, scale, scale);
            break;
    }
}

const _onmousemoveCanvas = function (event) {
    console.log('_onmousemoveCanvas')
    let [x, y] = getMousePos(event.currentTarget, event.clientX, event.clientY);
    let el = document.getElementById('float-coord');
    if (controller.isMoving) {
        if (controller.lastX) {
            let moveX = controller.lastX - x;
            let moveY = controller.lastY - y;
            controller.offset(moveX ? moveX : 0, moveY ? moveY : 0);
        }
        controller.lastX = x;
        controller.lastY = y;

        el.style.left = '-100px';
        el.style.top = '-100px';
    } else {
        el.innerText = controller.getFloatCoordText(x, y);
        el.style.left = Math.max(event.clientX - el.offsetWidth - 20, 0) + 'px';
        el.style.top = Math.max(event.clientY - el.offsetHeight - 20, 0) + 'px';
    }
}

const _onwheelCanvas = function (event) {
    console.log('_onwheelCanvas')
    let [x, y] = getMousePos(event.currentTarget, event.clientX, event.clientY);
    let el = document.getElementById('float-coord');

    let scale = event.deltaY > 0 ? 1.2 : 1 / 1.2;
    controller.scale(x, y, scale, scale);

    el.innerText = controller.getFloatCoordText(x, y);
}


//////////////////////////////
/// HTML BLOCK CONTRUCTORS ///
//////////////////////////////
function _createExpressionContainer(index) {
    let id = getId();
    let container = document.createElement('div');
    container.className = "expression-container";
    container.id = 'expression-container-' + id;

    let el;
    let lineContainer;

    lineContainer = document.createElement('div');
    // color
    el = document.createElement('input');
    el.type = 'color';
    el.className = 'expression-container__color';
    el.id = 'expression-color-' + id;
    el.value = '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
    el.addEventListener('change', _onChangeExpressionColor);
    lineContainer.appendChild(el);
    // function
    el = document.createElement('input');
    el.type = 'text';
    el.className = 'expression-container__function';
    el.id = 'expression-function-' + id;
    el.addEventListener('input', _onInputExpression);
    el.addEventListener('blur', _onBlurExpression);
    el.addEventListener('change', _onChangeExpression);
    lineContainer.appendChild(el);
    // close
    el = document.createElement('span');
    el.innerHTML = '&#10006';
    el.className = 'expression-container__close';
    el.addEventListener('click', _onClickCloseExpression);
    lineContainer.appendChild(el);
    container.appendChild(lineContainer);

    lineContainer = document.createElement('div');
    // br and span
    // lineContainer.appendChild(document.createElement('br'));
    lineContainer.appendChild(document.createElement('span')).innerText = 'MathJax: ';
    // mathJax
    el = document.createElement('span');
    el.id = 'expression-mathjax-' + id;
    lineContainer.appendChild(el);
    container.appendChild(lineContainer);

    return container;
}

function _createVariableContainer(name) {
    let id = getId();
    let container = document.createElement('div');
    container.className = "variable-container";
    container.id = 'variable-container-' + id;
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
    el.id = 'variable-' + id;
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
    el.id = 'variable-min-' + id;
    el.placeholder = 'min'
    el.value = -10;
    el.addEventListener('change', _onChangeVariableMin);
    lineContainer.appendChild(el);
    // slider
    el = document.createElement('input');
    el.type = 'range';
    el.className = 'variable-container__range';
    el.id = 'variable-range-' + id;
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
    el.id = 'variable-max-' + id;
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
    let id = element.id.replace('expression-function-', '');
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
        let mathJax = document.getElementById('expression-mathjax-' + id);
        mathJax.innerHTML = '\\(' + controller.expressions[inputIndex].getMathjax() + '\\)';
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, mathJax]);

        //graph       
        let js = controller.expressions[inputIndex].getJS();
        console.log(js);
        controller.delegates[inputIndex] =
            _createDelegate(js, 'x');
        let color = document.getElementById('expression-color-' + id).value;
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

const _onClickCloseExpression = function (event) {
    let element = event.currentTarget;
    let inputIndex = controller.expressionContainers.indexOf(element.parentNode.parentNode);

    // removing  expression-container
    if (inputIndex == controller.expressionContainers.length - 1)
        controller.addExpression();
    controller.removeExpression(inputIndex);
    for (let [_, value] of controller.variableUsageMap)
        value.delete(inputIndex);

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

    controller.render();
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
    let id = element.id.replace('variable-', '');
    let name = element.parentNode.parentNode.varName;

    controller.variables.set(name, parseFloat(element.value));
    document.getElementById('variable-range-' + id).value = element.value;

    let color;
    for (let i of controller.variableUsageMap.get(name)) {
        controller.redrawByIndex(i);
    }
    controller._graph.render();
}

const _onChangeVariableMin = function (event) {
    let element = event.currentTarget;
    let id = element.id.replace('variable-min-', '');

    let min = parseFloat(element.value);
    let max = parseFloat(document.getElementById('variable-max-' + id).value);
    let step = (max - min) / 100;

    let range = document.getElementById('variable-range-' + id);
    range.min = min;
    range.step = step;
}

const _onChangeVariableMax = function (event) {
    let element = event.currentTarget;
    let id = element.id.replace('variable-max-', '');

    let min = parseFloat(document.getElementById('variable-min-' + id).value);
    let max = parseFloat(element.value);
    let step = (max - min) / 100;

    let range = document.getElementById('variable-range-' + id);
    range.max = max;
    range.step = step;
}

const _onInputVariableRange = function (event) {
    let element = event.currentTarget;
    let id = element.id.replace('variable-range-', '');
    let name = element.parentNode.parentNode.varName;

    controller.variables.set(name, parseFloat(element.value));
    document.getElementById('variable-' + id).value = element.value;

    let color;
    for (let i of controller.variableUsageMap.get(name)) {
        controller.redrawByIndex(i);
    }
    controller._graph.render();
}

/////////////////
/// UTILITIES ///
/////////////////
var getId = (function () {
    var incrementingId = 0;
    return function () {
        return incrementingId++;
    };
}());


function _createDelegate(expression, paramName) {
    let str = 'return function(' + paramName + '){return (' + expression + ')}';
    // console.log('expression', expression);
    return Function(str)();
}

function getMousePos(canvas, clientX, clientY) {
    let rect = canvas.getBoundingClientRect(); // abs. size of element
    let scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for x
    let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for y

    return [
        (clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        (clientY - rect.top) * scaleY     // been adjusted to be relative to element
    ]
}