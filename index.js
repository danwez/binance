
const axios = require('axios');
const fs = require('fs')
const WebSocket = require('ws')
const qs = require('qs')
const crypto = require('crypto')
const config = require('./config');
const symbols = require('./symbols');
const Deal = require('./deal');  

const BinanceApp = function() {

    this.exSymbols = []
    this.maxOrderValumeAsk= 0
    this.maxOrderValumeBid= 0
    this.timeCor = 0
    this.deal = null;
    this.lastSymbols = [];
    this.lotSizes = null;
    this.wallets = {};
    this.needBuy = false;    
    this.ticketArr = null;
    this.tradeAccess = true;
    this.depthLimits = [5, 10, 20, 50, 100, 500, 1000, 5000]

    this.userDataStreem = {
        socket: null,
        listenKey: null
    }
    this.logOn = false
    this.basePrice = 0
    this.deal = null
    //this.socket = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr")

    this.init= function(){
        let self = this

        //установка конфигурации
        for(let i in config)
            this[i] = config[i]

        console.log('Стартуем')
        this.log('Начало работы скрипта')
        
       // this.tick();
       
       // this.getTickerArr(); //состояние рынка за 24 ч
       //this.getChangeInfo() // получаем инфу по паре
        //this.GetOrderList(this.symbol)
        //this.getMyBalances(true)
        //this.getMyOrders().then(res=>{console.log(self.deal)} )
        
        this.startTrade()
        //this.accountSocket()
        //this.timeCorrect().then(res => console.log(res))


    }

    this.startTrade = function(){
        let self = this
        this.log('Старт торговли')
        this.dealRenew()
        if(!this.userDataStreem.socket)
            this.accountSocket()

        this.checkOrderes()
        
    }

    this.dealRenew = function(){
        if(this.deal == null) {
            this.deal = new Deal(this.symbol)
            this.deal.getActive()
        }
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
        
            self.userDataStreem.socket = new WebSocket("wss://stream.binance.com:9443/ws/"+self.userDataStreem.listenKey);
            let result = 0
            
            self.userDataStreem.socket.onopen = (event) => {
                let stime = new Date()
                console.log('socet is openned '+stime.toString())
                self.pingUserDataStream(self.userDataStreem.listenKey)
            }


            self.userDataStreem.socket.onmessage = async function(message){
                
                let result = JSON.parse(message.data)     
               
                
                console.log('=>',new Date())

                if(result.e == 'executionReport'){
                    // срабатывает при изменении статуса ордера
                    console.log ('On '+result.s+' '+result.X+' order for '+result.S+'.')
                    console.log('Prise = '+result.p+'. Quantity = '+result.q)

                    if(result.X == 'NEW'){
                        //новый ордер добавляем в сделку
                        
                        self.deal.orders.push(self.normalSocketOrder(result))
                        if(result.S == 'SELL')
                            self.deal.calcProfit()
                        //console.log('new deal',self.deal)
                        self.deal.save()
                    }else {                  
                        // изменен статус ордера
                        self.deal.changeOrder(result.i,{status:result.X})
                        console.log('changeOrder = ',self.deal)
                    }

                    console.log('after buy', self.deal, 'time', Date.now())

                    if(result.S == 'SELL' && result.X == 'FILLED')//если исполнен продажный ордер, значит отменяем ордера на покупку
                    {
                        self.deal.close()                           

                            await self.cancelAllOrders(result.s).then(ress=>{
                                self.deal = null
                                self.startTrade(true)
                            })
                            
                    }

                    if(result.S == 'BUY' && result.X == 'FILLED') // если выполнен ордер на покупку



                    //this.GetOrderList(this.symbol,true,'BUY')

                        self.getMyOrders().then(async res=>{
                            for(let i in self.deal.orders){
                                
                                if(self.deal.orders[i].symbol==result.s && 
                                   self.deal.orders[i].side == 'SELL' &&
                                   self.deal.orders[i].status == 'NEW' &&
                                   Date.now() - self.deal.orders[i].transactTime > 60000
                                   )
                                   {
                                    console.log('Проверка есть ли продажный ли ордер ',self.deal.orders[i].side,' ',new Date(self.deal.orders[i].transactTime) )
                                       // отменяем ордер на продажу, чтобы выставить новый
                                        await self.cancelOrder(result.s,self.deal.orders[i].orderId).then(res=>{
                                            
                                            console.log("Ордер на продажу отменен")
                                            self.trade(true)
                                        })
                                   }
                            }
                            
                        })
                        

                }

                if(result.e == 'outboundAccountInfo'){
                    //this.wallets = {}
                    for(let i in result.B)
                        self.wallets[result.B[i].a] = result.B[i].f

                    console.log('wallets' , self.wallets)
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
                console.log(method)
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

    this.checkOrderes = function() {
        self = this
        this.getMyOrders().then((res)=>{
            let renew = true
            console.log('Открытые ордера ', self.deal.getOpenOrders())

            for(let i in self.deal.orders){
                if(self.deal.orders[i].status == 'NEW')
                    if(self.deal.orders[i].side == 'SELL')
                        renew = false
                    else
                        if( self.deal.orders[i].side == 'BUY' && Date.now() - self.deal.orders[i].transactTime < self.lifeTime * 60000 + 60000 ){
                            console.log('Ордер будет актуален еще '+Math.round((Date.now()+self.lifeTime * 60000 - self.deal.orders[i].transactTime)/1000)+' секунд')
                            renew = false
                        }
                        
            }

            if(self.deal.getOpenOrders().length == 0) {
                renew = false
                self.getMyBalances(true)
            }

            if(renew)
                self.cancelAllOrders(self.symbol).then((res)=>{
                    if(self.deal){
                        self.deal.cancel()
                        self.deal = null
                    }
                    self.getMyBalances(true)
                })
        })
    }

    this.getChangeInfo = async function(){
        let self = this
        return axios.get(this.url+'/api/v3/exchangeInfo').then((res) => {
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
        }).catch(err => console.log(err))
        //callback()
    }

    this.GetOrderList = async function(symbol,trade=false,typeTrade='BUY'){

        //определяемся с ценами по стакану ордеров
        let self = this

        // определяем глубину стакана
        let limit = 0
        for (let i in this.depthLimits){
            limit = this.depthLimits[i]
            if(limit >= self.depth)
                break
        }

        axios.get(this.url+'/api/v3/depth?symbol='+symbol+'&limit='+limit)
        .then(function (response) {
            
            let orderbook = response.data;
            let asksum =0;
            let bidsum = 0;
            for(var i in orderbook.asks){
                if(i <= self.depth){
                    asksum +=  orderbook.asks[i][1]*1;
                    bidsum += orderbook.bids[i][1]*1
                    
                    if(i>0 && 1==2) { 
                        
                        if(orderbook.asks[i][1] > asksum/i*7) console.log('barier a ',i,' = ', orderbook.asks[i])
                        if(orderbook.bids[i][1] > bidsum/i*7) console.log('barier b ',i,' = ', orderbook.bids[i])
                    }
                    orderbook.asks[i].push(i)
                    orderbook.bids[i].push(i)
                    self.maxOrderValumeAsk = orderbook.asks[self.maxOrderValumeAsk][1]*1 > orderbook.asks[i][1]*1 ? self.maxOrderValumeAsk : i;

                    self.maxOrderValumeBid = orderbook.bids[self.maxOrderValumeBid][1]*1 > orderbook.bids[i][1]*1 ? self.maxOrderValumeBid : i;
                    
                }else break

            }
            console.log('ask0',orderbook.asks[0])
            console.log('bid0',orderbook.bids[0])
            console.log('ask',orderbook.asks[self.maxOrderValumeAsk])
            console.log('bid',orderbook.bids[self.maxOrderValumeBid])
            console.log('sum value ask',asksum, ' bid', bidsum)
            let komis = orderbook.asks[self.maxOrderValumeAsk][0]*0.001+orderbook.bids[self.maxOrderValumeBid][0]*0.001
            console.log('komis',orderbook.asks[self.maxOrderValumeAsk][0]*0.001,' + ',orderbook.bids[self.maxOrderValumeBid][0]*0.001,' = ',komis)
            let profit = orderbook.asks[self.maxOrderValumeAsk][0] - orderbook.bids[self.maxOrderValumeBid][0]
            console.log('profit = ',profit)
            //trade = false
            if(trade){
                if(asksum/bidsum>0.5 && profit >= komis*2) {
                    console.log('Lets Trade')
                    if(typeTrade=='BUY')
                        self.buyOrder({
                            askStop: orderbook.asks[self.maxOrderValumeAsk],
                            bidStop: orderbook.bids[self.maxOrderValumeBid],
                            askPrice: orderbook.asks[0],
                            komis: komis,
                        })
                    else
                        self.sellOrder({
                            askStop: orderbook.asks[self.maxOrderValumeAsk],
                            bidStop: orderbook.bids[self.maxOrderValumeBid],
                            askPrice: orderbook.asks[0],
                        })
                }else{
                    setTimeout(function(){self.GetOrderList(symbol,trade,typeTrade)},self.stepTime*1000)
                }
            }
            orderbook = null
        }).catch(err => {
            console.log(err)
            setTimeout(function(){self.GetOrderList(symbol,trade,typeTrade)},self.stepTime*1000)
        })
    }



    this.buyOrder = async function(params={}){
        self = this
        console.log('wal',this.wallets[this.baseSym],'sym ',this.baseSym,' stop ',params.bidStop[0])

        if(this.deal.sum ==  0){
            
            self.deal.sum = this.wallets[this.baseSym]*0.98
            self.deal.stepSum = this.deal.sum * this.lotSize / 100
            self.deal.save()
            
        }

        let price = Math.floor((params.bidStop[0]*1 + 10**-this.razryad * 2) * (10**self.razryad))/(10**self.razryad)
        console.log('price ',price)
        let quantity = Math.floor(this.deal.stepSum / price * (10**self.razryadQ))/(10**self.razryadQ) 
        
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

            // определяем коридор движения цены за последние 24 часа
            let koridor = self.ticketArr.h - self.ticketArr.l
            
            if(self.tradeAccess && 
                    self.ticketArr && 
                    self.ticketArr.h - price > self.extrem / 100 * koridor 
                    //&& params.askStop[0] - params.bidStop[0] < params.komis * 1.3
               ){

                let error = false
                
                    
                    let orderPrice = Math.floor(price * (10**self.razryad))/(10**self.razryad)
                    orderParams.price = orderPrice
                    console.log('orderParams ',orderParams)
                    
                    await self.apiRequest(endpoint,orderParams,true,true, 'POST').then(res => {
                        console.log('BUY ORDER',res.data)
                        
                        //self.startTrade()
                    }).catch((err)=>{
                        console.log('Ошибка при попытке купить')
                        error = true
                        
                    })
                    
                
                if (error) setTimeout(()=>{self.startTrade()},self.stepTime*1000)
            }
            else
                setTimeout(() => {
                    if(self.ticketArr)
                        console.log('Торговля остановлена. До потолка ',self.ticketArr.h - price, ' минимум ',self.extrem / 100 * koridor)
                        console.log('При покупке 1 '+self.tradeSym +' Комиссия = '+params.komis+'. Максимальная прибыль = '+(params.askStop[0] - params.bidStop[0]))
                    self.startTrade()
                }, self.stepTime*1000)
        })
        //console.log(orderParams)
    }

    this.sellOrder = function(params={}){
        self = this
        console.log('wal',this.wallets[this.tradeSym],'sym ',this.tradeSym,' stop ',params.askStop[0])
        let price = Math.floor((params.askStop[0]*1 - 10**-this.razryad * 2) * 1000) / 1000
        let quantity = Math.floor(this.wallets[this.tradeSym] * (10**self.razryadQ))/(10**self.razryadQ)
        // если продаем BNB, то оставляем 0,08% на комиссию
        if(this.tradeSym == 'BNB') quantity = Math.floor(quantity * 0.0008 (10**self.razryadQ))/(10**self.razryadQ)
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
            console.log(res.data)

            //self.startTrade()
        }).catch((err)=>{
            console.log(err)
            setTimeout(()=>{self.startTrade()},self.stepTime*1000)
        })
        //console.log(orderParams)
    }

    this.cancelOrder = function(symbol,orderId){
        self = this
        console.log(new Date()+' Отменям ордер ID=',orderId,' по паре ',symbol)
        
        let orderParams = {
            symbol: symbol,
            orderId: orderId,
        }
        let endpoint = '/api/v3/order'
        this.apiRequest(endpoint,orderParams,true,true,'delete').then(res => {
            self.deal.changeOrder(orderId,{status:'CANCELED'})
            console.log(res)
            
        }).catch((err)=>{
            console.log(err)
            
        })
        //console.log(orderParams)
    }

    this.cancelAllOrders = function(symbol){
         
         
        return this.apiRequest('/api/v3/openOrders',{symbol:symbol},true,true,'delete').then(res => {
            console.log(res.data)
            return res.data            
        }).catch((err)=>{
            console.log(err.toJSON())            
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
                console.log(err.config)
                setTimeout(()=>{self.startTrade()},self.stepTime*1000)
            })
        
    }

    this.trade = function(addBuy = false) {
        this.dealRenew()
        if(this.wallets[this.tradeSym] == undefined || 
            this.wallets[this.tradeSym]<this.minSum 
            
            ){ 
            // попытка купить валюту
            this.GetOrderList(this.symbol,true,'BUY') // стакан ордеров
        }else{
            this.GetOrderList(this.symbol,true,'SELL')
            if(this.deal.stepSum > 0 && this.wallets[this.baseSym] >= this.deal.stepSum && addBuy )
                this.GetOrderList(this.symbol,true,'BUY')
        }
    }


    this.getMyOrders = function(){
        let self =this
        let endPoint = '/api/v3/allOrders'
        
        this.dealRenew()
        return this.apiRequest(endPoint, {symbol:this.symbol, limit:20}, true, true)
        .then((res)=>{
            if(self.deal.orders.length == 0){
                for(let i in res.data){
                    if(res.data[i].status == 'NEW'){
                        self.deal.orders.push(res.data[i])
                        
                    }
                    
                }
                self.deal.save()
                
            }else{
                
                for(let i in res.data){
                    for(let j in self.deal.orders)
                        if(self.deal.orders[j].orderId == res.data[i].orderId && self.deal.orders[j].status != res.data[i].status){
                            self.deal.changeOrder(self.deal.orders[j].orderId, {status: res.data[i].status})
                            console.log('change deal ',self.deal)
                        }
                }
            }
            return self.deal.orders
        }).catch((err)=>{
            console.log(err)
            setTimeout(()=>{self.startTrade()},self.stepTime*1000)
        })

    }

    this.normalSocketOrder = function(result){
        let normal = {
            symbol: result.s,
            orderId: result.i,
            orderListId: result.g, //Unless OCO, value will be -1
            clientOrderId: result.c,
            transactTime: result.T,
            price: result.p,
            origQty: result.q,
            executedQty: result.q,
            cummulativeQuoteQty: result.q,
            status: result.X,
            timeInForce: result.f,
            type: "MARKET",
            side: result.S
        }

        return normal
    }

    this.log=function(message){
        if(this.logOn){
            let now = new Date()
            let date = now.getHours()+':'+now.getMinutes()+':'+now.getSeconds()
            fs.writeFile('log.txt', '\n\r'+date+' '+ message, { flag: 'a' }, (err) => {console.log(err)})
        }
    }

 
}

const app = new BinanceApp()
app.init()
