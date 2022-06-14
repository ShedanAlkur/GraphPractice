function Graph(con) {
    // user defined properties  
    this.domCanvas = con.canvas;
    this._minX = con.minX;
    this._maxX = con.maxX;
    this._minY = con.minY;
    this._maxY = con.maxY;
    this.unitsPerTick = con.unitsPerTick;

    // constants  
    this.axisColor = "#000000";
    this.font = "8pt Calibri";
    this.tickSize = 20;

    // relationships  
    this.domContext = this.domCanvas.getContext("2d");
    this._rangeY = this._maxY - this._minY;
    this._rangeX = this._maxX - this._minX;
    this._iterationX = (this._maxX - this._minX) / 1000;
    this.recommendedAccuracyX = Math.max(0, -Math.log10(this._rangeX)) + 3

    this._width = this.domCanvas.width;
    this._height = this.domCanvas.height;
    this._scaleX = this._width / this._rangeX;
    this._scaleY = this._height / this._rangeY;
    this._centerX = -Math.sign(this._minX) * (Math.round(Math.abs(this._minX / this._rangeX) * this._width));
    this._centerY = Math.sign(this._maxY) * (Math.round(Math.abs(this._maxY / this._rangeY) * this._height));

    // virtual canvases
    this.axisLayer = new Layer(this._width, this._height)
    this.graphLayers = [];

    // draw x and y axis  
    this.drawAxis();
}

Graph.prototype.offset = function (offsetX, offsetY) {
    this._minX += offsetX;
    this._maxX += offsetX;
    this._minY -= offsetY;
    this._maxY -= offsetY;

    ///
    this._rangeX = this._maxX - this._minX;
    this._rangeY = this._maxY - this._minY;
    this._iterationX = this._rangeX / 1000;
    this.recommendedAccuracyX = Math.max(0, -Math.log10(this._rangeX)) + 3

    this._scaleX = this._width / this._rangeX;
    this._scaleY = this._height / this._rangeY;
    this._centerX = -Math.sign(this._minX) * (Math.round(Math.abs(this._minX / this._rangeX) * this._width));
    this._centerY = Math.sign(this._maxY) * (Math.round(Math.abs(this._maxY / this._rangeY) * this._height));
}

Graph.prototype.scale = function (centerX, centerY, scaleX, scaleY) {
    let newRangeX = this._rangeX * scaleX;
    let newRangeY = this._rangeY * scaleY;

    this._minX = centerX - (centerX - this._minX) / this._rangeX * newRangeX;
    this._minY = centerY - (centerY - this._minY) / this._rangeY * newRangeY;

    this._maxX = this._minX + newRangeX;
    this._maxY = this._minY + newRangeY;
    ///
    this._rangeX = this._maxX - this._minX;
    this._rangeY = this._maxY - this._minY;
    this._iterationX = this._rangeX / 1000;
    this.recommendedAccuracyX = Math.max(0, -Math.log10(this._rangeX)) + 3

    this._scaleX = this._width / this._rangeX;
    this._scaleY = this._height / this._rangeY;
    this._centerX = -Math.sign(this._minX) * (Math.round(Math.abs(this._minX / this._rangeX) * this._width));
    this._centerY = Math.sign(this._maxY) * (Math.round(Math.abs(this._maxY / this._rangeY) * this._height));
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
    context.beginPath();
    context.moveTo(0, this._centerY);
    context.lineTo(this.domCanvas.width, this._centerY);
    context.strokeStyle = this.axisColor;
    context.lineWidth = 1;
    context.stroke();

    // draw tick marks  
    var xPosIncrement = this.unitsPerTick * this._scaleX;
    var xPos, unit;
    context.font = this.font;
    context.textAlign = "center";
    context.textBaseline = "top";

    // draw left tick marks  
    if (this._maxX >= 0) {
        xPos = this._centerX - xPosIncrement;
        unit = -1 * this.unitsPerTick;
    }
    else {
        xPos = this._width - (this._maxX * this._scaleX % xPosIncrement);
        unit = (this._maxX - this._maxX % this.unitsPerTick);
    }
    while (xPos > 0) {
        context.moveTo(xPos, this._centerY - this.tickSize / 2);
        context.lineTo(xPos, this._centerY + this.tickSize / 2);
        context.stroke();
        context.fillText(unit, xPos, this._centerY + this.tickSize / 2 + 3);
        unit -= this.unitsPerTick;
        xPos = Math.round(xPos - xPosIncrement);
    }

    // draw right tick marks  
    if (this._minX <= 0) {
        xPos = this._centerX + xPosIncrement;
        unit = 1 * this.unitsPerTick;
    }
    else {
        xPos = -(this._minX * this._scaleX % xPosIncrement);
        unit = (this._minX - this._minX % this.unitsPerTick);
    }
    while (xPos < this.domCanvas.width) {
        context.moveTo(xPos, this._centerY - this.tickSize / 2);
        context.lineTo(xPos, this._centerY + this.tickSize / 2);
        context.stroke();
        context.fillText(unit, xPos, this._centerY + this.tickSize / 2 + 3);
        unit += this.unitsPerTick;
        xPos = Math.round(xPos + xPosIncrement);
    }
    context.restore();
};

Graph.prototype.drawYAxis = function () {
    var context = this.axisLayer.context;
    context.save();
    context.beginPath();
    context.moveTo(this._centerX, 0);
    context.lineTo(this._centerX, this.domCanvas.height);
    context.strokeStyle = this.axisColor;
    context.lineWidth = 1;
    context.stroke();

    // draw tick marks   
    var yPosIncrement = this.unitsPerTick * this._scaleY;
    var yPos, unit;
    context.font = this.font;
    context.textAlign = "right";
    context.textBaseline = "middle";

    // draw top tick marks  
    if (this._minY <= 0) {
        yPos = this._centerY - yPosIncrement;
        unit = this.unitsPerTick;
    }
    else {
        yPos = this._height + (this._minY * this._scaleY % yPosIncrement);
        unit = (this._minY - this._minY % this.unitsPerTick);
    }
    while (yPos > 0) {
        context.moveTo(this._centerX - this.tickSize / 2, yPos);
        context.lineTo(this._centerX + this.tickSize / 2, yPos);
        context.stroke();
        context.fillText(unit, this._centerX - this.tickSize / 2 - 3, yPos);
        unit += this.unitsPerTick;
        yPos = Math.round(yPos - yPosIncrement);
    }

    // draw bottom tick marks  

    if (this._maxY >= 0) {
        yPos = this._centerY + yPosIncrement;
        unit = -1 * this.unitsPerTick;
    }
    else {
        yPos = (this._maxY * this._scaleY % yPosIncrement);
        unit = (this._maxY - this._maxY % this.unitsPerTick);
    }
    while (yPos < this.domCanvas.height) {
        context.moveTo(this._centerX - this.tickSize / 2, yPos);
        context.lineTo(this._centerX + this.tickSize / 2, yPos);
        context.stroke();
        context.fillText(unit, this._centerX - this.tickSize / 2 - 3, yPos);
        unit -= this.unitsPerTick;
        yPos = Math.round(yPos + yPosIncrement);
    }
    context.restore();
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

    try {
        context.moveTo(this._minX, equation(this._minX));

        for (var x = this._minX + this._iterationX; x <= this._maxX; x += this._iterationX) {
            context.lineTo(x, equation(x));
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

Graph.prototype.drawPolEquation = function (layerIndex, equation, color, thickness) {
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
        let startFi = -Math.PI * 2;
        let r = equation(startFi);
        context.moveTo(r * Math.cos(fi), r * Math.sin(fi));

        for (var fi = startFi + step; fi <= 2 * Math.PI; fi += step) {
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