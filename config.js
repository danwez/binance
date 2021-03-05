const config = {
    apikey: 'THERE IS YOUR API PUBLIC KEY',
    secret: 'THERE IS YOUR API SECRET KEY',
    url: "https://api.binance.com",
    symbol : 'BNBUSDT', // Валютная пара
    tradeSym : 'BNB', // Валюта для торговли
    baseSym : 'USDT', // Базовая валюта
    minSum : 0.001, // Минимально допустимое количество валюты для торговли
    minOrderSize : 10, // Минимальный размер ордера в базовой валюте
    razryad : 4, // Количество знаков в цене после запятой в цене
    razryadQ : 3, // Количество знаков в цене после запятой в количестве
    // symbol : 'LINKUSDT', // Валютная пара
    //     tradeSym : 'LINK', // Валюта для торговли
    //     baseSym : 'USDT', // Базовая валюта
    //     minSum : 0.01, // Минимально допустимое количество валюты для торговли
    //     razryad : 4, // Количество знаков в цене после запятой в цене
    //     razryadQ : 2, // Количество знаков в цене после запятой в количестве
    extrem : 10,   // Страховой зазор до потолка за сутки в пунктах
    lifeTime : 15, // Время жизни ордера на покупку в минутах
    lotSize : 25, // Размер лота в % от дипозита
    depth: 250, // глубина стакана ордеров 5, 10, 20, 50, 100, 500, 1000, 5000
    stepTime: 10, // задержка между запросами торговли в секундах
    password: "5TGB5tgb", // пароль для интерфейса
    autoSymbol: true, // разрешить режим автоматического выбора пары по данным рынка
}

module.exports = config 
