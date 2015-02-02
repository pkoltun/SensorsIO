var WebSocket = require('ws');

function SensorConnection(address) {
    this._state = null;
    this._connectionTimeout = null;
    this.address = address;
    this.ws = null;
    this.timeout = null;
    this.connected = false;
}

SensorConnection.prototype.connect = function (callback) {
    this.ws = createWebSocketConnection(this.address)
    var terminateConnection = function () {
        that.ws.terminate();
        callback("Connection timeout");
    }
    if (this.timeout) {
        this._connectionTimeout = setTimeout(terminateConnection, this.timeout);
    }
    var that = this;
    this.ws.onconnected = function (state) {
        if ( that._connectionTimeout ) {
            clearTimeout(that._connectionTimeout);
        }
        that.connected = true;
        //We don't want to change state in case we recieved stateChanged before this event
        if (!that.state)
            that._state = state;
        if (callback)
            callback(null);
    }
        this.ws.stateChanged = function (newState) {
        var oldState = that._state;
        that._state = newState;
        that.stateChanged(oldState,newState);
    }
}

SensorConnection.prototype.disconnect = function () {
    if (this.ws) {
        this.ws.close();
    }
}

SensorConnection.prototype.stateChanged = function (oldState, newState) {
}

Object.defineProperty(SensorConnection.prototype, "state", {
    get: function get() {
        return this._state;
    },
    set: function set(state){
         this.ws.changeState(state);
        }
});


SensorConnection.prototype.disconnected = function () {
}

function createWebSocketConnection(address) {
    var ws = new WebSocket(address);
    
    ws.initialized = false;
    ws.onconnected = function () {
    }
    ws.requestLastState = function () {
        var getStateCommand = {
            commandName: 'GetState'
        };
        ws.send(JSON.stringify(getStateCommand));
    }
    
    ws.changeState = function (newState) {
        var setStateCommand = {
            commandName: "SetState",
            newState: newState
        }
        ws.send(JSON.stringify(setStateCommand));
    }
    
    ws.lastState = function (lastState) {
    }
    
    ws.stateChanged = function (newState) {
    }

    ws.onopen = function () {
        this.requestLastState();
    };
    
    ws.onerror = function (error) {

    }
    
    ws.onmessage = function (event) {
        var response = JSON.parse(event.data);
        switch (response.responseType) {
            case 'stateChanged':
                this.initialized = true;
                this.stateChanged(response.state);
                break;
            case 'lastState':
                this.lastState(response.state);
                if (!this.initialized) {
                    this.initialized = true;
                    this.onconnected(response.state);
                }
                break;
        }
    }
    return ws;
}

var copyStateProperties = function (stateFrom, stateTo, properties) {
    var modified = false;
    for (var i = 0; i < properties.length; i++) {
        if (stateFrom[properties[i]] !== stateTo[properties[i]]) {
            modified = true;
            stateTo[properties[i]] = stateFrom[properties[i]];
        }
    }
    return modified;
}

var changingState = function (oldState, newState, bindProperties) {
    var that = this;
    if (oldState.sensorAddress !== newState.sensorAddress) {
        if (this.sensorConnection) {
            this.sensorConnection.disconnect();
            this.sensorConnection = null;
        }
        this.sensorConnection = new SensorConnection(newState.sensorAddress);
        this.sensorConnection.connect(function (error) {
            if (error) {
                that.logger("Unable to connect to sensor", "ERROR");
            }
            else {
                that.logger("Connected to sensor", "INFO");
                var stateClone = JSON.parse(JSON.stringify(that.sensorConnection.state));
                
                if (copyStateProperties(that.state, stateClone, bindProperties)) {
                    that.logger("Changing connected sensor status", "INFO");
                    that.sensorConnection.state = stateClone;
                }
                that.sensorConnection.stateChanged = function (oldState, nextState) {
                    that.logger("Connected sensor status changed ", "INFO");
                    var sensorStateClone = that.getStateClone();
                    if (copyStateProperties(nextState, sensorStateClone, bindProperties )) {
                        that.logger("Changing sensor status", "INFO");
                        that.setState(sensorStateClone);
                    }
                }
            }
        });
    }
    else {
        if (this.sensorConnection && this.sensorConnection.connected) {
            var stateClone = JSON.parse(JSON.stringify(this.sensorConnection.state));
            if (copyStateProperties(newState, stateClone, bindProperties)) {
                this.logger("Changing connected sensor status", "INFO");
                this.sensorConnection.state = stateClone;
            }
        }
    }
}

function compareStates(expectedState, actualState){
    for (var prop in expectedState) {
        if (expectedState.hasOwnProperty(prop)) {
            if (!actualState.hasOwnProperty(prop)) {
                return false;
            }
            else {
                if (expectedState[prop] !== actualState[prop]) {
                    return false;
                }
            }
        } 
    }
    return true;
}

exports.SensorConnection = SensorConnection;
exports.changingState = changingState;
exports.compareStates = compareStates;