const express = require('express');
const axios = require('axios');
const JSONdb = require('simple-json-db');
var path = require('path');
var shell = require('shelljs');
require('dotenv').config();
const db = new JSONdb('./product.json');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const fs = require("fs");
const qrcode = require("qrcode-terminal");
const { Client, MessageMedia, LegacySessionAuth} = require("whatsapp-web.js");
const SESSION_FILE_PATH = "./session.json";
let sessionData;


const nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'info@hondaprada.com.bo', // generated ethereal user
    pass: 'vzyycurxqrngwkfk', // generated ethereal password
  },
});


const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const ejs = require("ejs");
app.get('/', async (req, res) => {
    let chatId = process.env.CODE_COUNTRY + req.query.phone + "@c.us";
    if (req.query.type == 'text') {
        client.sendMessage(chatId, req.query.message).then((response) => {
            if (response.id.fromMe) {
                console.log("text fue enviado!");   
            }
        })
        console.log("text fue enviado!");  
    }else if (req.query.type == 'galery') {
        const media = MessageMedia.fromFilePath(req.query.attachment);
        client.sendMessage(chatId, media, {caption: req.query.message}).then((response) => {
            if (response.id.fromMe) {
                console.log("galery fue enviado!");
            }
        });
    }else if (req.query.type == 'pin') {
        client.sendMessage(chatId, req.query.message).then((response) => {
            if (response.id.fromMe) {
                console.log("pin fue enviado!");   
            }
        })
    }else if (req.query.type == 'email') {

        const miresponse = await axios('https://hondaprada.com.bo/wp-json/wp/v2/lw_proforma?id='+req.query.message);
        let mihtml = await ejs.renderFile(__dirname +"/views/email.ejs", { midata: miresponse.data});
        await transporter.sendMail({
            from: "info@hondaprada.com.bo", // sender address
            to: req.query.email, // list of receivers
            subject: "Proforma", // Subject line
            html: mihtml, // html body
        });
        console.log("email fue enviado!");
      
    }
    res.render('home', { title: 'CHATBOT'});
  });

app.get('/pin', (req, res) => {
    axios.get(process.env.API+'lw_pin')
        .then(function (response) {
            console.log(response);
        });
});

app.get('/mirestart', (req, res) => {
  
    shell.exec('pm2 restart chatbotHP', function(code, output) {
        console.log('Exit code:', code);
        console.log('Program output:', output);
    });
    res.redirect('/');
});

app.get('/email', async (req, res) => {
    const midata = await axios('https://hondaprada.com.bo/wp-json/wp/v2/lw_proforma?id=9636');
    res.render('email', { midata: midata.data });
});

//----------------------------------------------------------------------

if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}
const client = new Client({
    authStrategy: new LegacySessionAuth({session: sessionData}),
    puppeteer: {
        ignoreDefaultArgs: ['--disable-extensions'],
        args: ['--no-sandbox']
    }
});
client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Nuevo QR, recuerde que se genera cada 1/2 minuto.')
});
client.on('ready', () => {
    console.log('El BOT esta listo.');
	app.listen(process.env.PORT, () => {
		console.log('BOT CORRIENDO EN '+process.env.DOMAIN);
	});
  
});
client.on("authenticated", (session) => {
    sessionData = session;
    console.log(session)
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});
client.on("auth_failure", msg => {
    console.error('AUTHENTICATION FAILURE', msg);
})
client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);
    if (msg.body == 0  || msg.body === "Hola" || msg.body === "hola" || msg.body === "Buenas" || msg.body === "buenas" || msg.body === "Prada" || msg.body === "prada") {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        let misms = '\nSoy el 🤖BOT - iBy 🤖 un agente de ventas por internet, de 🇧🇴'+process.env.BUSINESS+'🇧🇴 ';
        misms = misms + '\n1.- 👉 Catalogo Completo ';
        misms = misms + '\n2.- 👉 Eventos y Novedades ';
        misms = misms + '\n3.- 👉 Servicio Tecnico y Sucursales ';
        misms = misms + '\n4.- 👉 Mis reservas';
        misms = misms + '\n5.- 👉 Chatear con un oficial de credito';
        
        await chat.sendMessage(`Hola @${user.id.user}`+misms, {
            mentions: [user]
        });
        
    } else if (msg.body == 1) {
        const chat = await msg.getChat();
        axios.get(process.env.API+'lw_products')
            .then(function (response) {
                let mijson = response.data;
                let misms = '🛒 Todos nuestros productos 🛒\n';
                for(var i = 0; i < mijson.length; i++){
                    misms = misms + mijson[i].id+'.- '+mijson[i].name+'\n';
                }
                misms = misms + '-------------------------------\n';
                misms = misms + 'Elige el # de un producto para mas informacion\n';
                misms = misms + '0.- Volver al Menu Principal\n';
                chat.sendMessage(misms);
            });
      }else if (msg.body > 32 && msg.body < 9999) {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        axios.get(process.env.API+'lw_product?item='+msg.body)
            .then(function (response) {
                let mijson = response.data;
                let midir = process.env.DIR+mijson.location;	
                let media = MessageMedia.fromFilePath(midir);
                let micaption = '🛍 PRODUCTO #'+mijson.id+' 🛍\n';
                micaption = micaption + 'MODELO: '+mijson.name+'\n'+ 'PRECIO: Bs.'+mijson.regular_price+'\n'+mijson.description+'\n';
                micaption = micaption + '-------------------------------\n';
				micaption = micaption + 'c.- Otras formas de pago (cotizador)\n';
                micaption = micaption + 'r.- Reservar producto\n';
                micaption = micaption + '1.- Todos los productos\n';
                micaption = micaption + '0.- Volver al menu principal\n';
                micaption = micaption + 'app.- Volver en al App (Android)\n';
                micaption = micaption + 'web.- Ver en la pagina web';
                db.set(user.id.user, {id: mijson.id, name: mijson.name, price: mijson.regular_price, fecha: new Date() });
                chat.sendMessage(media, { caption: micaption });
            })
            .catch(function (error) {
            })
            .then(function () {
        });
    }else if (msg.body == 'web' || msg.body == 'Web') {

        const chat = await msg.getChat();
        const user = await msg.getContact();
        let data = db.get(chat.id.user);
        console.log(data.product);
        axios.get(process.env.API+'lw_product?item='+data.id)
            .then(function (response) {
                let mijson = response.data;
                chat.sendMessage('Visita nuestra tienda en linea. \n'+mijson.link);
            });

    }else if (msg.body == 'app' || msg.body == 'App') {

        const chat = await msg.getChat();
        const user = await msg.getContact();
   
        chat.sendMessage('Abre Nuestra App. \nhttps://play.google.com/store/apps/details?id=com.coffye.hurbue');
            
	}else if (msg.body == 'c' || msg.body == 'C') {

        const chat = await msg.getChat();
        const user = await msg.getContact();
        chat.sendMessage('Ingresa a nuestro cotizador, para conocer todas las formas de pago.\n'+process.env.COTIZADOR);

    }else if (msg.body == 'r' || msg.body == 'R') {

        const chat = await msg.getChat();
        const user = await msg.getContact();
        let data = db.get(user.id.user);
        var misms =  '💳 Quieres Reserva el producto '+data.name+', con el monto de Bs. '+Number(data.price * 0.10).toFixed(2)+' (10% del precio) ?. Lo puedes hacer con un depocito o transferencia bancaria. 💳\n';
        misms = misms + '- Banco Union:\n';
        misms = misms + 'Prada Representaciones\n';
        misms = misms + 'Cuenta en Bolivianos - 120298259\n';
        misms = misms + 'Cuenta en Dolares - 22785860\n';

        misms = misms + '- Banco Bisa:\n';
        misms = misms + 'Prada Reprensentaciones\n';
        misms = misms + 'Cuenta en Bolivianos - 5310460011\n';
        misms = misms + 'Cuenta en Dolares - 5310462014\n';

        misms = misms + '- Banco Ganadero:\n';
        misms = misms + 'Carlos Aurelio Prada Castedo\n';
        misms = misms + 'Cuenta en Bolivianos - 6041017406\n';
        misms = misms + 'Cuenta en Dolares - 604200886\n';

        misms = misms + 'Luego del depocito, un vendedor se comunicara para confirmar el pago.\n';
        misms = misms + '--------------------------------\n';
        misms = misms + '0.- Volver al menu principal\n';
        misms = misms + 'y.- Reservar ahora';
        chat.sendMessage(misms);


    }else if (msg.body == 'y' || msg.body == 'Y') {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        let data = db.get(user.id.user);
        let monto = data.price * 0.10;
        axios.get(process.env.API+'lw_reserva_create?product='+data.id+'&customer='+user.id.user+'&monto='+Number(monto).toFixed(2))
            .then(function (response) {
                let mijson = response.data;
                let misms = '🎉 GRACIAS '+user.id.user+' POR TU RESERVA 🎉\n';
                misms = misms + 'RESERVACION #'+mijson.reserva_id+'\n';
                misms = misms + 'MODELO: '+data.name+'\n';
                misms = misms + 'PRECIO: '+data.price+'\n';
                misms = misms + 'MONTO RESERVA Bs: '+(data.price * 0.10)+'\n';
                misms = misms + '- Luego del depocito, un vendedor se comunicara para confirmar el pago.\n';
                misms = misms + '--------------------------------\n';
                misms = misms + '0.- Volver al menu principal\n';
                misms = misms + '1.- Todos los productos\n';
                misms = misms + '4.- Mis reservas';
                chat.sendMessage(misms);
            });
    }else if (msg.body == '2') {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        let misms = 'No hay eventos por el momento\n';
        misms = misms + '--------------------------------\n';
        misms = misms + '0.- Volver al menu principal\n';
        misms = misms + '1.- Todos los productos';
        chat.sendMessage(misms);
    }else if (msg.body.startsWith('3')) {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        let misms = 'Puedes Vistar Nuestras Tiendas y Servicio Tecnicos\n';
        misms = misms + 'SUCURSAL 1 (casa matriz)\n';
        misms = misms + 'Plaza principal acera oeste.\n';
        misms = misms + 'https://goo.gl/maps/LvjYAZKjCH1jUWfi6';
        chat.sendMessage(misms);
        misms = 'SUCURSAL Los Tocos y Servicio Tecnico\n';
        misms = misms + 'Plaza principal acera oeste.\n';
        misms = misms + 'https://goo.gl/maps/vLNC7JGfqLgswkHH7\n';
        misms = misms + '--------------------------------\n';
        misms = misms + '0.- Volver al menu principal\n';
        misms = misms + '1.- Todos los productos';
        chat.sendMessage(misms);
    }else if (msg.body == '4') {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        axios.get(process.env.API+'lw_reserva?customer='+user.id.user)
            .then(function (response) {
                let mijson = response.data;
                let misms = '⏱ Todas tus reservas ⏱\n';
                if (mijson.length == 0) {
                    chat.sendMessage('No tiene reservas registradas.');
                } else {
                    for(var i = 0; i < mijson.length; i++){
                        misms = misms + 'Reserva #'+mijson[i].id+'\n Producto: '+mijson[i].producto+'\n Monto: '+mijson[i].monto+'\n Fecha: '+mijson[i].fecha+'\n';
                    }
                    misms = misms + '--------------------------------\n';
                    misms = misms + '0.- Volver al menu principal\n';
                    misms = misms + '1.- Todos los productos';
                    chat.sendMessage(misms);
                }
            });
    }else if (msg.body == '5') {
        const chat = await msg.getChat();
        const user = await msg.getContact();
        const v1 = await client.getContactById("59172846519@c.us");
        chat.sendMessage('Roberto Cardona');
        chat.sendMessage(v1);
        const v2 = await client.getContactById("59172849189@c.us");
        chat.sendMessage('Esmeralda Stambuk');
        chat.sendMessage(v2);
        const v3 = await client.getContactById("59172849882@c.us");
        chat.sendMessage('Yosellin Roca');
        chat.sendMessage(v1);
        let misms = '🙋‍♀️ Escoge tu ejecutiv@ de ventas.  🙋‍♂️\n';
        misms = misms + '--------------------------------\n';
        misms = misms + '0.- Volver al menu principal\n';
        misms = misms + '1.- Todos los productos';
        chat.sendMessage(misms);
    }

});
client.initialize();

//----------------------------------------------------------------