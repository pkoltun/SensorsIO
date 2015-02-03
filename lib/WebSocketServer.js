﻿var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;
var url = require('url');
var events = require('events');
var util = require("util");

function WSServer(httpServer, path, logger, handleMessage) {
    var wss = new WebSocketServer({ server: httpServer, path: path });
    var handleSendResult = function (error) {
        if (error) {
            logger("Send error:" + error, "error");
        }
    }
    
    wss.on('connection', function (ws) {
        var address = ws._socket._getpeername().address;
        
        logger('connected web socket:' + address + ':' + ws._socket._getpeername().port + path, 'debug');
        ws.on('message', function (message) {
            var sendResponse = function (response) {
                ws.send(response, handleSendResult);
            }
            handleMessage(message, address, sendResponse);
        });
    });
    
    this.broadcast = function (data, handleSendResult) {
        for (var i in wss.clients)
            wss.clients[i].send(data, handleSendResult);
    }
    
    this.close = function () {
        wss.close();
    }

    this.path = path;
}

function WSConnection(address) {
    var that = this;
    var ws = new WebSocket(address);
    ws.on('open', function () {
        ws.on('message', function (data, flags) {
            that.emit('message', data, flags);
        })
        that.emit('open');
    });
    this.close = function (code, data) {
        ws.close(code, data);
    }
    this.send = function (data, errorCallback) {
        ws.send(data, errorCallback);
    }
}

util.inherits(WSConnection, events.EventEmitter);

function WSSensorsHttpServer( options ) {
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
                case 'stateChanged':
                    ws.stateChanged(response.state);
                    break;
            }
        };
        var container = document.getElementById(divId);
        sensorHandler(ws, container);
    }
    
    var stateHandling = function (ws, container) {
        var sendButton = container.getElementsByTagName("button")[0];
        var input = container.getElementsByTagName("input")[0];
        sendButton.onclick = function () {
            ws.changeState(JSON.parse(input.value));
        }
        ws.stateChanged = function (newState) {
            input.value = JSON.stringify(newState);

        }
    }
    
    options = options || {};
    
    if (typeof options.scriptFile === "undefined") {
        this.connectionScript = "<script>\nvar initSensor =" + initSensor.toString() + "\nvar handleState =" + stateHandling.toString() + "\n</script>";

    }
    else {
        this.connectionScript = "<script type='text/javascript' src='" + options.scriptFile + "'></script>";
    }
    
    this.renderSensorState = function (sensor) {
        return "<input value='" + JSON.stringify(sensor.getLastAvaliableState()) + "'/><button type='button'>Update</button>";
    }
}

exports.WSServer = WSServer;
exports.WSConnection = WSConnection;
exports.WSSensorsHttpServer = WSSensorsHttpServer;