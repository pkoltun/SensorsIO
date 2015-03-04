var assert = require('assert');
var util = require("util");
var http = require("http");
var sensor = require('../lib/Sensor.js');
var SensorsServer = new require('../lib/SensorsServer.js');

var customState = {
    on: false,
    name: "None"
};

function CustomSensor() {
    sensor.Sensor.call(this, customState);
    this.readOnly = false;
}

util.inherits(CustomSensor, sensor.Sensor);



function generateTests(serverPort, createSensorServer, destroySensorServer, createConnection, initialization, timeoutMs ) {
    
    var sensorState = {};
    var sensorsServer = null;
    var server = null;
    var ws = null;
    
    describe('Sensor server', function () {
        before(function (done) {
            var addSensors = function (sensorsServer) {
                sensorsServer.addSensor(new CustomSensor(), 'lastAvaliableStateTest');
                sensorsServer.addSensor(new CustomSensor(), 'modifyStateTest');
                sensorsServer.addSensor(new CustomSensor(), 'modifyStateWithMessageTest');
            }            
            sensorsServer = createSensorServer(addSensors, done);
            
            

        })
        
        it('Last avaliable state is returned', function (done) {
            this.timeout(timeoutMs);
            ws = createConnection( 'lastAvaliableStateTest');
            
            ws.on('open', function () {
                ws.on('message', function (response, flags) {
                    
                    assert.equal(response.responseType, sensorsServer.responseTypes.lastState);
                    expectedStateJSON = JSON.stringify(customState);
                    assert.equal(JSON.stringify(response.state), expectedStateJSON);
                    
                    done();
                })
                ws.send(SensorsServer.getStateCommand());
            });
        
        })
        
        it('State change message is sent', function (done) {
            this.timeout(timeoutMs);
            ws = createConnection( 'modifyStateTest');
            var sensor = sensorsServer.sensorsWithSocket[1].sensor;
            ws.on('open', function () {
                var newState = Object.create(customState);
                newState.on = true;
                newState.name = "modified";
                ws.on('message', function (response, flags) {
                    assert.equal(response.responseType, sensorsServer.responseTypes.stateChanged);
                    expectedStateJSON = JSON.stringify(newState);
                    assert.equal(JSON.stringify(response.state), expectedStateJSON);
                    
                    done();
                })
                sensor.setState(newState);
            
            });
        })
        
        it('State change message after sending state change command', function (done) {
            this.timeout(timeoutMs);
            ws = createConnection( 'modifyStateWithMessageTest');
            ws.on('open', function () {
                var newState = Object.create(customState);
                newState.on = true;
                newState.name = "modifiedWithMessage";
                ws.on('message', function (response, flags) {
                    
                    assert.equal(response.responseType, sensorsServer.responseTypes.stateChanged);
                    expectedStateJSON = JSON.stringify(newState);
                    assert.equal(JSON.stringify(response.state), expectedStateJSON);
                    done();
                })
                ws.send(SensorsServer.setStateCommand(newState));
            
            });
        })
        
        
        after(function () {
            ws.close();
            destroySensorServer(sensorsServer);
        })
    })
}

exports.generateTests  = generateTests;