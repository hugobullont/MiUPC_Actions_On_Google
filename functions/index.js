'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {
  dialogflow,
  Permission
} = require('actions-on-google');

const http = require('http');
const host = '18.221.4.160';

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
    conv.data.userName = 'name';
  } else {
    var fullName = conv.user.name.display;
    name = fullName.substr(0,fullName.indexOf(' '));
    conv.data.userName = name;
    conv.ask(`Gracias, ${name}. ¿Qué deseas saber?`);
  }
});



app.intent('MasInfoCursos', (conv,{childCurso})=>{
  
  if(childCurso = 'notas'){
    return callAPINotasPorCurso(conv.data.idCurso).then((output) => {
      console.log(output);
      var cursoName = conv.data.nameCurso;
      var saludo = `Las notas para ${cursoName} son: `;
      var mensaje = '';

      for (var i = 0; i<output.length; i++){
        var detalle = output[i].detalle;
        var valor = output[i].valor;

        if(valor!=55){
          mensaje += `En ${detalle} tienes ${valor}. `
        }
      }

      conv.close(`<speak>${saludo}${mensaje}</speak>`);
    });
  } else {
    conv.close('<speak>No hemos implementado esa opción.</speak>')
  }
});

app.intent('ClasesPendientes', (conv, params)=>{
  return callAPIClasesPendientes().then((output) => {
    console.log(output);
    if (output.hasOwnProperty('message')){
      conv.close('<speak>No tienes más clases el día de hoy.</speak>')
    } else {
      var saludo = '';
      if(conv.data.userName=='name'){
        saludo = 'Estas son tus clases pendientes para el día de hoy: '
      } else {
        saludo = `Ok ${conv.data.userName}, estas son tus clases pendientes para el día de hoy: `
      }
      var mensaje = '';
      for(var i = 0; i<output.length; i++){
        var curso = output[i].Curso.nombre;
        var salon = output[i].Clase.salon;
        var hora = output[i].Clase.horaInicio/100;
        if (i != output.length -1){
          mensaje += `A las ${hora} horas tienes ${curso} en el ${salon}. `
        } else {
          if(output.length > 1){
            mensaje += `Y a las ${hora} horas tienes ${curso} en el ${salon}. Eso es todo.`
          } else {
            mensaje += `A las ${hora} horas tienes ${curso} en el ${salon}. Eso es todo.`
          }
          
        }
        
      }
      conv.close(`<speak>${saludo}${mensaje}</speak>`);
    }
  });
});

app.intent('NotasAcumuladas', (conv, params) => {
  return callAPINotasAcumuladas().then((output) => {
    console.log(output);
    var saludo = '';
    if(conv.data.userName=='name'){
      saludo = 'Estas son tus notas acumuladas por curso: '
    } else {
      saludo = `Ok ${conv.data.userName}, estas son tus notas acumuladas por curso: `
    }
    var mensaje = '';
    console.log(output.length);
    for (var i = 0; i<output.length; i++){
      var curso = output[i].nombreCurso;
      console.log(curso);
      var porcentaje = output[i].porcentaje;
      console.log(porcentaje);
      var notaAcumulada = output[i].notaAcumulada;
      console.log(notaAcumulada)
      mensaje += `En ${curso} tienes, al ${porcentaje} por ciento, ${notaAcumulada}. `; 
      console.log(mensaje);
    }
    conv.close(`<speak>${saludo}${mensaje}</speak>`);
  });
});

// Handle the Dialogflow intent named 'ConvertirDolSol'.
// The intent collects a parameter named 'number'.
app.intent('ClaseActual', (conv,params) => {
  return callAPIClaseActual().then((output) => {
    console.log(output);
    if (output.hasOwnProperty('message')){
      conv.close('<speak>No tienes más clases el día de hoy.</speak>')
    } else {
      conv.data.idCurso = output.Curso._id;
      conv.data.nameCurso = output.Curso.nombre;
      var curso = output.Curso.nombre;
      var salon = output.Clase.salon;
      var hora = output.Clase.horaInicio/100;
      var minutos = output.Clase.horaInicio - hora*100;
      var faltas = output.Curso.faltasRestantes;

      var d = new Date();

      var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      var offset = -5;
      var local = new Date(utc + (3600000*offset));
      var hours = local.getHours();  
      var minutes = local.getMinutes();
      var hourComplete = hours*100 + minutes;
      var minutesToClass = (hora*100 - 40 - hourComplete);
      
      name = conv.data.userName;
      if(name=="name"){
        if (minutesToClass < 60){
          if(minutesToClass > 0){
            conv.ask(`<speak>En ${minutesToClass} minutos tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          } else {
            conv.ask(`<speak>Ya deberías estar en ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          } 
        } else {
          conv.ask(`<speak>A las ${hora} horas tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
        }
      } else {
        if (minutesToClass < 60){
          if(minutesToClass > 0){
            conv.ask(`<speak>${name}, en ${minutesToClass} minutos tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          } else {
            conv.ask(`<speak>${name}, ya deberías estar en ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          }
        } else {
          conv.ask(`<speak>${name}, a las ${hora} horas tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
        }
      }
    }  
  });
});

function callAPINotasPorCurso(cursoId) {
  return new Promise((resolve,reject) =>{
    let path = "/notas/"+cursoId;
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

function callAPINotasAcumuladas() {
  return new Promise((resolve, reject) =>{
    let path = "/notasAcumuladas";
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

function callAPIClasesPendientes() {
  return new Promise((resolve, reject) => {
    var d = new Date();

    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var offset = -5;
    var local = new Date(utc + (3600000*offset));
    var hours = local.getHours();
    console.log(hours);
    var minutes = local.getMinutes();
    console.log(minutes);

    var days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sábado'];
    var dayName = days[local.getDay()];
    var urlHour = hours*100 + minutes;

    let path = "/clasesPendientes/" + dayName + "/" + urlHour.toString();
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

    var days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sábado'];
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
