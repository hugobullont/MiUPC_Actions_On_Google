'use strict';

// Import the Dialogflow module from the Actions on Google client library.
const {
  dialogflow/*,
  Permission*/
} = require('actions-on-google');

const http = require('http');
const host = '18.219.108.219';

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({debug: true});

//De "17" convertir a "5 de la tarde", "20" a "8 de la noche", "8" a "8 de la mañana" ... etc
function numberHourToString(numberHour){
  //  Las partes del día se dividen en: 
  //    Mañana    : de [6am a 12[
  //    Tarde     : de [12pm a 19[
  //    Noche     : de [19pm a 24[
  //    Madrugada : de [24am a 6[
  var stringHour;
  switch(numberHour != null)
  {
    case (numberHour < 12):
        stringHour = numberHour + " de la mañana";
        break;
    case (numberHour == 12):
      stringHour = (numberHour) + " de la tarde";
        break;
    case (numberHour >= 12 && numberHour < 19):
      if(numberHour-12 == 1){
        stringHour = "una de la tarde";
      } else {
        stringHour = (numberHour-12) + " de la tarde";
      }
        break;
    case (numberHour >= 19 && numberHour <= 24):
        stringHour = (numberHour-12) + " de la noche";
        break;
  }
  return stringHour;
}

// de "5 de la tarde" a "17" ... etc
function stringToNumber(stringHour){
  var numberHour;
  var arrayDeStringHour = stringHour.split(" ");
  var stringHourToInt = parseInt(arrayDeStringHour[0]);
  switch(stringHourToInt != 0)
  {
    case (	(stringHourToInt < 12 && arrayDeStringHour[3]=="mañana") || 
			(stringHourToInt == 12 && arrayDeStringHour[3]=="tarde")):
      numberHour = stringHourToInt;
        break;
    case (	(stringHourToInt < 12 && arrayDeStringHour[3] == "tarde" || arrayDeStringHour[3] == "noche") || 
			(stringHourToInt == 12 && arrayDeStringHour[3]=="noche")):
      numberHour = stringHourToInt + 12;
        break;
  }
  return numberHour;
}

// Handle the Dialogflow intent named 'Bienveida'.
// The intent collects a parameter named 'color'.
app.intent('Bienvenida', (conv) => {
  const name = "Alfredo";
  conv.ask(`Hola ${name}, estas son las acciones que puedes pedir: "¿Qué clase tengo ahora?", "¿Cuáles son mis clases pendientes de hoy?", "¿Cuáles son mis promedios acumulados?", "Reserva una computadora." `);
  /*conv.ask(new Permission({
    context: 'Hola, para tener una mejor comunicación',
    permissions: 'NAME'
  }));*/
});

// Handle the Dialogflow intent named 'actions_intent_PERMISSION'. If user
// agreed to PERMISSION prompt, then boolean value 'permissionGranted' is true.
/*
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
*/


app.intent('MasInfoCursos', (conv,{childCurso})=>{
  const name = "Alfredo";
  var cursoName = conv.data.nameCurso;

  if(childCurso == 'notas'){
    return callAPINotasPorCurso(conv.data.idCurso).then((output) => {
      console.log(output);
      
      var saludo = `Las notas para ${cursoName} son las siguientes: `;
      var mensaje = '';

      for (var i = 0; i<output.length; i++){
        var detalle = output[i].detalle;
        var valor = output[i].valor;

        if(valor!=55){
          mensaje += `En ${detalle} tienes ${valor}. `
        }
      }

      conv.ask(`<speak>${saludo}${mensaje} ¿Deseas hacer otra cosa?</speak>`);
    });
  } 

  if(childCurso == 'promedio'){
    return callAPINotasAcumuladas().then((output) => {
      console.log(output);
      var promedioCurso;
      for (var i = 0; i<output.length; i++){
        if(output[i].nombreCurso == cursoName){
          promedioCurso = output[i];
        }
      }
      var saludo = `El promedio para ${cursoName}, `;
      var mensaje = `al ${promedioCurso.porcentaje} por ciento, es ${promedioCurso.notaAcumulada}.`;
      conv.ask(`<speak>${saludo}${mensaje} ¿Deseas hacer otra cosa?</speak>`);
    });
  }

});

app.intent('ClasesPendientes', (conv, params)=>{
  const name = "Alfredo";
  return callAPIClasesPendientes().then((output) => {
    console.log(output);
    if (output.hasOwnProperty('message')){
      conv.ask('<speak>No tienes más clases el día de hoy. ¿Deseas hacer otra cosa?</speak>')
    } else {
      var saludo = '';
      if(name=='name'){
        saludo = 'Estas son tus clases pendientes para el día de hoy: '
      } else {
        saludo = `Ok ${name}, estas son tus clases pendientes para el día de hoy: `
      }
      var mensaje = '';

      var cursosEnOrden = output;

      console.log(output);
      cursosEnOrden.sort(function(a, b){
        var x = a;
        var y = b;
        if (x.Clase.horaInicio < y.Clase.horaInicio) {return -1;}
        if (x.Clase.horaInicio > y.Clase.horaInicio) {return 1;}
        return 0;
    });

      console.log(cursosEnOrden);
      for(var i = 0; i<cursosEnOrden.length; i++){
        var curso = cursosEnOrden[i].Curso.nombre;
        var salon = cursosEnOrden[i].Clase.salon;
        var hora = cursosEnOrden[i].Clase.horaInicio/100;
        var horaString = numberHourToString(hora);
        if (i != cursosEnOrden.length -1){
          if(hora != 13){
            mensaje += `A las ${horaString} tienes ${curso} en el ${salon}. `
          } else {
            mensaje += `A la ${horaString} tienes ${curso} en el ${salon}. `
          }
          
        } else {
          if(cursosEnOrden.length > 1){
            if(hora != 13){
              mensaje += `Y a las ${horaString} tienes ${curso} en el ${salon}. Eso es todo.`
            } else {
              mensaje += `Y a la ${horaString} tienes ${curso} en el ${salon}. Eso es todo`
            }
            
          } else {
            if(hora != 13){
              mensaje += `A las ${horaString} tienes ${curso} en el ${salon}. Eso es todo.`
            } else {
              mensaje += `A la ${horaString} tienes ${curso} en el ${salon}. Eso es todo.`
            }
          }
          
        }
        
      }

      conv.ask(`<speak>${saludo}${mensaje} ¿Deseas hacer otra cosa?</speak>`);
    }
  });
});

app.intent('ReservarRecurso', (conv,{recurso, number, sede, horaDelDia}) => {
  const name = "Alfredo";
  console.log(recurso);
  console.log(number);

  var stringHour = number + " " + horaDelDia;
  console.log(stringHour);
  var numberHour = stringToNumber(stringHour);
  console.log(numberHour);

  var pc = Math.floor(Math.random() * (11 - 1)) + 1;
  var sedeName = '';

  switch(sede){
    case 'MO': 
      sedeName = 'Monterrico';
      break;
      case 'VI': 
      sedeName = 'Villa';
      break;
      case 'SI': 
      sedeName = 'San Isidro';
      break;
      case 'SM': 
      sedeName = 'San Miguel';
      break;

  }

  if(recurso == 'computadora'){
    var hourString;
    var preHourString = numberHourToString(numberHour);
    if(numberHour!=13){
      hourString = `las ${preHourString}`;
    } else {
      hourString = `la ${preHourString}`;
    }

    return callAPIReservarComputadora(numberHour,sede,pc).then((output) => {
      if(output.code == 1){
        conv.ask(`<speak>Puedes utilizar la computadora ${pc} en ${sedeName} a partir de ${hourString}. ¿Deseas hacer otra cosa?</speak>`);
      } else {
        conv.ask('<speak>No hay computadoras disponibles. ¿Deseas hacer otra cosa?</speak>');
      }
    });
  } else {
    conv.ask('<speak>No hemos implementado esa opción. ¿Deseas hacer otra cosa?</speak>');
  }
});

app.intent('NotasAcumuladas', (conv, params) => {
  const name = "Alfredo";
  return callAPINotasAcumuladas().then((output) => {
    console.log(output);
    var saludo = '';
    if(name=='name'){
      saludo = 'Estas son tus notas acumuladas por curso: '
    } else {
      saludo = `Ok ${name}, estas son tus notas acumuladas por curso: `
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
    conv.ask(`<speak>${saludo}${mensaje} ¿Deseas hacer otra cosa?</speak>`);
  });
});

// Handle the Dialogflow intent named 'ConvertirDolSol'.
// The intent collects a parameter named 'number'.
app.intent('ClaseActual', (conv,params) => {
  const name = "Alfredo";
  return callAPIClaseActual().then((output) => {
    console.log(output);
    if (output.hasOwnProperty('message')){
      conv.ask('<speak>No tienes más clases el día de hoy. ¿Deseas hacer otra cosa?</speak>')
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
      
      var hourString;
      var preHourString = numberHourToString(hora);
      if(hora!=13){
        hourString = `A las ${preHourString}`;
      } else {
        hourString = `A la ${preHourString}`;
      }

      //name = conv.data.userName;
      if(name=="name"){
        if (minutesToClass < 60){
          if(minutesToClass > 0){
            conv.ask(`<speak>En ${minutesToClass} minutos tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          } else {
            conv.ask(`<speak>Ya deberías estar en ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          } 
        } else {
          conv.ask(`<speak> ${hourString} tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
        }
      } else {
        if (minutesToClass < 60){
          if(minutesToClass > 0){
            conv.ask(`<speak>${name}, en ${minutesToClass} minutos tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          } else {
            conv.ask(`<speak>${name}, ya deberías estar en ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
          }
        } else {
          conv.ask(`<speak>${name}, ${hourString} tienes ${curso} en el ${salon}.<emphasis level="strong">Te quedan ${faltas} faltas.</emphasis> ¿Deseas tener más información de este curso?</speak>`);
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

function callAPIReservarComputadora(horas,sede,pc){
  return new Promise((resolve, reject) => {
    //var sede = 'MO';
    //var computadora = 2;

    let path = "/computadoras/" + sede + "/" + pc + "/" + horas;
    var respa = encodeURI(path);

    var options = {
      host: host,
      port: 80,
      path: respa,
      method: 'PUT'
    };
    console.log(options);
    var req = http.request(options, function(res) {
        // reject on bad status
        if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error('statusCode=' + res.statusCode));
        }
        // cumulate data
        var body = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        });
        // resolve on end
        res.on('end', function() {
            try {
                body = JSON.parse(Buffer.concat(body).toString());
            } catch(e) {
                reject(e);
            }
            resolve(body);
        });
    });
    // reject on request error
    req.on('error', function(err) {
        // This is not a "Second reject", just a different sort of failure
        reject(err);
    });
    //req.write('');
    // IMPORTANT
    req.end();
  });
}

// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
