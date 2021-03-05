moment.locale('ru')

var BotApp = new Vue({
    el: '#bot_app',
    data: {
        socket: null,
        message: 'Торговля',
        price: 0,
        priceUp: true,
        stopLoss:0,
        blockPrice:false,
        symbol: '',
        nextSymbol: '',
        symbols:[],
        wallets: [],
        walletsLoc: [],
        orders: [],
        profit24: 0,
        auth: false,
        letAuth:false,
        password:"",
    },
    methods: {
        socketOnMessage : function(message){
            if(message.price == undefined)
                console.log(message)
            for(let i in message){
                if(i=='price')
                    this.priceUp = message[i] >= this.price;
                if(this[i]!=undefined)
                    this[i] = message[i];
                if(i=='profitToday')
                    this.profit24 = message[i]
            }

        },
        sendMessageToServer: function(message){},
        enterAuth: function(){
            this.sendMessageToServer({auth:this.password})
        },
        symbolBtnClass: function(symbol){
            let btnClass = "btn btn-outline-primary";
            if(symbol.symbol == this.symbol)
                btnClass += ' active';
            else
                if(symbol.symbol == this.nextSymbol)
                    btnClass = "btn btn-info"
            return btnClass;
        },
        symbolBtnClick: function(symbol){
            // если выбран уже установленный nextSymbol, переключаем на текущий symbol, иначе отправляем выбранный
            if(symbol.symbol == this.nextSymbol)
                this.sendMessageToServer({set:{nextSymbol:this.symbol}})
            else
                if(symbol.symbol != this.symbol){
                    this.sendMessageToServer({set:{nextSymbol:symbol.symbol}})
                }
        },
        cancelOrder(id){
            if(confirm('Удалить ордер '+id+'?'))
                this.sendMessageToServer({cancelOrder:id})
        },
        calcProfit: function(){
            profit = 0;
            for(let i in this.orders){
                if(this.orders[i].side == 'BUY' && this.orders[i].status == 'FILLED')
                    profit -= this.orders[i].price * this.orders[i].origQty;
                if(this.orders[i].side == 'SELL' && this.orders[i].status == 'NEW')
                    profit += this.orders[i].price * this.orders[i].origQty;
                
            }
            return profit
        },
        now: function(){
            return moment().format('D MMM HH:mm:SS')
        },
        getDateTime: function(time,format){
            let date = new Date(time);
            return moment(date).format(format)
        },
        showWallet: function(sym){
            return this.symbol.indexOf(sym)>=0;
        },
        refreshProc: function(){
            this.orders = [];
            this.sendMessageToServer({refresh:1});
        }

    },
    created: function(){
        self = this
        this.socket = io()        
        this.socket.on('message', message => this.socketOnMessage(message));
        this.sendMessageToServer = function(message){
            console.log('send');
            self.socket.emit('message', message);
        }
        this.sendMessageToServer('get info')
    }
});