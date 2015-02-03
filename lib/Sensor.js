var util = require("util");
var events = require("events");
var querystring = require("querystring");

function Sensor(startState, logger) {
    this._state = startState;
    var that = this;
    events.EventEmitter.call(this);
    this.readOnly = true;
    this.stateChangeEventName = "stateChanged";
    if (!logger) {
        this.logger = function (message, severity) {
            console.log("%s - %s", severity, message);
        }
    }
    else {
        this.logger = logger;
    }
    
}

util.inherits(Sensor, events.EventEmitter);

Object.defineProperty(Sensor.prototype, "state", {
    get: function get() {
        return this._state;
    },
    set: function set(state) {
        
        for (var prop in this._state) {
            if (state.hasOwnProperty(prop) && this._state.hasOwnProperty(prop) ) {
                this._state[prop] = state[prop];
            }
        }
        this.logger("State changed to: " + JSON.stringify(this._state), "DEBUG");
        this.emitStateChangedEvent();
    }
});

Sensor.prototype.emitStateChangedEvent = function () {
    this.emit(this.stateChangeEventName, this._state);
}

Sensor.prototype.getStateClone = function () {
    return JSON.parse(JSON.stringify(this.state));
}

Sensor.prototype.close = function () {
}

Sensor.prototype.getLastAvaliableState = function () {
    return this.state;
}

Sensor.prototype.refreshState = function (callback) {
    callback(null, this.state);
}

Sensor.prototype.getCurrentState = function (callback) {
    this.refreshState(function (error, newState) {
        callback(error, newState);
    });
}


Sensor.prototype.setState = function (newState, senderAddress, callback) {
    if (!this.readOnly) {
        this.state = newState;
    }
}

exports.Sensor = Sensor;