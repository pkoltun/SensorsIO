var assert = require('assert');
var util = require("util");
var sensor = require('../lib/Sensor.js');

var customState = {
    On: false
};

function CustomSensor() {
    sensor.Sensor.call(this, customState);
    this.readOnly = false;
}

util.inherits(CustomSensor, sensor.Sensor);

describe('Sensor state', function() {
    it('Event is emitted when state is changed.', function () {
        var s = new CustomSensor();
        var newState = Object.create(customState);
        var eventCalled = false;
        newState.On = true;
        s.on(s.stateChangeEventName, function (eventState) { eventCalled = true });
        s.setState(newState);
               
        assert.ok(eventCalled, "State change event was not called");
    })

    it('State is assigned with state from constructor.', function () {
        var s = new CustomSensor();
               
        assert.equal(s.getLastAvaliableState(), customState);
    })

    it('Refresh state is called before returning current state.', function () {
        var s = new CustomSensor();
        var newState = Object.create(customState);
        newState.On = true;
        newState.NewProp = "test";
        s.refreshState = function (callback) {
            this.state = newState;
            callback(null, newState);
        }
        var errorFromCallback = {};
        var stateFromCallback = {};
        s.getCurrentState(function (error, state){
            errorFromCallback = error;
            stateFromCallback = state;
            })
        assert.equal(errorFromCallback, null, "Error should be null");
        assert.equal(stateFromCallback, newState, "State should be updated in callback");
    })
})
