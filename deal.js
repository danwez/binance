"use strict";

const DBStore = require('nedb')

const db = new DBStore({filename:'db/deals',autoload:true})

const Deal = function(symbol){

    this.symbol = symbol
    this.createdAt = Date.now()
    this.updateAt = Date.now()
    this.status = 'open'
    this.orders = []
    this.profit = 0
    this._id = undefined
    this.sum = 0
    this.stepSum = 0


    
}

Deal.prototype.getActive = async function() {
    let self = this
        return new Promise((resolve, reject) => {
            db.findOne({ symbol: this.symbol, status: 'open' }, (err, res) => {
                if (err) {
                    reject(err);
                }

            resolve(res);
        })
  }).then(res => {
      for(let i in res)
        self[i] = res[i]
  })

    
}

Deal.prototype.save = async function(){
    //console.log('we save',this)
    if(this._id == undefined || !this._id){
        let self = this
        db.insert(this,function(err,deal){
            self.getActive()
            //throw(err) console.log(err)
            //console.log('on save',deal)
        })
        return
    }else{
        //console.log('we update',this)
        this.updateAt = Date.now()
        let values = {}
        for(let i in this)
            values[i]=this[i]
        db.update({_id:this._id},{$set:values},{},(err,num)=>{
            if(err) console.log('err',err)
            //console.log('num',num)
        })
    }
    return
}

Deal.prototype.cancel = function(){
    this.status = 'canceled'
    this.save()

}

Deal.prototype.close  = function(){
    this.status = 'closed'
    this.calcProfit()
    this.save()
}

Deal.prototype.calcProfit = function(){
    let buySum = 0
    let sellSum = 0
    for(let i in this.orders){
        if(this.orders[i].side == 'BUY')
            buySum += this.orders[i].origQty * this.orders[i].price
        else
            sellSum += this.orders[i].origQty * this.orders[i].price    
    }

    this.profit = sellSum - buySum
    
}

Deal.prototype.changeOrder = function(id,params) {
     
    for(let i in this.orders)
        if(this.orders[i].orderId == id)
            for(let j in params)
                this.orders[i][j] = params[j]

    this.checkStatus()

}

Deal.prototype.checkStatus = function(){
    let status = 'canceled'
    for (let i in this.orders){
        if(this.orders[i].status == 'NEW') status = 'open'
        if(this.orders[i].status == 'FILLED' && this.orders[i].side == 'SELL') status = 'closed'
    }
    this.status = status

    if(this.status == 'closed') this.calcProfit()

    this.save()
}

Deal.prototype.getOrderById = function(id){
    for(let i in this.orders){
        if(this.orders[i].orderId == id)
            return this.orders[i]
    }
    return false
}

Deal.prototype.getOrdersByParams = function(params){
    let orderList = []
    for(let i in this.orders){
        let itIs = true
        for(let j in params){
            if(params[j] != this.orders[i][j])
                itIs = false
            
        }
        if(itIs) orderList.push(this.orders[i])
    }
    return orderList
}

Deal.prototype.getOpenOrders = function(){
    let orders = []
    for(let i in this.orders)
        if(this.orders[i].status == 'NEW')
            orders.push(this.orders[i])
    return orders
}



module.exports = Deal
