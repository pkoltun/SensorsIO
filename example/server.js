var util = require("util");
var http = require("http");
var sensor = require('../lib/Sensor.js');
var SensorsServer = new require('../lib/SensorsServer.js');

var port = process.env.port || 1337;
var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    var html = "<html> <body>\n";
    var html = html + sensorsServer.renderSensors();
    var html = html + " </body></html>\n";
    res.end(html);
});

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

sensorsServer = new SensorsServer.Server(server, port);

var changingSensor = new CustomSensor();

var changeState = function () {
    var lastState = changingSensor.getLastAvaliableState();
    var newState = {
        on: !lastState.on,
        name: lastState.name + 'HH'
    }
    changingSensor.setState(newState);
}

setInterval(changeState, 1500);

var sensorWithMessage = new CustomSensor();

sensorWithMessage.name = "withMessage";

sensorsServer.addSensor(changingSensor, 'modifyStateTest');
sensorsServer.addSensor(sensorWithMessage, 'modifyStateWithMessageTest');
sensorsServer.addSensor(sensorWithMessage, 'copySensor');
        
server.listen(port);