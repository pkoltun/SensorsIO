var assert = require('assert');
var util = require("util");
var processSensor = require('../lib/ProcessSensor.js');
var sensorUtils = require('../lib/SensorUtils');
var os = require("os");

function State(){
    this.on = false;
    this.stateProp = null;
    this.stateProp2 = null;
    } 

describe('Process sensor test', function() {
    it('On state change to running process is started and closed when finished', function (done) {
        var pingTimeout = '1';
        //On linux timeout is in sec, but on windows it's ms
        if (os.type() === 'Windows_NT') {
            pingTimeout = '1200';
        }
        this.timeout(2500);
        var startDate = new Date().getTime();
        var processInfo = {
            command: "ping",
            args: ["1.1.1.1","-n","1","-w",pingTimeout]
        };

        var state = new processSensor.State();
        var sensor = new processSensor.Sensor(state, processInfo);
        var newState = new processSensor.State();
        newState.on = true;
         sensor.setState(newState);
        var lastAvaliable = sensor.getLastAvaliableState();
        assert.ok( sensorUtils.compareStates( newState, lastAvaliable));
        sensor.on(sensor.stateChangeEventName, function (eventState) {
            var endDate = new Date().getTime();
            assert.equal((endDate - startDate) > 600, true);
            changedState = eventState;
            assert.equal(changedState.on, false);
            done();
        });
    })

    it('On the state change process info arguments are replace with values from state.', function () {
        var startDate = new Date().getTime();
        var processInfo = {
            command: "ping",
            args: ["%stateProp%","%stateProp% test - %stateProp2%","stateProp"]
        };
        
        var state = new State();
        var sensor = new processSensor.Sensor(state, processInfo);
        var newState = new processSensor.State();
        newState.on = false;
        newState.stateProp = "abc";
        newState.stateProp2 = "efg";
        sensor.setState(newState);
        var lastAvaliable = sensor.getLastAvaliableState();
        assert.ok(sensorUtils.compareStates(newState, lastAvaliable));
        assert.equal(sensor.processInfo.args[0], "abc");
        assert.equal(sensor.processInfo.args[1], "abc test - efg");
        assert.equal(sensor.processInfo.args[2], "stateProp");
    })
    
    it('On the second state change process info arguments are replace with values from new state.', function () {
        var startDate = new Date().getTime();
        var processInfo = {
            command: "ping",
            args: ["%stateProp%", "%stateProp% test - %stateProp2%", "stateProp"]
        };
        
        var state = new State();
        var sensor = new processSensor.Sensor(state, processInfo);
        var newState = new processSensor.State();
        newState.on = false;
        newState.stateProp = "bca";
        newState.stateProp2 = "fge";
        sensor.setState(newState);
        
        var newState2 = new processSensor.State();
        newState2.on = false;
        newState2.stateProp = "abc";
        newState2.stateProp2 = "efg";
        sensor.setState(newState2);
        var lastAvaliable = sensor.getLastAvaliableState();
        assert.ok(sensorUtils.compareStates(newState2, lastAvaliable));
        assert.equal(sensor.processInfo.args[0], "abc");
        assert.equal(sensor.processInfo.args[1], "abc test - efg");
        assert.equal(sensor.processInfo.args[2], "stateProp");
    })  
})
    