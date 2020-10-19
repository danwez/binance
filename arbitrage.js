const config = require('./config');
const fs = require('fs')
const axios = require('axios');
const WebSocket = require('ws')


const Arbitrage = function(){

    this.ticketArr = {}
    this.dopSymbols = ['BTC','NEAR','ETH','XVS','RUB']
    this.quantity = 10

    this.init= function(){
        let self = this

        //установка конфигурации
        for(let i in config)
            this[i] = config[i]

        console.log('Стартуем')
       // this.tick();

       // this.getTickerArr(); //состояние рынка за 24 ч
       //this.getChangeInfo() // получаем инфу по паре
        
        //this.getMyBalances(true)
        
        this.startTrade()
        //this.accountSocket()

    }

    this.startTrade = () => {
        this.getTickerArr();
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
            
            setTimeout(()=>socket.close(),5000)
            
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
        console.log('Виртуально мы имеем '+this.quantity+' '+this.tradeSym)
        let etalone = 0
        for (let a in ticketArr){
            if(ticketArr[a].s == this.symbol){
                etalone = ticketArr[a].b * this.quantity
                //console.log(ticketArr[a])
                console.log("Можем продать по цене "+ticketArr[a].b+" и получить "+ etalone + ' ' +this.baseSym+ ' или:')
            }
        }
        
        for(let i in this.dopSymbols){
            let trans1 = 0
            let trans2 = 0
            for (let a in ticketArr){
                //console.log(ticketArr[a])
                if(ticketArr[a].s!=undefined && ticketArr[a].s.indexOf(this.tradeSym) > -1 && ticketArr[a].s.indexOf(this.dopSymbols[i]) > -1){
                    if(ticketArr[a].s.indexOf(this.tradeSym)>1)
                        trans1 = this.quantity / ticketArr[a].b
                    else
                        trans1 = this.quantity * ticketArr[a].b
                    //console.log('trans1',ticketArr[a])
                }
            }
            for (let a in ticketArr){
                //console.log(ticketArr[a].s,' ',ticketArr[a].s.replace(this.baseSym,''))
                if(ticketArr[a].s.replace(this.baseSym,'') == this.dopSymbols[i]){
                    if(ticketArr[a].s.indexOf(this.baseSym)>1)
                        trans2 = trans1 * ticketArr[a].a
                    else
                        trans2 = trans1 / ticketArr[a].a
                    //trans2 = trans1 * ticketArr[a].a
                    //console.log('trans2',ticketArr[a])
                }    
                    
            }
            console.log('Купить '+trans1 +' '+ this.dopSymbols[i]+' и получить '+ trans2*0.998 +' '+this.baseSym)
        }

    }
}

const app = new Arbitrage()

app.init()
