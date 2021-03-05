const BinanceApp = require('./BinanceApp')
const symbols = require('./symbols')
const express = require('express'),
         app = express(),
         http = require('http').createServer(app),
         io = require('socket.io')(http);

    
const host = '127.0.0.1';
const port = 7000;
    
let clients = [];

let BinApp = null
const Interfase = {
    socket: null,
    getMessage: function(message){

        //get info about BinApp properties 
        if(message == 'get info')
          this.sendAppData()

        // set BinApp properties
        if(message.set != undefined){
          console.log('message.set',message.set)
          for(let i in message.set)
            BinApp.set(i,message.set[i])
            
          console.log('nextSymbol',BinApp.nextSymbol)
          this.sendAppData()
        }

        if(message.cancelOrder != undefined)
          BinApp.cancelOrder(message.cancelOrder)

        if(message.auth != undefined)
          this.sendMessage({auth:message.auth == BinApp.password})

        if(message.refresh != undefined && message.refresh)
          BinApp.startTrade()
        console.log('getMessage ',message)
        this.sendMessage(message)
    },
    restartApp: function(){
      if(BinApp) BinApp.interfase = null
      BinApp = null
      BinApp = new BinanceApp()
      BinApp.interfase = this
      BinApp.init()
    },
    
    sendAppData: function(){
      this.sendMessage({
        orders : BinApp.orders,
        wallets: BinApp.wallets,
        walletsLoc: BinApp.walletsLoc,
        symbols: symbols,
        symbol: BinApp.symbol,
        nextSymbol: BinApp.nextSymbol
      })
    },
    sendMessage: function(message){
        if(this.socket){
            this.socket.emit('message',message)
        }
    }
    
}

io.on('connection', socket => {
    console.log(`Client with id ${socket.id} connected`);
    clients.push(socket.id);

    Interfase.socket = socket,
   
    socket.emit('message', 'I\'m server');
   
    socket.on('message', message => Interfase.getMessage(message));
   
    socket.on('disconnect', () => {
      clients.splice(clients.indexOf(socket.id), 1);
      console.log(`Client with id ${socket.id} disconnected`);
    });
   });
   
   app.use(express.static(__dirname));
   
   app.get('/', (req, res) => res.render('index'));
   
   //получение количества активных клиентов
   app.get('/clients-count', (req, res) => {
    res.json({count: io.clients().server.engine.clientsCount});
   });
   
   //отправка сообщения конкретному клиенту по его id
   app.post('/client/:id', (req, res) => {
    if(clients.indexOf(req.params.id) !== -1){
      io.sockets.connected[req.params.id].emit('private message', `Message to client with id ${req.params.id}`);
      return res.status(200).json({message: `Message was sent to client with id ${req.params.id}`});
    }else
      return res.status(404).json({message: 'Client not found'});
   });
   
   http.listen(port, host, () => console.log(`Server listens http://${host}:${port}`));
   
Interfase.restartApp()

