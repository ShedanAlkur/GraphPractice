function Graph(con) {
    // user defined properties  
    this.domCanvas = con.canvas;
    this._minX = con.minX;
    this._maxX = con.maxX;
    this._minY = con.minY;
    this._maxY = con.maxY;

    // constants
    this.tickDistance = 150;
    this.axisColor = "#000000";
    this.axisWidth = 3;
    this.textColor = "#000000";
    this.font = "10pt Calibri";
    this.tickSize = 20;
    this.tickColor = "#d4d4d4";

    // relationships  
    this.domContext = this.domCanvas.getContext("2d");
    this._width = this.domCanvas.width;
    this._height = this.domCanvas.height;

    this._updateProps();

    // virtual canvases
    this.axisLayer = new Layer(this._width, this._height)
    this.graphLayers = [];

    // draw x and y axis
    this.drawAxis();
}

Graph.prototype.setSize = function (width, height) {
    this._width = width;
    this._height = height;
    this.domCanvas.width = this.axisLayer.canvas.width = width;
    this.domCanvas.height = this.axisLayer.canvas.height = height;
    this.axisLayer.canvas.width = width;
    this.axisLayer.canvas.height = height;
    for (let i = 0; i < this.graphLayers.length; i++) {
        this.graphLayers[i].canvas.width = width;
        this.graphLayers[i].canvas.height = height;
    }
    this._updateProps();
}

Graph.prototype.offset = function (offsetX, offsetY) {
    this._minX += offsetX;
    this._maxX += offsetX;
    this._minY -= offsetY;
    this._maxY -= offsetY;

    this._updateProps();
}

Graph.prototype.scale = function (centerX, centerY, scaleX, scaleY) {
    let newRangeX = this._rangeX * scaleX;
    let newRangeY = this._rangeY * scaleY;

    this._minX = centerX - (centerX - this._minX) / this._rangeX * newRangeX;
    this._minY = centerY - (centerY - this._minY) / this._rangeY * newRangeY;

    this._maxX = this._minX + newRangeX;
    this._maxY = this._minY + newRangeY;

    this._updateProps();
}

Graph.prototype._updateProps = function () {
    if (this._maxX <= this._minX)
        throw new Error('Wrong xRange: ' + `${this._minX}<x<${this._maxX}`);
    if (this._maxY <= this._minY)
        throw new Error('Wrong yRange: ' + `${this._minY}<y<${this._maxY}`);

    this._rangeX = this._maxX - this._minX;
    this._rangeY = this._maxY - this._minY;

    this._scaleX = this._width / this._rangeX;
    this._scaleY = this._height / this._rangeY;
    this._centerX = -Math.sign(this._minX) * (Math.round(Math.abs(this._minX / this._rangeX) * this._width));
    this._centerY = Math.sign(this._maxY) * (Math.round(Math.abs(this._maxY / this._rangeY) * this._height));

    this.unitsPerTickX = this._getUnitsPerTick(this._scaleX);
    this.unitsPerTickY = this._getUnitsPerTick(this._scaleY);

    this._iterationX = this._rangeX / 1000;
    this.graphGapDistance = 400 * this._scaleY;

    this.recommendedAccuracyX = Math.max(3, Math.floor(Math.log10(this._scaleX)) + 1)
    this.recommendedAccuracyY = Math.max(3, Math.floor(Math.log10(this._scaleY)) + 1)
}


Graph.prototype._getUnitsPerTick = function (scale) {
    let r = this.tickDistance / scale;
    let p = Math.floor(Math.log10(r));

    r /= Math.pow(10, p);
    if (r >= 5) r = 5;
    else if (r >= 2) r = 2;
    else if (r >= 1) r = 1;

    r *= Math.pow(10, p)
    return r;
}


Graph.prototype._createCanvas = function (index) {
    this.graphCanvases[index] = document.createElement('canvas');
    this.graphCanvases[index].width = this._width;
    this.graphCanvases[index].height = this._height;
    this.graphContexts[index] = this.graphCanvases[index].getContext('2d');
}

Graph.prototype.drawAxis = function () {
    this.clearContext(this.axisLayer.context);
    this.drawXAxis();
    this.drawYAxis();
}

Graph.prototype.drawXAxis = function () {
    var context = this.axisLayer.context;
    context.save();

    // tick marks and axis params
    context.strokeStyle = this.tickColor;
    var posIncrementX = this.unitsPerTickX * this._scaleX;
    var posIncrementOver5 = posIncrementX / 5;
    var mainTickPosX, unit;
    var mainTickPos, subTickPos;

    // text params
    context.fillStyle = this.textColor;
    context.font = this.font;
    context.textAlign = "center";
    context.textBaseline = "top";
    let textOffsetY = this.tickSize / 2 + 3;
    let textPosY = this._centerY + textOffsetY;
    if (textPosY < textOffsetY) {
        textPosY = textOffsetY;
    } else if (textPosY > this._height - textOffsetY) {
        textPosY = this._height - textOffsetY;
        context.textBaseline = "bottom";
    }

    // draw left tick marks  
    if (this._maxX >= 0) {
        mainTickPosX = this._centerX - posIncrementX;
        subTickPos = this._centerX - posIncrementOver5;
        unit = -1 * this.unitsPerTickX;
    }
    else {
        mainTickPosX = this._width - (this._maxX * this._scaleX % posIncrementX);
        subTickPos = mainTickPosX - posIncrementOver5;
        unit = (this._maxX - this._maxX % this.unitsPerTickX);
    }
    while (subTickPos > 0) {
        context.beginPath();
        context.lineWidth = this.axisWidth / 2;
        for (let j = 0; j < 4; j++) {
            context.moveTo(subTickPos, 0);
            context.lineTo(subTickPos, this._height);
            context.stroke();
            subTickPos -= posIncrementOver5;
        }
        context.beginPath();
        context.lineWidth = this.axisWidth;
        context.moveTo(subTickPos, 0);
        context.lineTo(subTickPos, this._height);
        context.stroke();
        subTickPos -= posIncrementOver5;
    }
    mainTickPos = mainTickPosX;
    while (mainTickPos > 0) {
        context.fillText(round(unit, this.recommendedAccuracyX), mainTickPos, textPosY);
        unit -= this.unitsPerTickX;
        mainTickPos -= posIncrementX;
    }

    // draw right tick marks 
    if (this._minX <= 0) {
        mainTickPosX = this._centerX + posIncrementX;
        subTickPos = this._centerX + posIncrementOver5;
        unit = 1 * this.unitsPerTickX;
    }
    else {
        mainTickPosX = -(this._minX * this._scaleX % posIncrementX);
        subTickPos = mainTickPosX + posIncrementOver5;
        unit = (this._minX - this._minX % this.unitsPerTickX);
    }
    while (subTickPos < this.domCanvas.width) {
        context.beginPath();
        context.lineWidth = this.axisWidth / 2;
        for (let j = 0; j < 4; j++) {
            context.moveTo(subTickPos, 0);
            context.lineTo(subTickPos, this._height);
            context.stroke();
            subTickPos += posIncrementOver5;
        }
        context.beginPath();
        context.lineWidth = this.axisWidth;
        context.moveTo(subTickPos, 0);
        context.lineTo(subTickPos, this._height);
        context.stroke();
        subTickPos += posIncrementOver5;
    }
    mainTickPos = mainTickPosX;
    while (mainTickPos < this.domCanvas.width) {
        context.fillText(round(unit, this.recommendedAccuracyX), mainTickPos, textPosY);
        unit += this.unitsPerTickX;
        mainTickPos += posIncrementX;
    }

    // draw axis
    context.strokeStyle = this.axisColor;
    context.lineWidth = this.axisWidth;
    context.beginPath();
    context.moveTo(0, this._centerY);
    context.lineTo(this.domCanvas.width, this._centerY);
    context.stroke();

    context.restore();
};

Graph.prototype.drawYAxis = function () {
    var context = this.axisLayer.context;
    context.save();


    // tick marks and axis params
    context.strokeStyle = this.tickColor;
    var posIncrementY = this.unitsPerTickY * this._scaleY;
    var posIncrementOver5 = posIncrementY / 5;
    var mainTickPosY, unit;
    var mainTickPos, subTickPos;

    // text params
    context.fillStyle = this.textColor;
    context.font = this.font;
    context.textAlign = "right";
    context.textBaseline = "middle";
    let textOffsetX = this.tickSize / 2 + 3;
    let textPosX = this._centerX - textOffsetX;
    if (textPosX < textOffsetX) {
        textPosX = textOffsetX;
        context.textAlign = "left";
    } else if (textPosX > this._width - textOffsetX) {
        textPosX = this._width - textOffsetX;
    }

    // draw top tick marks 
    if (this._minY <= 0) {
        mainTickPosY = this._centerY - posIncrementY;
        subTickPos = this._centerY - posIncrementOver5
        unit = this.unitsPerTickY;
    }
    else {
        mainTickPosY = this._height + (this._minY * this._scaleY % posIncrementY);
        subTickPos = mainTickPosY - posIncrementOver5
        unit = (this._minY - this._minY % this.unitsPerTickY);
    }
    while (subTickPos > 0) {
        context.beginPath();
        context.lineWidth = this.axisWidth / 2;
        for (let j = 0; j < 4; j++) {
            context.moveTo(0, subTickPos);
            context.lineTo(this._width, subTickPos);
            context.stroke();
            subTickPos -= posIncrementOver5;
        }
        context.beginPath();
        context.lineWidth = this.axisWidth;
        context.moveTo(0, subTickPos);
        context.lineTo(this._width, subTickPos);
        context.stroke();
        subTickPos -= posIncrementOver5;
    }
    mainTickPos = mainTickPosY;
    while (mainTickPosY > 0) {
        context.fillText(round(unit, this.recommendedAccuracyY), textPosX, mainTickPosY);
        unit += this.unitsPerTickY;
        mainTickPosY -= posIncrementY;
    }

    // draw bottom tick marks  
    if (this._maxY >= 0) {
        mainTickPosY = this._centerY + posIncrementY;
        subTickPos = this._centerY + posIncrementOver5;
        unit = -1 * this.unitsPerTickY;
    }
    else {
        mainTickPosY = (this._maxY * this._scaleY % posIncrementY);
        subTickPos = mainTickPosY + posIncrementOver5;
        unit = (this._maxY - this._maxY % this.unitsPerTickY);
    }
    while (subTickPos < this.domCanvas.height) {
        context.beginPath();
        context.lineWidth = this.axisWidth / 2;
        for (let j = 0; j < 4; j++) {
            context.moveTo(0, subTickPos);
            context.lineTo(this._width, subTickPos);
            context.stroke();
            subTickPos += posIncrementOver5;
        }
        context.beginPath();
        context.lineWidth = this.axisWidth;
        context.moveTo(0, subTickPos);
        context.lineTo(this._width, subTickPos);
        context.stroke();
        subTickPos += posIncrementOver5;
    }
    mainTickPos = mainTickPosY;
    while (mainTickPosY < this.domCanvas.height) {
        context.fillText(round(unit, this.recommendedAccuracyY), textPosX, mainTickPosY);
        unit -= this.unitsPerTickY;
        mainTickPosY += posIncrementY;
    }

    // draw axis
    context.strokeStyle = this.axisColor;
    context.lineWidth = this.axisWidth;
    context.beginPath();
    context.moveTo(this._centerX, 0);
    context.lineTo(this._centerX, this.domCanvas.height);
    context.stroke();

    context.restore();
};

Graph.prototype.CoordsCanvasToGraph = function (x, y) {
    return [round((x - this._centerX) / this._scaleX, this.recommendedAccuracyX)
        , round((y - this._centerY) / -this._scaleY, this.recommendedAccuracyY)];
};

Graph.prototype.drawEquationByX = function (layerIndex, equation, color, thickness) {
    var context;
    if (this.graphLayers[layerIndex]) context = this.graphLayers[layerIndex].context;
    else {
        this.graphLayers[layerIndex] = new Layer(this._width, this._height);
        context = this.graphLayers[layerIndex].context;
    }

    this.clearContext(context);
    context.save();
    // context.save();
    this.transformContext(context);

    context.beginPath();
    let lastY;

    try {
        lastY = equation(this._minX);
        context.moveTo(this._minX, lastY);

        for (var x = this._minX + this._iterationX; x <= this._maxX; x += this._iterationX) {
            let y = equation(x);
            if (Math.abs(y - lastY) >= this.graphGapDistance) {
                // обрезать путь
            }
            context.lineTo(x, y);
        }
    } catch (error) {
        throw error;
    } finally {
        context.restore();
        context.lineJoin = "round";
        context.lineWidth = thickness;
        context.strokeStyle = color;
        context.stroke();
    }
    // context.restore();
};

Graph.prototype.drawPolEquation = function (layerIndex, equation, startAngle, endAngle, color, thickness) {
    var context;
    if (this.graphLayers[layerIndex]) context = this.graphLayers[layerIndex].context;
    else {
        this.graphLayers[layerIndex] = new Layer(this._width, this._height);
        context = this.graphLayers[layerIndex].context;
    }

    // console.log(context, context)
    this.clearContext(context);
    context.save();
    // context.save();
    this.transformContext(context);

    context.beginPath();

    let step = 2 * Math.PI / 1000;

    try {
        let r = equation(startAngle);
        context.moveTo(r * Math.cos(fi), r * Math.sin(fi));

        for (var fi = startAngle + step; fi <= endAngle; fi += step) {
            r = equation(fi);
            context.lineTo(r * Math.cos(fi), r * Math.sin(fi));
        }
    } catch (error) {
        throw error;
    } finally {
        context.restore();
        context.lineJoin = "round";
        context.lineWidth = thickness;
        context.strokeStyle = color;
        context.stroke();
    }

    // context.restore();
};

Graph.prototype.transformContext = function (context) {
    // move context to center of canvas  
    context.translate(this._centerX, this._centerY);

    context.scale(this._scaleX, -this._scaleY);
};

Graph.prototype.coordGlobalToCanvas = function (x, y) {
    return [(x - this._centerX) / this._scaleX
        , (y - this._centerY) / -this._scaleY];
}

Graph.prototype.render = function () {
    this.clearContext(this.domContext);
    this.domContext.drawImage(this.axisLayer.canvas, 0, 0,
        this.domCanvas.width, this._height);
    for (let i = 0; i < this.graphLayers.length; i++) {
        this.domContext.drawImage(this.graphLayers[i].canvas, 0, 0,
            this.domCanvas.width, this.domCanvas.height);
    }
};

Graph.prototype.clearContext = function (context) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
};

Graph.prototype.clearAll = function () {
    this.clearContext(this.domContext);
    this.clearContext(this.axisLayer.context);
    for (let i in this.graphLayers) {
        this.clearContext(this.graphLayers[i].context);
    }
}


function Layer(width, height) {
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext('2d');
}

Layer.prototype.setSize = function (width, height) {
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
}

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const round = function (num, accuracy = 0) {
    if (accuracy < 0) throw new Error('Argument lower than 0: ' + accuracy);
    let p = Math.max(0, Math.pow(10, accuracy));
    return Math.round((num + Number.EPSILON) * p) / p
}
