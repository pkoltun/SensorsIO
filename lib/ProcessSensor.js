var util = require("util");
var sensor = require('./Sensor.js');
var spawn = require('child_process').spawn;

function ProcessSensorState(){
    this.on = false;
};

function ProcessSensor( state, processInfo, logger ) {
    sensor.Sensor.call(this, state, logger);
    this.readOnly = false;
    this.process = null;
    this.argsTemplate = processInfo.args.slice(0);
    this.processInfo = processInfo;
}

util.inherits(ProcessSensor, sensor.Sensor);

ProcessSensor.prototype.refreshState = function (callback) {
    callback(null, this.state);
}

ProcessSensor.prototype.updateProcessInfo = function (newState) {
    this.processInfo.args = this.argsTemplate.slice(0);
    for (var prop in newState) {
        for (var i = 0; i < this.processInfo.args.length; i++) {
            var argToReplace = '%' + prop + '%';
            if (this.processInfo.args[i]) {
                this.processInfo.args[i] = this.processInfo.args[i].replace(argToReplace, newState[prop]);
            }
        }
    }
}

ProcessSensor.prototype.turnOn = function () {
    var updatedState = that.state;
    updatedState.on = true;
    that.state = updatedState;
}

ProcessSensor.prototype.turnOff = function () {
    var updatedState = this.state;
    updatedState.on = false;
    this.state = updatedState;
}

ProcessSensor.prototype.kill = function () {
    this.process.kill();
}

ProcessSensor.prototype.changingState = function (oldState, newState, senderAddress) {
}

ProcessSensor.prototype.setState = function (newState, senderAddress, callback) {
    var that = this;
    if (!this.readOnly) {
        this.changingState(this.state, newState, senderAddress);
        var oldStateJson = JSON.stringify(this.state);
        var newStateJson = JSON.stringify(newState);
        if (oldStateJson !== newStateJson) {
            if (this.state.on && this.process) {
                this.process.removeAllListeners('close');
                that.logger('Killing process', 'INFO');
                this.kill();
                this.process = null;
            }
            
            this.state = newState;
            this.updateProcessInfo(this.state);
            if (this.state.on) {
				this.logger('Starting process: ' + this.processInfo.command + ' ' + this.processInfo.args);
                this.process = spawn(this.processInfo.command, this.processInfo.args);
                
                this.process.stdout.on('data', function (data) {
                    var message = data.toString();
                    that.logger('stdout: ' + message, 'INFO');
                });
                
                this.process.stderr.on('data', function (data) {
                    var error = data.toString();
                    that.logger('stderr: ' + error, 'ERROR');
                });
                this.process.on('close', function (code) {
                    that.logger("Process exited with code:" + code, "info");
                    that.turnOff();
                });
            }
            else if (this.process) {
                that.logger('Killing process as state changed to off', 'INFO');
                this.kill();
                this.process = null;
            }
        }
    }
}

exports.Sensor = ProcessSensor;
exports.State = ProcessSensorState;