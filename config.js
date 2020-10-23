const config = {
    apikey: 'THERE IS YOUR API PUBLIC KEY',
    secret: 'THERE IS YOUR API SECRET KEY',
    url: "https://api.binance.com",
    symbol : 'BNBUSDT', // Валютная пара
    tradeSym : 'BNB', // Валюта для торговли
    baseSym : 'USDT', // Базовая валюта
    minSum : 0.001, // Минимально допустимое количество валюты для торговли
    razryad : 4, // Количество знаков в цене после запятой в цене
    razryadQ : 3, // Количество знаков в цене после запятой в количестве

    extrem : 15,   // Страховой зазор до потолка за сутки в пунктах
    lifeTime : 15, // Время жизни ордера на покупку в минутах
    lotSize : 25, // Размер лота в % от дипозита
    stepPrice : 50, // Шаг цены в каскаде ордеров на покупку в % от суточного канала (max - min)
    
}

module.exports = config 
