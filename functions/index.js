'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {
  dialogflow,
  Permission
} = require('actions-on-google');

const http = require('http');
const host = '18.221.4.160';

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({debug: true});

var name = "name";

// Handle the Dialogflow intent named 'Bienveida'.
// The intent collects a parameter named 'color'.
app.intent('Bienvenida', (conv) => {
  conv.ask(new Permission({
    context: 'Hola, para tener una mejor comunicación',
    permissions: 'NAME'
  }));
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
app.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
  if (!permissionGranted) {
    conv.ask(`Ok, no hay problema. ¿Qué deseas saber?`);
  } else {
    conv.data.userName = conv.user.name.display;
    name = conv.user.name.display;
    conv.ask(`Gracias, ${conv.data.userName}. ¿Qué deseas saber?`);
  }
});

// Handle the Dialogflow intent named 'ConvertirDolSol'.
// The intent collects a parameter named 'number'.
app.intent('ClaseActual', (conv,params) => {
  return callAPIClaseActual().then((output) => {
    console.log(output);
    if (output.hasOwnProperty('message')){
      conv.close('<speak>No tienes más clases el día de hoy.</speak>')
    } else {
      var curso = output.Curso.nombre;
      var salon = output.Clase.salon;
      var hora = output.Clase.horaInicio/100;
      var minutos = output.Clase.horaInicio - hora*100;
      var faltas = output.Curso.faltasRestantes;
      if(name=="name"){
        conv.close(`<speak>A las ${hora} horas tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis></speak>`);
      } else {
        conv.close(`<speak>${name}, a las ${hora} horas tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis></speak>`);
      }

    }
    

    
});
});

function callAPIClaseActual() {
  return new Promise((resolve, reject) =>{
    var d = new Date();

    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var offset = -5;
    var local = new Date(utc + (3600000*offset));
    var hours = local.getHours();
    console.log(hours);
    var minutes = local.getMinutes();
    console.log(minutes);

    var days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    var dayName = days[local.getDay()];
    var urlHour = hours*100 + minutes;

    let path = "/clases/" + dayName + "/" + urlHour.toString();
    console.log(path);
    var respa = encodeURI(path);

    http.get({host: host, path: respa}, (res) => {
        let body = '';
        res.on('data', (d) => { body += d; }); // store each response chunk
              res.on('end', () => {
                  // After all the data has been received parse the JSON for desired data
                  let response = JSON.parse(body);
                  let output = response;

                  //copy required response attributes to output here
                  resolve(output);
      });
      res.on('error', (error) => {
        console.log(`Error calling the API: ${error}`)
        reject();
      });
    });
  });
}

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
