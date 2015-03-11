var test = require('../lib/SensorsServerTest.js');
var SensorsServer = new require('../lib/SensorsServer.js');
var http = require("http");
var WebSocketServer = require('../lib/WebSocketServer.js');
var WSConnection = WebSocketServer.WSConnection;


var createServer = function ( addSensors, done) {
    server = http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Test server');
    });
    var createServer = WebSocketServer.getWSServerCreator(server);
    var sensorsServer = new SensorsServer.Server(server, serverPort, [createServer]);
    addSensors(sensorsServer);
    sensorsServer.httpServer.listen(serverPort, function () {
        done();
    });
    return sensorsServer;
}

this.createSocketServer = function (path, logger, handleMessage) {  };


var destroySensorServer = function (sensorsServer){
    sensorsServer.close();
    sensorsServer.httpServer.close();
}

var serverPort = 8091;
var serverAddress = 'ws://localhost:' + serverPort + '/';
var createConnection = function (sensorPath) {
    return new WSConnection(serverAddress, sensorPath);
}


test.generateTests(serverPort, createServer, destroySensorServer, createConnection, 1000);