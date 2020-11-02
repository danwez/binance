const config = require('./config');
const fs = require('fs')
const axios = require('axios');
const WebSocket = require('ws')


const Arbitrage = function(){

    this.ticketArr = {}
    this.dopSymbols = ['BTC','ETH','LTC','TRX','EOS','SXP','ADA','BCH','XRP','XMR','OCEAN','ATOM']
    this.quantity = 1.7
    this.usdt = 50
    this.fd = null
    this.time = 5
    this.tradePlan = null

    this.init= function(){
        let self = this

        this.fd = fs.openSync('log.txt','a')
        //установка конфигурации
        for(let i in config)
            this[i] = config[i]

        console.log('Стартуем')
       // this.tick();

       // this.getTickerArr(); //состояние рынка за 24 ч
       //this.getChangeInfo() // получаем инфу по паре
        
        //this.getMyBalances(true)
        
       // this.log(JSON.stringify(this))
        this.startTrade()
        //this.accountSocket()

    }

    this.startTrade = () => {
        this.getTickerArr();
    }

    this.log=function(message){
        let now = new Date()
        let date = now.getHours()+':'+now.getMinutes()+':'+now.getSeconds()
        fs.writeFile('log.txt', '\n\r'+date+' '+ message, { flag: 'a' }, (err) => {console.log(err)})
    }

    this.getTickerArr = function(callback=function(){}){
        let self =this
        let socket = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr");
        let result = 0
       // self.ticketArr = null
        socket.onmessage = function(message){
            result = JSON.parse(message.data)          
            for(let i in result)
                self.ticketArr[result[i].s] = result[i]
            
            setTimeout(()=>socket.close(),self.time*1000)
            
        };
        socket.onclose = function(e){
            //self.testSymbol()
           // self.selectSymbol(result)
           //console.log(result)
           
           self.checkSymbols(self.ticketArr)

            
                callback()
        }
    }

    this.checkSymbols = (ticketArr) => {
        this.tradePlan = null
        let price = 0
        let price1 = 0
        let price2 = 0
        // Сколько мжно купить BNB
        for (let a in ticketArr){
            if(ticketArr[a].s == this.symbol){
                this.quantity = Math.floor(this.usdt / ticketArr[a].a * 1000)/1000
                price = ticketArr[a].a
            }
        }

        console.log('Виртуально мы имеем '+this.quantity+' '+this.tradeSym)
        let etalone = 0

        for (let a in ticketArr){
            if(ticketArr[a].s == this.symbol){
                etalone = ticketArr[a].b * this.quantity * 0.999
                //console.log(ticketArr[a])
                console.log("Можем продать по цене "+ticketArr[a].b+" и получить "+ etalone + ' ' +this.baseSym+ ' или:')
            }
        }
        
        for(let i in this.dopSymbols){
            let trans1 = 0
            let trans2 = 0
            
            let symbol1 = ''
            let symbol2 = ''
            let direction1 = 0
            let direction2 = 0
            // если купить промежуточную валюту
            for (let a in ticketArr){
                //console.log(ticketArr[a])
                if(ticketArr[a].s!=undefined && ticketArr[a].s.indexOf(this.tradeSym) > -1 && ticketArr[a].s.indexOf(this.dopSymbols[i]) > -1){
                    if(ticketArr[a].s.indexOf(this.tradeSym)>1){
                        trans1 = this.quantity / ticketArr[a].a
                        price1 = ticketArr[a].a
                    }                        
                    else{
                        trans1 = this.quantity * ticketArr[a].b
                        price1 = ticketArr[a].b
                        direction1 = 1
                    }
                        
                    symbol1 = ticketArr[a].s
                    
                    //console.log('trans1',ticketArr[a])
                }
            }
            // если продать промежуточную валюту
            for (let a in ticketArr){
                //console.log(ticketArr[a].s,' ',ticketArr[a].s.replace(this.baseSym,''))
                if(ticketArr[a].s.replace(this.baseSym,'') == this.dopSymbols[i]){
                    if(ticketArr[a].s.indexOf(this.baseSym)>1){
                        trans2 = trans1 * ticketArr[a].a
                        price2 = ticketArr[a].a
                        direction2 =1
                    }
                        
                    else{
                        trans2 = trans1 / ticketArr[a].b
                        price2 = ticketArr[a].b
                        
                    }
                        
                    //trans2 = trans1 * ticketArr[a].a
                    //console.log('trans2',ticketArr[a])
                    symbol2 = ticketArr[a].s
                    
                }    
                    
            }
            console.log('Купить '+trans1 +' '+ this.dopSymbols[i]+' и получить '+ trans2*0.998 +' '+this.baseSym + ' выгода '+(trans2*0.998 - etalone))
            if(trans2*0.998 - etalone > 0){
                this.tradePlan = [
                    {
                        symbol : this.symbol,
                        price : price,
                        quantity: this.quantity,
                        buy : true,
                        compleat: false
                    },
                    {
                        symbol : symbol1,
                        price : price1,
                        quantity: trans1,
                        buy : direction1 == 0,
                        compleat: false
                    },
                    {
                        symbol : symbol2,
                        price : price2,
                        quantity: trans1,
                        buy : direction2 == 0,
                        compleat: false
                    }
                ]
            }

            
        }
        console.log(this.tradePlan)
    }
}

const app = new Arbitrage()

app.init()
