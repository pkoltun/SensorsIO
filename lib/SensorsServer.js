var WebSocketServer = require('./WebSocketServer.js');
var url = require('url');
var util = require("util");

var WSSensorsHttpServer = WebSocketServer.WSSensorsHttpServer;

var getStateCommandName = 'GetState';
var setStateCommandName = 'SetState';
var authorizeCommandName = 'SetState';

function SensorsServer(httpServer, port, socketCreators ) {
    var that = this;
    this.httpServer = httpServer;
    this.sensorsWithSocket = [];
    this.port = port;
    this.socketCreators = socketCreators;
}

SensorsServer.prototype.responseTypes = {
    lastState: 'lastState',
    stateChanged : 'stateChanged',
    error: 'error'
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
    
    
    var handleMessage = function (message, address, sendResponse){
        switch (message.commandName) {
            case getStateCommandName:     
                var lastState = sensor.getLastAvaliableState();
                var lastStateResponse = { responseType: that.responseTypes.lastState, state: lastState };
                sendResponse(lastStateResponse);
                logger('sending lastState for sensor path' + path, 'debug');
                break;
            case setStateCommandName:
                logger('set state command for sensor path recieved' + path, 'debug');
                sensor.setState(message.newState, address);
                break;
            case authorizeCommandName:
                authorize(true);
                var authorizedResponse = { authorized: true };
                sendResponse(JSON.stringify(authorizedResponse));
                break;
            default:
                logger('recieved unknown command:' + message, 'debug');
        }
    }

    var sockets = this.socketCreators.map(function (creator) { return creator(path, logger, handleMessage) });
    
    this.sensorsWithSocket.push({ sensor: sensor, webSocket: sockets, path:path });
    sensor.on(sensor.stateChangeEventName, function (newState) {
        var stateChangedResponse = { responseType: that.responseTypes.stateChanged, state: newState };
        sockets.map(function (socket) { socket.broadcastToAuthorized(stateChangedResponse, handleSendResult); });
    });
}

SensorsServer.prototype.close = function () {
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        this.sensorsWithSocket[i].sensor.close();
        this.sensorsWithSocket[i].webSocket.map(function (socket) { socket.close(); });
    }
}

SensorsServer.prototype.removeSensor = function (path) {
    if (path.charAt[0] !== '/')
        path = '/' + path;
    var i = 0;
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        if (this.sensorsWithSocket[i].path === path) {
            this.sensorsWithSocket[i].sensor.close();
            this.sensorsWithSocket[i].webSocket.map(function (socket) { socket.close(); });
            this.sensorsWithSocket.splice(i, 1);
            break;
        }
    }
    return false;
}


SensorsServer.prototype.renderSensors = function ( sensorsHttpServer ) {
    var html = '';
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        html = html + '<div id ="sensor' + i + '">' + sensorsHttpServer.renderSensorState(this.sensorsWithSocket[i].sensor) + '</div>\n';
    }
    html = html + "\n<script>\n";
  
    for (i = 0 ; i < this.sensorsWithSocket.length; i++) {
        var sensor = this.sensorsWithSocket[i].sensor;
        html = html + '\ninitSensor(' + this.port + ',"' + this.sensorsWithSocket[i].path + '",' + '"sensor' + i + '");';

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