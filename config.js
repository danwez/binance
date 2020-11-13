const config = {
    apikey: 'AQhm85zNCjgZlkNTA0nCME9lGnJaOqtcfw3NnDsUd5VN8wBQQh8Leik8kj4L9eX9',
    secret: 'D3iLavX6u2UGE07g3tOLTmlEnrmEwjfxxxb7SqnA5qQWwMxhbeRoes3B0cUQz7Ka',
    url: "https://api.binance.com",
    symbol : 'BNBUSDT', // Валютная пара
    tradeSym : 'BNB', // Валюта для торговли
    baseSym : 'USDT', // Базовая валюта
    minSum : 0.001, // Минимально допустимое количество валюты для торговли
    razryad : 4, // Количество знаков в цене после запятой в цене
    razryadQ : 3, // Количество знаков в цене после запятой в количестве
    // symbol : 'LINKUSDT', // Валютная пара
    //     tradeSym : 'LINK', // Валюта для торговли
    //     baseSym : 'USDT', // Базовая валюта
    //     minSum : 0.01, // Минимально допустимое количество валюты для торговли
    //     razryad : 4, // Количество знаков в цене после запятой в цене
    //     razryadQ : 2, // Количество знаков в цене после запятой в количестве
    extrem : 5,   // Страховой зазор до потолка за сутки в пунктах
    lifeTime : 15, // Время жизни ордера на покупку в минутах
    lotSize : 50, // Размер лота в % от дипозита
    depth: 100, // глубина стакана ордеров 5, 10, 20, 50, 100, 500, 1000, 5000
    stepTime: 5 // задержка между запросами торговли в секундах
}

module.exports = config 
