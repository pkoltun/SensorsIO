var assert = require('assert');
var util = require("util");
var http = require("http");
var sensor = require('../lib/Sensor.js');
var SensorsServer = new require('../lib/SensorsServer.js');
var WebSocket = require('ws');
var Server = SensorsServer.Server;
var serverPort = 8082;
var serverAddress = 'ws://localhost:' + serverPort + '/';

var customState = {
    on: false,
    name: "None"
};

function CustomSensor() {
    sensor.Sensor.call(this, customState);
    this.readOnly = false;
}

util.inherits(CustomSensor, sensor.Sensor);


var sensorState = {};
var sensorsServer = null;
var server = null;

describe('Sensor server', function () {
    before(function (done){
            server = http.createServer(function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Test server');
        });
        
        sensorsServer = new Server(server);
        
        sensorsServer.addSensor(new CustomSensor(), 'lastAvaliableStateTest');
        sensorsServer.addSensor(new CustomSensor(), 'modifyStateTest');
        sensorsServer.addSensor(new CustomSensor(), 'modifyStateWithMessageTest');
        
        server.listen(serverPort, function () {
            done();
        });

    })
    
    it('Last avaliable state is returned', function (done) {
        this.timeout(1000);
        var ws = new WebSocket(serverAddress + 'lastAvaliableStateTest' );
        
        ws.on('open', function () {
            ws.on('message', function (data, flags) {
                var response = JSON.parse(data);
                assert.equal(response.responseType, sensorsServer.responseTypes.lastState);
                expectedStateJSON = JSON.stringify(customState);
                assert.equal(JSON.stringify(response.state), expectedStateJSON);
                done();
            })
            ws.send(JSON.stringify(SensorsServer.getStateCommand()));
        });
        
    })
    
    it('State change message is sent', function (done) {
        this.timeout(1000);
        var ws = new WebSocket(serverAddress + 'modifyStateTest');
        var sensor = sensorsServer.sensorsWithSocket[1].sensor;
        ws.on('open', function () {
            var newState = Object.create(customState);
            newState.on = true;
            newState.name = "modified";
            ws.on('message', function (data, flags) {
                var response = JSON.parse(data);
                assert.equal(response.responseType, sensorsServer.responseTypes.stateChanged);
                expectedStateJSON = JSON.stringify(newState);
                assert.equal(JSON.stringify(response.state), expectedStateJSON);
                done();
            })
            sensor.setState(newState);
            
        });  
    })
    
    it('State change message after sending state change command', function (done) {
        this.timeout(1000);
        var ws = new WebSocket(serverAddress + 'modifyStateWithMessageTest');
        ws.on('open', function () {
            var newState = Object.create(customState);
            newState.on = true;
            newState.name = "modifiedWithMessage";
            ws.on('message', function (data, flags) {
                var response = JSON.parse(data);
                assert.equal(response.responseType, sensorsServer.responseTypes.stateChanged);
                expectedStateJSON = JSON.stringify(newState);
                assert.equal(JSON.stringify(response.state), expectedStateJSON);
                done();
            })
            ws.send(JSON.stringify(SensorsServer.setStateCommand(newState)));
            
        });
    })


    after(function () {
        sensorsServer.close();
        server.close();
    })
})


