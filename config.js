const config = {
    apikey: '',
    secret: '',
    url: "https://api.binance.com",
    symbol : 'BNBUSDT', // Валютная пара
    tradeSym : 'BNB', // Валюта для торговли
    baseSym : 'USDT', // Базовая валюта
    minSum : 0.001, // Минимально допустимое количество валюты для торговли
    extrem : 50,   // Страховой зазор до потолка за сутки в пунктах
    lifeTime : 15 // Время жизни ордера на покупку в минутах
}

module.exports = config 
