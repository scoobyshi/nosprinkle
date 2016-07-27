var request = require("request");
var config = require('./config');
var email = require('./lib/mailer');
var Gpio = require('onoff').Gpio;
var sprinkler = new Gpio(config.sprinkler.pin, config.sprinkler.status);

function check_status(weather, period) {
  var today_accumulation = parseFloat(weather.current_observation.precip_today_metric);
  var yesterday = parseFloat(weather.history.dailysummary[0].precipm);
  var today_forecast = parseFloat(weather.forecast.simpleforecast.forecastday[period].qpf_allday.mm);
  var total_24hour = yesterday + today_accumulation + today_forecast;

  // obj.value = parseFloat( obj.value ).toFixed( 2 )

  console.log("Forecast (Date): ", weather.forecast.simpleforecast.forecastday[period].date.pretty);
  console.log("Forecast POP (%): ", weather.forecast.simpleforecast.forecastday[period].pop);
  console.log("Forecast Rain (mm): ", today_forecast);
  console.log("Forecast Period: ", weather.forecast.simpleforecast.forecastday[period].period);
  console.log("Accumulation Today (mm): ", today_accumulation);
  console.log("Yesterday (Date): ", weather.history.date.pretty, " Rain (mm): ", yesterday);
  console.log("Total for 24 hours: ", total_24hour);

  return total_24hour;
}

request({
  uri: "http://api.wunderground.com/api/" + config.api.key + "/yesterday/conditions/forecast/q/Canada/Georgina.json",
  method: "GET",
  timeout: 10000
}, function(error, response, body) {
  // Check for errors eg API down
  // Write to Mongo for later, check for 504 and retry?
  var weather_data = JSON.parse(body);
  var period = 0; // 0 = Period 1 (Today), 1 = Period 2 (Tomorrow)
  var rain = check_status(weather_data, period);

  // Threshold is 10mm or Check for 25 mm which is about 1 inch, recommended for daily watering
  // Trigger override on sprinkler system, if override, send email; Add tracking in Google Analytics or Initial State?
  if (rain > 5) {
    setTimeout(function() {
      sprinkler.write(1);
    },3600000);  // After 1 hour return the sprinkler to normal operation
    sprinkler.write(0); // Disable the sprinkler by pulling the pin low which triggers the relay to interrupt the ground and break the circuit

    console.log("No Sprinkling Today!");
    email.sendMail("No Sprinkling Today!", '');
  }
});

