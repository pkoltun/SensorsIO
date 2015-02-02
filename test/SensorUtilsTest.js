var assert = require('assert');
var util = require("util");
var http = require("http");
var sensor = require('../lib/Sensor.js');
var sensorUtils = require('../lib/SensorUtils');
var SensorsServer = new require('../lib/SensorsServer.js');
var WebSocket = require('ws');
var Server = SensorsServer.Server;
var serverPort = 8085;
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
var sensorOne = new CustomSensor();
var sensorTwo = new CustomSensor();

describe('Sensor utils tests', function () {
    before(function (done) {
        server = http.createServer(function (req, res) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Test server');
        });
        
        sensorsServer = new Server(server);
        
        sensorsServer.addSensor(sensorOne, 'sensor');
        sensorsServer.addSensor(sensorTwo, 'sensor2');
        
        server.listen(serverPort, function () {
            done();
        });

    })
    

    it('Last avaliable state is get after connection', function (done) {
        this.timeout(1000);
        var connection = new sensorUtils.SensorConnection(serverAddress + 'sensor');
        connection.connect(function (error) {
            if (error) {
                done(error);
            }
            else {
                assert.equal(connection.state.on, sensorOne.state.on);
                assert.equal(connection.state.name, sensorOne.state.name);
                done();
            }
        });
    })
    
    it('State changed method is executed for changed state', function (done) {
        this.timeout(1000);
        var newState = {
            on: true,
            name: "two"
        };
        var connection = new sensorUtils.SensorConnection(serverAddress + 'sensor2');
        connection.stateChanged = function (oldState, state) {
            assert.notEqual(oldState.on, state.on);
            assert.notEqual(oldState.name, state.name);
            assert.equal(connection.state.on, newState.on);
            assert.equal(connection.state.name, newState.name);
            done();
        }
        connection.connect(function () {
            sensorTwo.setState(newState);
        });
    })
    
    it('Connection can change sensor state', function (done) {
        this.timeout(1000);
        var newState = {
            on: true,
            name: "oneChange"
        };
        var connection = new sensorUtils.SensorConnection(serverAddress + 'sensor');
        sensorOne.on(sensorOne.stateChangeEventName, function (state) {
            assert.equal(state.on, newState.on);
            assert.equal(state.name, newState.name);
            done();
        });
        
        connection.connect(function () {
            connection.state = newState;
        });
    })

    after(function () {
        sensorsServer.close();
        server.close();
    })

})
