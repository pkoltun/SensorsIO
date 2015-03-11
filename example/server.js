var util = require("util");
var http = require("http");
var sensor = require('../lib/Sensor.js');
var SensorsServer = new require('../lib/SensorsServer.js');
var WebSocketServer = require('../lib/WebSocketServer.js');

var httpServer = new WebSocketServer.WSSensorsHttpServer();

var port = process.env.port || 1337;
var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    var html = "<html>\n"
    html = html + httpServer.connectionScript;
    html = html + "\n<body>\n";
    html = html + sensorsServer.renderSensors(httpServer);
    html = html + " </body></html>\n";
    res.end(html);
});

function CustomSensor() {
    var customState = {
        on: false,
        name: "None"
    };

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

changingSensor.name = "Sensor with server state updates";
sensorWithMessage.name = "Same sensor with 2 different paths";

sensorsServer.addSensor(changingSensor, 'modifyStateTest');
sensorsServer.addSensor(sensorWithMessage, 'modifyStateWithMessageTest');
sensorsServer.addSensor(sensorWithMessage, 'copySensor');
        
server.listen(port);