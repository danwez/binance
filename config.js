const config = {
    apikey: 'THERE IS YOUR API PUBLIC KEY',
    secret: 'THERE IS YOUR API SECRET KEY',
    url: "https://api.binance.com",
    symbol : 'BNBUSDT', // Валютная пара
    tradeSym : 'BNB', // Валюта для торговли
    baseSym : 'USDT', // Базовая валюта
    minSum : 0.001, // Минимально допустимое количество валюты для торговли
    extrem : 20,   // Страховой зазор до потолка за сутки в пунктах
    lifeTime : 15, // Время жизни ордера на покупку в минутах
    lotSize : 25, // Размер лота в % от дипозита
    stepPrice : 50, // Шаг цены в каскаде ордеров на покупку в % от суточного канала (max - min)
    razryad : 4 // Количество знаков в цене после запятой
}

module.exports = config 
