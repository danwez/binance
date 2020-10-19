
const Binance = require('@evanshortiss/binance.js')
const axios = require('axios');
const fs = require('fs')
const WebSocket = require('ws')
const qs = require('qs')
const crypto = require('crypto')
const mysql = require('mysql')
const config = require('./config');
const symbols = require('./symbols');

  //getAllAccountOrders
  

const BinanceApp = function() {

    this.exSymbols = []
    this.orderbook= false
    this.maxOrderValumeAsk= 0
    this.maxOrderValumeBid= 0
    this.timeCor = 0
    this.newOrders = [];
    this.db = null;
    this.lastSymbols = [];
    this.lotSizes = null;
    this.wallets = {};
    this.needBuy = false;    
    this.ticketArr = null;
    this.tradeAccess = true;
    this.myHistory = [];
    this.userDataStreem = {
        socket: null,
        listenKey: null
    }
    //this.socket = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr")

    this.init= function(){
        let self = this

        //установка конфигурации
        for(let i in config)
            this[i] = config[i]

        // подключение базы данных 
        /*
        fs.readFile('db_config.json', 'utf8', function (err, data) {
            if (err) throw err;
               let obj = JSON.parse(data);
               //console.log(obj)
        });
        */

        console.log('Стартуем')
       // this.tick();

       // this.getTickerArr(); //состояние рынка за 24 ч
       //this.getChangeInfo() // получаем инфу по паре
        
        //this.getMyBalances(true)
        this.startTrade()
        //this.accountSocket()

    }

    this.startTrade = function(){
        let self = this
        if(!this.userDataStreem.socket)
            this.accountSocket()
        this.getMyOrders().then(res => {
            console.log('Открытые ордера ',self.newOrders)
            if(self.newOrders.length == 0)
                this.getMyBalances(true)
           // else
                //setTimeout(()=>{self.startTrade()},5000)
        })
    }

    this.accountSocket = function(callback=function(){}){
        let self =this
        
        return axios({
            url:self.url+'/api/v3/userDataStream',
            method:'post',
            headers: {
                'X-MBX-APIKEY': self.apikey
            }
        }).then(res => {
        //this.apiRequest('/api/v3/userDataStream',{},false,falsejh,'post').then(res => {
            self.userDataStreem.listenKey = res.data.listenKey
            console.log(res.data)       
        
            self.userDataStreem.socket = new WebSocket("wss://stream.binance.com:9443/ws/"+self.userDataStreem.listenKey);
            let result = 0
            
            self.userDataStreem.socket.onopen = (event) => {
                let stime = new Date()
                console.log('socet is openned '+stime.toString())
                self.pingUserDataStream(self.userDataStreem.listenKey)
            }
            self.userDataStreem.socket.onmessage = function(message){
                let result = JSON.parse(message.data)     
               
                console.log('wallets' , self.wallets)
                console.log('=>',result)

                if(result.e == 'executionReport'){
                    if(result.S == 'SELL' && result.x != 'NEW')//если это продажный ордер и он не новый, значит отменяем пве нва покупку
                    {
                        console.log('Отменяем все ордера')
                        self.cancelAllOrders(result.s).then(ress=>{
                            self.startTrade(true)
                        })
                    }
                    if(result.s == 'BUY' && result.x == 'FILLED') // если выполнен ордер на покупку
                        self.getMyOrders().then(async res=>{
                            for(let i in self.newOrders){
                                if(self.newOrders[i].symbol==result.s && 
                                   self.newOrders[i].side == 'SELL' &&
                                   Date.now() + self.timeCor - self.newOrders[i].time > 60000)
                                   {
                                        await self.cancelOrder(result.s,self.newOrders[i].orderId).then(res=>{
                                            console.log("Ордер на продажу отменен")
                                            
                                        })
                                   }
                            }
                            self.startTrade(true)
                        })
                        

                }
                
            };
            self.userDataStreem.socket.onclose = () => {
                let stime = new Date()
                console.log('socet is closed '+stime.toString())
                self.userDataStreem = {
                    socket: null,
                    listenKey: null
                }
                self.startTrade()
            }
            self.userDataStreem.socket.onerror = (err) => { console.log(err)}
            
            return self.userDataStreem
        }).catch((err)=>{ console.log(err) })
        
    }

    this.pingUserDataStream = function(key){
        self = this
        setTimeout(() => {
            self.apiRequest('/api/v3/userDataStream',{listenKey:key},false,false,'put',true)
                .then(result => {
                    console.log('prolongation ',Date())
                    self.pingUserDataStream(key)
                    self.checkOrderes()
                }).catch((err)=>{ console.log(err) })
        }, self.lifeTime * 60000);
    }

    this.apiRequest = async function(endPoint, data=null, timestamp=false, subscribe=false, method='GET',authHeadr=false){
        let self =this

        return this.timeCorrect().then((res)=>{
          
            let dataQuery = ''
            let url = self.url + endPoint
            if(data){
                if(timestamp)
                    data.timestamp = Date.now() + self.timeCor
                dataQuery = qs.stringify(data)
                url += '?' + dataQuery
            }
            
            if(data && subscribe){
                let signature = crypto.createHmac('sha256',self.secret).update(dataQuery).digest('hex')
                url += '&signature=' + signature
                console.log(url)
            }
            let reqConfig = {
                method: method,
                url: url,
            }
            
            if(subscribe || authHeadr)
                reqConfig.headers= {
                    'X-MBX-APIKEY': self.apikey
                }
               
            return axios(reqConfig)
            
        })
        

    }

    this.checkOrderes = () => {
        self = this
        this.getMyOrders().then((res)=>{
            let renew = true
            for(let i in self.newOrders){
                if(self.newOrders[i].side == 'SELL')
                    renew = false
                else
                    if( Data.now() - self.newOrders[i].time < self.lifeTime * 60000 + 60000 )
                        renew = false
            }
            if(renew)
                self.cancelAllOrders(self.symbol).then((res)=>self.startTrade)
        })
    }

    this.getChangeInfo = async function(){
        let self = this
        axios.get(this.url+'/api/v3/exchangeInfo').then((res) => {
            for(let i in res.data.symbols){
                if(res.data.symbols[i].symbol == self.symbol)
                    console.log(res.data.symbols[i])
                    for(let y in res.data.symbols[i].filters)
                        if(res.data.symbols[i].filters[y].filterType =='LOT_SIZE')
                            self.lotSizes = {
                                min:res.data.symbols[i].filters[y].minQty,
                                max:res.data.symbols[i].filters[y].maxQty,
                                step:res.data.symbols[i].filters[y].stepSize
                            }
                            
            }
            console.log(self.lotSizes)
            

        })
    }



    this.getTickerArr=function(callback=function(){}){
        let self =this
        let socket = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr");
        let result = 0
        self.ticketArr = null
        socket.onmessage = function(message){
            result = JSON.parse(message.data)          
            
            
            socket.close();
        };
        socket.onclose = function(e){
            //self.testSymbol()
           // self.selectSymbol(result)
                for(let i in result)
                    if(result[i].s == self.symbol){
                        self.ticketArr = result[i]
                        console.log(result[i])
                    }
            
                callback()
        }
    }

    this.selectSymbol = function(symArray){
        let best_v = 0

        console.log(symArray)
        /* 
        // выбор
            for(let i in symArray)
                if (
                    symArray[i].s.slice(symArray[i].s.length-4) == 'USDT' &&
                    Math.abs(symArray[i].P*1) < 3 &&
                    symArray[i].q*1 > 10000000  &&
                    symArray[i].s.indexOf('USD') >= 2 
                    && this.exSymbols.indexOf(symArray[i].s) < 0                
                    )
                    best_v = symArray[i].q*1 > symArray[best_v].q*1 ? i : best_v
           // console.log('ex ',self.exSymbols,' sym',result[best_v].s,' indexof',self.exSymbols.indexOf(result[best_v].s));
        if(!this.testSymbol(symArray[best_v].s)&& this.exSymbols.length < 10)  {
            this.exSymbols.push(symArray[best_v].s)
            this.selectSymbol(symArray)
        }else{
            this.symbol = symArray[best_v].s
            this.exSymbols = []
        }*/
    }

    this.testSymbol = function(symbol){
        let self = this
         this.GetOrderList(symbol,function(){
            console.log('symbol',symbol)
         });
    }

    this.timeCorrect = function(callback=function(){}){
        // get server time
        let self = this
        return axios.get(this.url+'/api/v3/time').then(res => {
            //console.log('res.data.serverTime',res.data)
            self.timeCor = res.data.serverTime - Date.now()
            return self.timeCor
        })
        //callback()
    }

    this.GetOrderList = async function(symbol,trade=false,typeTrade='BUY'){
        let self = this

        axios.get(this.url+'/api/v3/depth?symbol='+symbol)
        .then(function (response) {
            // handle success
            //console.log(response.data);
            self.orderbook = response.data;
            let asksum =0;
            let bidsum = 0;
            for(var i in self.orderbook.asks){
                self.orderbook.asks[i].push(i)
                self.orderbook.bids[i].push(i)
                self.maxOrderValumeAsk = self.orderbook.asks[self.maxOrderValumeAsk][1]*1 > self.orderbook.asks[i][1]*1 ? self.maxOrderValumeAsk : i;

                self.maxOrderValumeBid = self.orderbook.bids[self.maxOrderValumeBid][1]*1 > self.orderbook.bids[i][1]*1 ? self.maxOrderValumeBid : i;

                //console.log(self.orderbook.asks[self.maxOrderValumeAsk][1], self.orderbook.asks[i][1]);
                asksum +=  self.orderbook.asks[i][1]*1;
                bidsum += self.orderbook.bids[i][1]*1

            }
            console.log('ask0',self.orderbook.asks[0])
            console.log('bid0',self.orderbook.bids[0])
            console.log('ask',self.orderbook.asks[self.maxOrderValumeAsk])
            console.log('bid',self.orderbook.bids[self.maxOrderValumeBid])
            console.log('sum value ask',asksum, ' bid', bidsum)
            console.log('komis',self.orderbook.asks[self.maxOrderValumeAsk][0]*0.001,' + ',self.orderbook.bids[self.maxOrderValumeBid][0]*0.001,' = ',self.orderbook.asks[self.maxOrderValumeAsk][0]*0.001+self.orderbook.bids[self.maxOrderValumeBid][0]*0.001)
            //trade = false
            if(trade){
                if(asksum/bidsum>0.5) {
                    console.log('Lets Trade')
                    if(typeTrade=='BUY')
                        self.buyOrder({
                            askStop: self.orderbook.asks[self.maxOrderValumeAsk],
                            bidStop: self.orderbook.bids[self.maxOrderValumeBid],
                            askPrice: self.orderbook.asks[0],
                        })
                    else
                        self.sellOrder({
                            askStop: self.orderbook.asks[self.maxOrderValumeAsk],
                            bidStop: self.orderbook.bids[self.maxOrderValumeBid],
                            askPrice: self.orderbook.asks[0],
                        })
                }else{
                    setTimeout(function(){self.getMyBalances(true)},5000)
                }
            }
        })
    }

    this.buyOrder = async function(params={}){
        self = this
        console.log('wal',this.wallets[this.baseSym],'sym ',this.baseSym,' stop ',params.bidStop[0])
        let price = Math.floor((params.bidStop[0]*1 + this.minSum * 2) * (10**self.razryad))/(10**self.razryad)
        console.log('size',price)
        let quantity = Math.floor((this.wallets[this.baseSym]*0.98 ) * this.lotSize / price * 10) / 1000 
        let ordersQuant = Math.floor(100 / this.lotSize)
        
        let orderParams = {
            symbol: this.symbol,
            side: 'BUY',
            type: 'LIMIT',
            price: price,
            quantity: quantity,
            timeInForce: 'GTC'
        }
        let endpoint = '/api/v3/order'
        this.getTickerArr(async ()=>{
            let koridor = self.ticketArr.h - self.ticketArr.l
            if(self.tradeAccess && self.ticketArr && self.ticketArr.h - price > self.extrem / 100 * koridor){
                let ordersPriceStep = params.askPrice[0] - params.bidStop[0] - self.minSum * 0.02
                console.log('ordersPriceStep',ordersPriceStep)
                for(let i = 0; i < ordersQuant; i++){
                    
                    let orderPrice = Math.floor((price - ordersPriceStep * i)*(10**self.razryad))/(10**self.razryad)
                    console.log('params',params, 'err',ordersPriceStep,'orderPrice',orderPrice)
                    orderParams.price = orderPrice
                    console.log('orderParams',orderParams)
                    
                    await self.apiRequest(endpoint,orderParams,true,true, 'POST').then(res => {
                        console.log(res.data)
                        //self.startTrade()
                    }).catch((err)=>{
                        console.log(err)
                        setTimeout(()=>{self.startTrade()},5000)
                    })
                    
                }
            }
            else
                setTimeout(() => {
                    if(self.ticketArr)
                        console.log('Торговля остановлена. До потолка ',self.ticketArr.h - price, ' минимум ',self.extrem / 100 * koridor)

                    self.startTrade()
                }, 5000)
        })
        //console.log(orderParams)
    }

    this.sellOrder = function(params={}){
        self = this
        console.log('wal',this.wallets[this.tradeSym],'sym ',this.tradeSym,' stop ',params.askStop[0])
        let price = Math.floor((params.askStop[0]*1 - this.minSum * 2) * 1000) / 1000
        let quantity = Math.floor(this.wallets[this.tradeSym] * 1000) / 1000
        let orderParams = {
            symbol: this.symbol,
            side: 'SELL',
            type: 'LIMIT',
            price: price,//.toString().replace('.',','),
            quantity: quantity,
            timeInForce: 'GTC'
        }
        let endpoint = '/api/v3/order'
        this.apiRequest(endpoint,orderParams,true,true,'POST').then(res => {
            console.log(res)
            self.startTrade()
        }).catch((err)=>{
            console.log(err)
            setTimeout(()=>{self.startTrade()},5000)
        })
        //console.log(orderParams)
    }

    this.cancelOrder = function(symbol,orderId){
        self = this
        console.log('Отменям ордер ID=',orderId,' по паре ',symbol)
        
        let orderParams = {
            symbol: symbol,
            orderId: orderId,
        }
        let endpoint = '/api/v3/order'
        this.apiRequest(endpoint,orderParams,true,true,'delete').then(res => {
            console.log(res)
            
        }).catch((err)=>{
            console.log(err)
            
        })
        //console.log(orderParams)
    }

    this.cancelAllOrders = function(symbol){
         
        return this.apiRequest('api/v3/openOrders',{symbol:symbol},true,true,'delete').then(res => {
            console.log(res)
            
        }).catch((err)=>{
            console.log(err)
            
        })
    }

    this.getMyBalances = async function(trade=false){
        let self = this
        let endPoint = '/sapi/v1/capital/config/getall'
        this.apiRequest(endPoint, {}, true, true)
        .then((res)=>{   
            self.wallets = []
            //console.log('tt',res)      
                for(let i in res.data)
                    if(res.data[i].free > 0)   
                        self.wallets[res.data[i].coin] = res.data[i].free
                         console.log('wallets',self.wallets)
            if(trade){
                this.trade()
                
            } 
            }).catch((err)=>{
                console.log(err)
                setTimeout(()=>{self.startTrade()},5000)
            })
        
    }

    this.trade = () => {
        if(this.wallets[this.tradeSym] == undefined || this.wallets[this.tradeSym]<this.minSum){ // попытка купить валюту
            this.GetOrderList(this.symbol,true,'BUY') // стакан ордеров
        }else{
            this.GetOrderList(this.symbol,true,'SELL')
        }
    }


    this.getMyOrders = function(){
        let self =this
        let endPoint = '/api/v3/allOrders'
        return this.apiRequest(endPoint, {symbol:this.symbol}, true, true)
        .then((res)=>{
            self.myHistory = res.data
            self.newOrders=[]
            for(let i in res.data){
                if(res.data[i].status == 'NEW'){
                    if(res.data[i].side == 'BUY' && Date.now() + self.timeCor - res.data[i].time > self.lifeTime * 60000)
                        self.cancelOrder(res.data[i].symbol,res.data[i].orderId)
                    else
                        self.newOrders.push(res.data[i])
                }
                
            }
            
            return self.newOrders
        }).catch((err)=>{
            console.log(err)
            setTimeout(()=>{self.startTrade()},5000)
        })

    }

 
}

const app = new BinanceApp
app.init()
