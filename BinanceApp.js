const axios = require('axios');
const fs = require('fs')
const WebSocket = require('ws')
const qs = require('qs')
const crypto = require('crypto')
const config = require('./config');
const symbols = require('./symbols')

const BinanceApp = function() {

    this.timeCor = 0
    this.depthLimits = [5, 10, 20, 50, 100, 500, 1000, 5000]
    this.maxOrderValumeAsk = 0
    this.maxOrderValumeBid = 0
    this.userDataStreem = {
        socket: null,
        listenKey: null
    }
    this.nextSymbol = 'DOGEUSDT'
    this.interfase = null
    this.tradeSocket = null
    this.price = 0
    this.logOn = false
    this.orders = []
    this.lotSize = 0
    this.wallets = {}
    this.walletsLoc = {}
    this.stopLoss = 0
    this.stopTrade = false
    this.blockPrice = false;

    this.init = function() {

        let self = this

        //установка конфигурации
        for (let i in config)
            this[i] = config[i]

        //this.loadConfig()
        setTimeout(()=>{
            console.log('Стартуем c ',this.symbol)
        this.log('Начало работы скрипта')
        this.startTrade()

        //console.log('depth',this.depth)
        
        //this.getDepth().then(orderbook=>{            console.log(orderbook)        })
        //if(this.autoSymbol)  this.info24hr()
        //this.exchangeInfo()
        },1000)
    }

    this.setSymbolProps = function(symbol){
        self = this
        return this.exchangeInfo().then(syms=>{
            for(let i in syms){
                if(syms[i].symbol == self.symbol){
                    self.baseSym = syms[i].quoteAsset
                    self.tradeSym = syms[i].baseAsset
                    for(let y in syms[i].filters){

                        if(syms[i].filters[y].filterType == 'LOT_SIZE'){
                            self.minSum = syms[i].filters[y].minQty
                            self.razryadQ = Math.log10(syms[i].filters[y].stepSize)
                        }

                        if(syms[i].filters[y].filterType == 'MIN_NOTIONAL'){
                            self.minOrderSize = syms[i].filters[y].minNotional
                        }

                        if(syms[i].filters[y].filterType == 'PRICE_FILTER'){
                            self.tickSize = syms[i].filters[y].minNotional
                        }
                        
                    }
                }
            }
        })
    }

    this.exchangeInfo = function(symbol=null){

        return this.apiRequest('/api/v3/exchangeInfo',{},false,false,'GET').then(function(res){
            let syms = res.data.symbols
            
            return syms
                        
        })

        
    }

    this.info24hr = function(){
        let self = this
        this.apiRequest('/api/v3/ticker/24hr',{},false,false,'GET').then(function(res){
            let syms = res.data
            let num = 0
            let newSym = null
            for(let i in syms)
                if(syms[i].symbol.indexOf(self.baseSym)>=0 
                    && syms[i].priceChangePercent * 1 < -1
                    && syms[i].quoteVolume *1 > 50000000
                    && syms[i].lastPrice < 3
                ){
                    num++
                    console.log(num,'.',syms[i])
                    if(!newSym) newSym = syms[i]
                    if(syms[i].priceChangePercent*1 < newSym.priceChangePercent*1)
                        newSym = syms[i]


                }
            console.log('finish', newSym)
            self.setSymbolProps(newSym.symbol).then(function(res){
            console.log({
                
                    symbol : self.symbol,
                    tradeSym : self.tradeSym,
                    baseSym : self.baseSym, 
                    minSum : self.minSum, 
                    minOrderSize : self.minOrderSize, 
                    razryad : self.razryad,
                    razryadQ : self.razryadQ
                
            })
            })
        })
    }

    this.startTrade = function() {
        let self = this        

        if (!this.tradeSocket) this.openTradeSocket()
        if (!this.userDataStreem.socket) this.accountSocket()
 
        if(!this.stopTrade){
            this.log('Старт торговли')

            this.getMyBalances().then(function(){
                

                self.checkOrders().then((res) => {
                
                    self.trade()
                    
                    //console.log(self.orders)
                }).catch((err) => console.log(err.response.data))

                
        
                return self.orders
            })
            //this.saveConfig()
        }


        

    }

    this.changeSymbol = function(){
        let newSymbol = null
        
        for(let i in symbols)
            if(symbols[i].symbol == this.nextSymbol)
                newSymbol = symbols[i]
        console.log('changeSymbol*************************',newSymbol)

        if(newSymbol){
            this.tradeSocket.close()
            for(let i in newSymbol)
                this.set(i,newSymbol[i])
            setTimeout(()=>this.openTradeSocket(),1500)
            if(this.interfase) this.interfase.sendAppData()
            console.log('this.symbol',this.symbol)
            this.saveConfig()
            
        }
            
        
        console.log('newSymbol',newSymbol)
        return newSymbol
    }



    this.trade = function(limit = this.depth) {
        let self = this

        if(!this.stopTrade)
        this.getDepth(limit).then(function(orderbook) {
            
            console.log('wallets balance', self.wallets)
            console.log('wallets balance loc', self.walletsLoc)
            // если есть tradeSym - продажа на все           

            if (self.wallets[self.tradeSym] >= self.minOrderSize / orderbook.asks[self.maxOrderValumeAsk][0]){
                
                console.log(self.minOrderSize / orderbook.asks[self.maxOrderValumeAsk][0])
                // отменяем уже созданные продажные ордера и делаем новый
                let sellOrder = self.getSellOrder()
                
                if(sellOrder && Date.now() - sellOrder.time > 90000){
                    console.log('отменяем уже созданный продажный ордер',sellOrder.orderId)
                    self.cancelAllOrders()
                    
                }
                if(!sellOrder){
                    console.log('делаем новый продажный ордер')
                    let price = self.getSellPrice(orderbook.asks[self.maxOrderValumeAsk][0]*1 - 10 ** -self.razryad * 2)
                    self.sellOrder({price : price})
                    
                } 
                              
                
            }

            // если нет ордеров - покупаем первый
            console.log('self.orders ',self.orders)
            let newDeal = null
            
            if (self.orders.length == 0) {
                newDeal = self.newDeal()
                    
                if(newDeal)
                    setTimeout(()=>self.startTrade(),self.stepTime*1000)
                else
                    self.checkTrade(orderbook).then(letTrade => {
                        if (letTrade) {
                            console.log('Можно торговать', letTrade)
                            
                            self.buyOrder({
                                askStop: orderbook.asks[self.maxOrderValumeAsk],
                                bidStop: orderbook.bids[self.maxOrderValumeBid],
                                askPrice: orderbook.asks[0],                               
                            })
                            
                        } else {
                            setTimeout(function(){ self.startTrade()}, self.stepTime * 1000);
                        }
                    })
                return
            }

            // если есть продажный ордер и нет покупных выставляем stop loss
            let orders = {buy:0,sell:0}
            for(let i in self.orders){
                if(self.orders[i].status == 'NEW'){
                    if(self.orders[i].side == 'BUY')
                        orders.buy++
                    if(self.orders[i].side == 'SELL')
                        orders.sell++
                }                    
            }
            if(orders.sell > 0 && orders.buy == 0 && self.stopLoss==0){
                self.stopLoss = orderbook.bids[self.maxOrderValumeBid][0]*1
                console.log('set stop loss = ',self.stopLoss)
            }

            // если есть покупные, снимаем stopLoss
            if(orders.buy > 0 && self.stopLoss > 0){
                self.stopLoss = 0
            }
		

            self.interfase.sendAppData()
            

        }).catch((err) => console.log(err))


    }

    this.restartDeal = function(){
        console.log('restartDeal',new Date())
        if(this.interfase != undefined){
            this.close()
            this.interfase.restartApp()
        }
    }

    this.newDeal = function(){
        let newDeal = false
        console.log('symbol',this.symbol,'nextSym',this.nextSymbol)
            if(this.nextSymbol != this.symbol)
                newDeal = this.changeSymbol()
            this.orders = []
            this.stopLoss = 0
            return newDeal
    }

    this.getSellPrice = function(price){
        // получить расчет нового продажного ордера с учетом безубыточности сделки
        let cancelledSellOrder = null
        let buyOrderSumm = 0
        let buyOrders = 0
        let profit = 0
        let firstSellOrder = null
        let firstBuyOrder = null
        let newPrice = 0
        for(let i in this.orders){
            if(this.orders[i].side == 'SELL' && this.orders[i].status == 'CANCELED'){
                console.log('cancelledSellOrder')
                if(firstSellOrder===null) firstSellOrder = this.orders[i]
                cancelledSellOrder = this.orders[i]
            }
            if(this.orders[i].side == 'BUY' && this.orders[i].status == 'FILLED'){
                if(firstBuyOrder===null) firstBuyOrder = this.orders[i]
                buyOrderSumm += this.orders[i].price * this.orders[i].origQty
                buyOrders++
            }
        }
        console.log('buyOrderSumm',buyOrderSumm, 'firstSellOrder')
        if(firstSellOrder && firstBuyOrder ){
            profit = firstSellOrder.price * firstSellOrder.origQty - firstBuyOrder.price * firstSellOrder.origQty
            newPrice = this.roundPrice((buyOrderSumm + profit ) / this.wallets[this.tradeSym])
            console.log('profit',profit,' newPrice', newPrice, 'price',price)

        }
        return price >= newPrice ? this.roundPrice(price) : newPrice
    }

    this.addBuyOrder = function(){
        // добавочный ордер для усреднения
        let self = this
        //
        let filledOrders = 0
        for(let i in this.orders)
            if(this.orders[i].side == 'BUY' && this.orders[i].status == 'FILLED')
                filledOrders++
        self.getDepth(this.depth * filledOrders).then(function(orderbook){
            let sellOrder = self.getSellOrder()
            if(sellOrder){
                self.stopLoss = 0
                //console.log('orderbook.bids[self.maxOrderValumeBid]',orderbook.bids[self.maxOrderValumeBid])

                let price = self.roundPrice(orderbook.bids[self.maxOrderValumeBid][0]*1 - 10**-self.razryad*2)
                let quantity = self.roundQuantity(self.calcLotSize()/price)
                if(price * quantity < self.wallets[self.baseSym])
                    self.buyOrder({price:price, quantity:quantity}).then(res=>{
                        self.blockPrice = false                
                    })
                else 
                    self.blockPrice = false
            }else 
                self.blockPrice = false
                    
        })
        

    }

    this.getSellOrder = function(){
        let sellOrder = null
            for(let i in this.orders)
                if(this.orders[i].side == 'SELL' && this.orders[i].status == 'NEW')
                    sellOrder = this.orders[i]
        return sellOrder
    }

    this.addLimit = function(limit){
        let i = 0
        for(i=0;i<this.depthLimits.length;i=i+1)
            if(this.depthLimits[i]>=limit)
                break
        return i+1<this.depthLimits.length?this.depthLimits[i+1]:this.depthLimits[i]
    }

    this.price24 = function() {
        let self = this

        return axios({
            url: self.url + '/api/v3/ticker/24hr?symbol=' + self.symbol,
            method: 'get'
        }).then(res => {
            return res.data
        }).catch((err) => console.log(err.response.data))
    }

    this.profit24 = function(orderbook){
        let self = this
        let today = new Date()
        today.setHours(3,0,0,0)
        
                
        let profit = 0
                let sellOrder = null
                let newSell = null
                for(let i in orderbook){
                    if(orderbook[i].time >= today.getTime()){
                        
                        if(orderbook[i].status == 'FILLED' && sellOrder){
                            if(orderbook[i].side == 'BUY'){
                                profit -= orderbook[i].origQty * orderbook[i].price
                            }
                            if(orderbook[i].side == 'SELL'){
                                profit += orderbook[i].origQty * orderbook[i].price
                            }
                        }

                        if(orderbook[i].side == 'SELL' && orderbook[i].status == 'FILLED')
                            sellOrder = orderbook[i]
                        
                        if(orderbook[i].side == 'SELL' && orderbook[i].status == 'NEW')
                            newSell = orderbook[i]
                        
                        

                    }
                }

                if(newSell)
                    profit += newSell.origQty * newSell.price

                if(self.interfase)
                    self.interfase.sendMessage({profitToday:profit+self.baseSym})

    }

    this.sellOrder = async function(params = {}) {
        self = this

        if (params.price == undefined)
            params.price = this.roundPrice(params.askStop[0] * 1 - 10 ** -this.razryad * 2)
        let quantity = this.roundQuantity(this.wallets[this.tradeSym])
        // если продаем BNB, то оставляем 0,08% на комиссию
        if (this.tradeSym == 'BNB') quantity = Math.floor(quantity * 0.9993 * (10 ** self.razryadQ)) / (10 ** self.razryadQ)
        let orderParams = {
            symbol: this.symbol,
            side: 'SELL',
            type: 'LIMIT',
            price: params.price,
            quantity: quantity,
            timeInForce: 'GTC'
        }
        let endpoint = '/api/v3/order'
        return this.apiRequest(endpoint, orderParams, true, true, 'POST').then(res => {
            console.log('выставлен продажный ордер', res.data)
            return res.data
        }).catch((err) => {
            if(err.response!=undefined)
                console.log(err.response.data)
            setTimeout(() => {
                self.startTrade()
            }, self.stepTime * 1000)
        })
    }

    this.buyOrder = async function(params = {}) {
        self = this

        let lotSize = this.calcLotSize() < this.wallets[this.baseSym] ? this.calcLotSize() : this.wallets[this.baseSym]
        if (params.price == undefined)
            params.price = this.roundPrice(params.bidStop[0] * 1 + 10 ** -this.razryad * 2)
        console.log('price ', params.price)
        if(params.quantity == undefined)
            params.quantity = this.roundQuantity(lotSize / params.price)

        let orderParams = {
            symbol: this.symbol,
            side: 'BUY',
            type: 'LIMIT',
            price: params.price,
            quantity: params.quantity,
            timeInForce: 'GTC'
        }

        let endpoint = '/api/v3/order'

        await self.apiRequest(endpoint, orderParams, true, true, 'POST').then(res => {
            if(res!=undefined)
                console.log('BUY ORDER', res.data)

        }).catch((err) => {

            console.log('Ошибка при попытке купить')
            console.log(err)
            error = true

        })
        //console.log(orderParams)
    }

    this.checkTrade = async function(orderbook) {
        let self = this
        let letTrade = true
        let asksum = 0;
        let bidsum = 0;
        for (var i in orderbook.asks) {

            asksum += orderbook.asks[i][1] * 1;
            bidsum += orderbook.bids[i][1] * 1

        }

        console.log('sum value ask', asksum, ' bid', bidsum)
        if (bidsum / asksum <= 0.5) {
            console.log('торговля остановлена. Недостаточный спрос на валюту')
            letTrade = false
        }
        
        let profit = orderbook.asks[self.maxOrderValumeAsk][0] - orderbook.bids[self.maxOrderValumeBid][0]
        let komis = this.calkKomis([orderbook.asks[self.maxOrderValumeAsk][0], orderbook.bids[self.maxOrderValumeBid][0]])
        if (profit <= komis * 2) {
            console.log('orderbook.asks = ',orderbook.asks[self.maxOrderValumeAsk],orderbook.bids[self.maxOrderValumeBid])
            console.log('торговля остановлена. Недостаточный профит', profit, ' при комиссии ', komis)
            letTrade = false
        }

        if (letTrade)
            letTrade = await this.price24().then(function(res) {
                let koridor = res.highPrice - res.lowPrice
                if (res.highPrice - self.price < self.extrem / 100 * koridor) {
                    console.log('Торговля остановлена. Цена на рынке', self.price, ' приближена к максимальному значению ',res.highPrice)
                    return false
                } else
                    return true
            }).catch((err) => console.log(err.response.data))
        console.log('letTrade', letTrade)
        return letTrade
    }

    this.calkKomis = function(sums) {
        let komis = sums[0] * 0.001 + sums[1] * 0.001
        if (this.tradeSym == 'BNB') komis = komis * 0.7
        return komis
    }

    this.getDepth = function(limit = this.depth, symbol = this.symbol) {
        let self = this
        let limIndex = 0;
        let lim = 0;
        for (let i in this.depthLimits) {
            limIndex = i * 1
            lim = this.depthLimits[i]
            if (lim >= limit) break
        }
        console.log('lim',lim)
        return axios.get(this.url + '/api/v3/depth?symbol=' + symbol + '&limit=' + lim).then(response => {
            let orderbook = response.data
            let returnbook = {asks:[],bids:[]}
            for (var i in orderbook.asks) {
                if (i <= limit) {

                    orderbook.asks[i].push(i)
                    orderbook.bids[i].push(i)
                    self.maxOrderValumeAsk = orderbook.asks[self.maxOrderValumeAsk][1] * 1 > orderbook.asks[i][1] * 1 ? self.maxOrderValumeAsk : i;
                    self.maxOrderValumeBid = orderbook.bids[self.maxOrderValumeBid][1] * 1 > orderbook.bids[i][1] * 1 ? self.maxOrderValumeBid : i;
                    returnbook.bids[i] = orderbook.bids[i]
                    returnbook.asks[i] = orderbook.asks[i]
                } else break

            }
            orderbook = null
            return returnbook;
        }).catch((err) => {
            if(err.response!=undefined)
                console.log(err.response.data)})
    }

    this.checkOrders = function() {
        let self = this
        let lastDealId = null
        this.orders = []
        console.log('Проверка активных ордеров')
        return this.getOrders().then((res) => {
            self.profit24(res.data)
            console.log('Поиск последней продажи')
            for (let i in res.data)
                if (res.data[i].side == 'SELL' && res.data[i].status == 'FILLED')
                    lastDealId = res.data[i].orderId

            console.log(lastDealId)

            if(lastDealId>0)
                return self.getOrders({
                    orderId: lastDealId
                }).then(function(res){
                    //console.log('orders got',res.data)
                    for (let i in res.data)
                        if (lastDealId != res.data[i].orderId && !(res.data[i].side == 'BUY' && res.data[i].status == 'CANCELED'))
                            self.orders.push(res.data[i])
                    //console.log('return self.getOrders',self.orders)
                    if(self.interfase)
                        self.interfase.sendMessage({orders:self.orders,wallets:self.wallets})

                    if(!self.getSellOrder()){
                        let numCancelled = 0
                        for(let i in self.orders){
                            if(self.orders[i].side == 'BUY' && self.orders[i].status == 'NEW' && self.orders[i].time + self.lifeTime * 60000 - 60000 <= Date.now()){
                                numCancelled++
                                console.log('отмена просрочки ')
                                self.cancelOrder(self.orders[i].orderId)
                                break
                            }
                        }
                        
                        
                    }

                    // Проверяем задвоение первых ордеров
                    if(self.orders.length > 1 && self.orders[0].side == 'BUY' && self.orders[1].side == 'BUY' && self.orders[0].status == 'NEW' && self.orders[1].status == 'NEW')
                        self.cancelAllOrders()

                    return self.orders

                }).catch(err => {
                    console.log(err.response.data)
                    self.startTrade()
                })
            else {
                self.startTrade()
                return self.orders
            }
        }).catch((err) => console.log(err.response.data))
    }

    this.checkOrdersNew = function() {
        let self = this
        let lastDealId = null
        this.orders = []
        console.log('Проверка активных ордеров')
        return this.getOrders().then((res) => {
            self.profit24(res.data)
            console.log('Поиск последней продажи')
            for (let i in res.data){
                if (res.data[i].side == 'SELL' && res.data[i].status == 'FILLED')
                    lastDealId = res.data[i].orderId
            }
            console.log(lastDealId)
            if(lastDealId>0){
                let letAdd = false
                for (let i in res.data){
                    if (letAdd && !(res.data[i].side == 'BUY' && res.data[i].status == 'CANCELED'))
                                self.orders.push(res.data[i])
                    if(res.data[i].orderId == lastDealId) letAdd = true
                }
            }
                
            console.log('return self.getOrders',self.orders)
            if(self.interfase)
                self.interfase.sendMessage({orders:self.orders,wallets:self.wallets})
            

                if(!self.getSellOrder()){
                    let numCancelled = 0
                    for(let i in self.orders){
                        if(self.orders[i].side == 'BUY' && self.orders[i].status == 'NEW' && self.orders[i].time + self.lifeTime * 60000 - 60000 <= Date.now()){
                            numCancelled++
                            console.log('отмена просрочки ')
                            self.cancelOrder(self.orders[i].orderId)
                            break
                        }
                    }
                    
                    
                }
                    

                   
            if(!lastDealId)
                return self.orders


            else {
                self.startTrade()
                return self.orders
            }
        }).catch((err) => console.log(err.response.data))
    }

    this.roundPrice = function(price) {
        return Math.round(price * 10 ** this.razryad) / 10 ** this.razryad
    }

    this.roundQuantity = function(quantity) {
        return Math.floor(quantity * 10 ** self.razryadQ) / 10 ** self.razryadQ
    }

    this.getOrders = function(params = {}) {
        console.log('Получаем ордера')
        let self = this
        
        let endPoint = '/api/v3/allOrders'
        params.symbol = this.symbol
        params.recvWindow = 10000
        if(params.limit == undefined)
            params.limit = 50
        return this.apiRequest(endPoint, params, true, true)
    }

    this.getOpenOrders = function(params = {}) {
        console.log('Получаем открытые ордера')
        let self = this
        
        let endPoint = '/api/v3/openOrders'
        params.symbol = this.symbol

        return this.apiRequest(endPoint, params, true, true)
    }

    this.calcLotSize = function() {
        let calcLotSize = this.getBaseBalance() * this.lotSize / 100

        return calcLotSize
    }

    this.getBaseBalance = function() {
        
        let balance = this.wallets[this.baseSym] + this.walletsLoc[this.baseSym] + (this.wallets[this.tradeSym]*1 + this.walletsLoc[this.tradeSym]) * this.price

        return balance
    }

    this.getMyBalances = function() {
        console.log('Получение информации о балансах')
        let self = this
        let endPoint = '/sapi/v1/capital/config/getall'
        return this.apiRequest(endPoint, {recvWindow:5000}, true, true)
            .then((res) => {
                self.wallets = {}
                //console.log('tt',res.data)      
                for (let i in res.data)
                    if (res.data[i].free > 0 || res.data[i].locked > 0) {
                        self.wallets[res.data[i].coin] = res.data[i].free * 1
                        self.walletsLoc[res.data[i].coin] = res.data[i].locked * 1
                        //if(res.data[i].coin =='BNB') console.log(res.data[i])
                    }
                if(self.wallets[self.tradeSym] == undefined) self.wallets[self.tradeSym] = 0
                if(self.wallets[self.baseSym] == undefined) self.wallets[self.baseSym] = 0
                if(self.walletsLoc[self.tradeSym] == undefined) self.walletsLoc[self.tradeSym] = 0
                if(self.walletsLoc[self.baseSym] == undefined) self.walletsLoc[self.baseSym] = 0

                return self.wallets


            }).catch((err) => {
                self.log(err.config)
 
            })

    }

    this.apiRequest = function(endPoint, data = null, timestamp = false, subscribe = false, method = 'GET', authHeadr = false) {
        let self = this

        return this.timeCorrect().then((res) => {

            let dataQuery = ''
            let url = self.url + endPoint
            if (data) {
                if (timestamp)
                    data.timestamp = Date.now() + self.timeCor
                dataQuery = qs.stringify(data)
                url += '?' + dataQuery
            }

            if (data && subscribe) {
                let signature = crypto.createHmac('sha256', self.secret).update(dataQuery).digest('hex')
                url += '&signature=' + signature
                console.log(url)
                console.log(method)
            }
            let reqConfig = {
                method: method,
                url: url,
            }

            if (subscribe || authHeadr)
                reqConfig.headers = {
                    'X-MBX-APIKEY': self.apikey
                }

            return axios(reqConfig)

        }).catch((err) => console.log(err.response.data))


    }

    this.log = function(message) {
        if (this.logOn) {
            let now = new Date()
            let date = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds()
            let day = now.getDate() + '.' + now.getMonth() + '.' + now.getFullYear()
            fs.writeFile('./logs/' + day + 'log.txt', '\n\r' + date + ' ' + message, {
                flag: 'a'
            }, (err) => {
                console.log(err.response.data)
            })
            console.log(date + ' ' + message)
        }
    }

    this.timeCorrect = function(callback = function() {}) {
        // get server time
        let self = this
        return axios.get(this.url + '/api/v3/time').then(res => {
            self.timeCor = res.data.serverTime - Date.now()
            return self.timeCor
        }).catch(err => self.log(err.response.data))
    }

    

    this.cancelOrder = function(orderId) {
        let self = this
        let symbol = this.symbol
        console.log(new Date() + ' Отменям ордер ID=', orderId, ' по паре ', symbol)

        let orderParams = {
            symbol: symbol,
            orderId: orderId,
        }
        let endpoint = '/api/v3/order'
        return this.apiRequest(endpoint, orderParams, true, true, 'delete').then(res => {
            console.log(res.data)
        }).catch((err) => {
            if(err.response != undefined)
                console.log(err.response.data)
            self.startTrade()
        })
    }

    this.cancelAllOrders = function(symbol = this.symbol) {
        console.log('отменяем ВСЕ ордера', symbol)
        return this.apiRequest('/api/v3/openOrders', {
            symbol: symbol
        }, true, true, 'delete').then(res => {   
            console.log('Отменили ',res.data)         
            return res.data
        }).catch((err) => {if(err.response!=undefined) console.log(err.response.data)})
    }

    this.openTradeSocket = function() {
        let self = this
        let symbol = this.symbol.toLowerCase().replace('_', '')

        this.tradeSocket = new WebSocket("wss://stream.binance.com:9443/ws/" + symbol + "@trade")
        this.tradeSocket.onopen = event => console.log('Trade socet start')
        this.tradeSocket.onclose = event => {
            console.log('Trade socet stop')
            self.tradeSocket = null
        }
        this.tradeSocket.onmessage = message => {
            let result = JSON.parse(message.data)
            self.price = result.p * 1
            if(self.interfase)
                self.interfase.sendMessage({price:self.price,stopLoss:self.stopLoss,blockPrice:self.blockPrice})
            if(self.price < self.stopLoss && !self.blockPrice){
                console.log('let add BUY')
                self.blockPrice = true 
                self.addBuyOrder()
                
            }
        }
    }

    this.accountSocket = function(callback = function() {}) {
        let self = this

        return axios({
            url: self.url + '/api/v3/userDataStream',
            method: 'post',
            headers: {
                'X-MBX-APIKEY': self.apikey
            }
        }).then(function(res) {

            self.userDataStreem.listenKey = res.data.listenKey

            self.userDataStreem.socket = new WebSocket("wss://stream.binance.com:9443/ws/" + self.userDataStreem.listenKey);
            let result = 0

            self.userDataStreem.socket.onopen = (event) => {
                let stime = new Date()
                console.log('socet is openned ' + stime.toString())
                self.pingUserDataStream(self.userDataStreem.listenKey)
            }


            self.userDataStreem.socket.onmessage = async function(message) {

                let result = JSON.parse(message.data)
                let pausa = 0

                console.log('account message =>', new Date())

                if (result.e == 'executionReport') {
                    // срабатывает при изменении статуса ордера
                    console.log('On ' + result.s + ' ' + result.X + ' order for ' + result.S + '.')
                    console.log('Prise = ' + result.p + '. Quantity = ' + result.q)

                    if (result.X == 'FILLED') // если выполнен ордер
                        self.stopLoss = 0

                    if (result.X == 'NEW' && result.S=='BUY' && self.orders.length == 0){
                        pausa = 10 // увеличить время ожидания ордеров 
                    }

                    if (result.X == 'FILLED' && result.S=='SELL'){
                        console.log('Закрытие сделки')
                        self.stopTrade = true
                        self.cancelAllOrders().then(function(res){
                            console.log('Перезапуск')
                            self.restartDeal()                            
                        })
                    }
                    else
                        if(!self.stopTrade)
                            setTimeout(()=> self.startTrade(),(self.stepTime+pausa)*1000)

                }

                if (result.e == 'outboundAccountInfo') {
                    //this.wallets = {}
                    for (let i in result.B) {
                        self.wallets[result.B[i].a] = result.B[i].f
                        self.walletsLoc[result.B[i].a] = result.B[i].l

                    }

                    console.log('wallets', self.wallets)
                }

            };


            self.userDataStreem.socket.onclose = function(){
                let stime = new Date()
                console.log('socet is closed ' + stime.toString())
                self.userDataStreem = {
                    socket: null,
                    listenKey: null
                }
                self.startTrade()
            }
            self.userDataStreem.socket.onerror = function(err){
                console.log(err.response.data)
            }

            return self.userDataStreem
        }).catch(function(err){
            console.log(err.response.data)
        })

    }

    this.pingUserDataStream = function(key) {
        self = this
        setTimeout(() => {
            self.apiRequest('/api/v3/userDataStream', {
                    listenKey: key
                }, false, false, 'put', true)
                .then(result => {
                    console.log('prolongation ', Date())
                    self.pingUserDataStream(key)
                    self.startTrade()
                    
                    
                }).catch((err) => {
                    console.log(err.response.data)
                })
        }, self.lifeTime * 60000);
    }

    this.loadConfig = function(){
        
        let conf = {}
        if(fs.existsSync('./tmp/conf.json'))
        
            return fs.readFile('./tmp/conf.json',{encoding:'UTF-8'}, (err, data) => {
                if (err) { 
                    console.log(err)             
                return
                }
                console.log('loaded conf ',data)
                conf = JSON.parse(data)
                for(let i in conf)
                    this[i] = conf[i]
                console.log('loaded conf ',conf)
            })
        else console.log('Not conf file')
        
    }

    this.saveConfig = function(){
        let tmpConfig = JSON.stringify({
            nextSymbol: this.nextSymbol,
            symbol: this.symbol,
            tradeSym: this.tradeSym,
            baseSym: this.baseSym,            
        })

        console.log('tmpConfig',tmpConfig)

        const dir = './tmp'
            try {
                if (!fs.access(dir,fs.constants.F_OK,(err)=>{
                    if(err)
                        fs.mkdir(dir,(err=>console.log(err)))
                })){
                    
                    
                }
            } catch (err) {
                console.error(err)
            }
            try{
                if(!fs.access(dir+'/conf.json',fs.constants.W_OK,(err)=>{}))
                    fs.open(dir+'/conf.json','w',err=>{})
                fs.writeFile(dir+'/conf.json',tmpConfig,err=>{})
            }catch(err){
                console.error(err)
            }
        
    }

    this.set = function(prop,value){
        if(this[prop]!=undefined)
            this[prop] = value
    }

    this.close = function() {
        this.userDataStreem.socket.close()
        this.tradeSocket.close()
    }

}

module.exports = BinanceApp