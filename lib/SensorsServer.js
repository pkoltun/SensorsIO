var WebSocketServer = require('ws').Server;
var url = require('url');

var getStateCommandName = 'GetState';
var setStateCommandName = 'SetState';

function SensorsServer(httpServer, port) {
    this.httpServer = httpServer;
    this.sensorsWithSocket = [];
    this.port = port;
}


SensorsServer.prototype.responseTypes = {
    lastState: 'lastState',
    stateChanged : 'stateChanged',
    error: 'error'
}

WebSocketServer.prototype.broadcast = function (data, handleSendResult) {
    for (var i in this.clients)
        this.clients[i].send(data, handleSendResult);

}

SensorsServer.prototype.addSensor = function (sensor, path, logger) {
    var that = this;
    if (!logger) {
        logger = function (message, severity) {
            console.log("%s - %s", severity, message);
        }
    }
    
    var handleSendResult = function (error) {
        if (error) {
            logger("Send error:" + error, "error");
        }
    }
    
    if (path.charAt[0] !== '/')
        path = '/' + path;
    var wss = new WebSocketServer({ server: this.httpServer, path: path });
    
    this.sensorsWithSocket.push({ sensor: sensor, webSocket: wss });
    sensor.on(sensor.stateChangeEventName, function (newState) {
        var stateChangedResponse = { responseType: that.responseTypes.stateChanged, state: newState };
        wss.broadcast(JSON.stringify(stateChangedResponse), handleSendResult);
    });
    wss.on('connection', function (ws) {
        var address = ws._socket._getpeername().address;
        
        logger('connected web socket:' + address + ':' + ws._socket._getpeername().port + path, 'debug');
        ws.on('message', function (message) {
            logger('recieved message:' + message, 'debug');
            var command = JSON.parse(message);
            switch (command.commandName) {
                case getStateCommandName:
                    var lastState = sensor.getLastAvaliableState();
                    var lastStateResponse = { responseType: that.responseTypes.lastState, state: lastState };
                    ws.send(JSON.stringify(lastStateResponse), handleSendResult);
                    logger('sending lastState for sensor path' + path, 'debug');
                    break;
                case setStateCommandName:
                    logger('set state command for sensor path recieved' + path, 'debug');
                    sensor.setState(command.newState, address);
                    break;
            }
        });
    });
}

SensorsServer.prototype.close = function () {
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        this.sensorsWithSocket[i].sensor.close();
        this.sensorsWithSocket[i].webSocket.close();
    }
}

SensorsServer.prototype.removeSensor = function (path) {
    if (path.charAt[0] !== '/')
        path = '/' + path;
    var i = 0;
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        if (this.sensorsWithSocket[i].webSocket.path === path) {
            this.sensorsWithSocket[i].sensor.close();
            this.sensorsWithSocket[i].webSocket.close();
            this.sensorsWithSocket.splice(i, 1);
            break;
        }
    }
    return false;
}

var initSensor = function (port, path, divId, sensorHandler) {
    var host = window.document.location.host.replace(/:.*/, '');
    var ws = new WebSocket('ws://' + host + ':' + port + path);
    ws.stateChanged = function (newState) { }
    ws.changeState = function (newState) {
        var setStateCommand = {
            commandName: "SetState",
            newState: newState
        }
        ws.send(JSON.stringify(setStateCommand));
    }
    ws.onmessage = function (event) {
        var response = JSON.parse(event.data);
        switch (response.responseType) {
            case'stateChanged':
                ws.stateChanged(response.state);
                break;
        }
    };
    var container = document.getElementById(divId);
    sensorHandler(ws, container);
}

SensorsServer.prototype.renderSensors = function () {
    var html = '';
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        html = html + '<div id ="sensor' + i + '">' + this.sensorsWithSocket[i].sensor.renderState() + '</div>\n';
    }
    html = html + "\n<script>\n";
    html = html + 'var initSensor =' + initSensor.toString();
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        var sensor = this.sensorsWithSocket[i].sensor;
        html = html + '\ninitSensor(' + this.port + ',"' + this.sensorsWithSocket[i].webSocket.path + '",' + '"sensor' + i + '",' + sensor.stateHandling.toString()+');';

    }
    html = html + "\n</script>";
    return html;
}

exports.Server = SensorsServer;
exports.getStateCommand = function () {
    return {
        commandName: getStateCommandName
    };
}
exports.setStateCommand = function (newState) {
    return {
        commandName: setStateCommandName,
        newState: newState
    };
}