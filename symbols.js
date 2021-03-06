const symbols = [
    {
        symbol : 'BNBUSDT', // Валютная пара
        tradeSym : 'BNB', // Валюта для торговли
        baseSym : 'USDT', // Базовая валюта
        minSum : 0.001, // Минимально допустимое количество валюты для торговли
        minOrderSize : 10, // Минимальный размер ордера в базовой валюте
        lifeTime : 15, // Время жизни ордера на покупку в минутах
        razryad : 4, // Количество знаков в цене после запятой
        razryadQ : 3, // Количество знаков после запятой в количестве
    },
    {
        symbol : 'ADABUSD', // Валютная пара
        tradeSym : 'ADA', // Валюта для торговли
        baseSym : 'BUSD', // Базовая валюта
        minSum : 0.1, // Минимально допустимое количество валюты для торговли
        minOrderSize : 10, // Минимальный размер ордера в базовой валюте
        razryad : 5, // Количество знаков в цене после запятой
        razryadQ : 1, // Количество знаков после запятой в количестве
        //depth:400,
    },
    {
        symbol : 'ETHUSDT', // Валютная пара
        tradeSym : 'ETH', // Валюта для торговли
        baseSym : 'USDT', // Базовая валюта
        minSum : 0.00001, // Минимально допустимое количество валюты для торговли
        minOrderSize : 10, // Минимальный размер ордера в базовой валюте
        razryad : 2, // Количество знаков в цене после запятой
        razryadQ : 5, // Количество знаков после запятой в количестве
    },
    {
        symbol : 'BTCUSDT', // Валютная пара
        tradeSym : 'BTC', // Валюта для торговли
        baseSym : 'USDT', // Базовая валюта
        minSum : 0.00001, // Минимально допустимое количество валюты для торговли
        minOrderSize : 10, // Минимальный размер ордера в базовой валюте
        razryad : 2, // Количество знаков в цене после запятой
        razryadQ : 6, // Количество знаков после запятой в количестве
    },
    {
        symbol : 'DOGEUSDT', // Валютная пара
        tradeSym : 'DOGE', // Валюта для торговли
        baseSym : 'USDT', // Базовая валюта
        minSum : 1, // Минимально допустимое количество валюты для торговли
        minOrderSize : 10, // Минимальный размер ордера в базовой валюте
        razryad : 7, // Количество знаков в цене после запятой
        razryadQ : 0, // Количество знаков после запятой в количестве
    },
    {
        symbol : 'DOGEBTC', // Валютная пара
        tradeSym : 'DOGE', // Валюта для торговли
        baseSym : 'BTC', // Базовая валюта
        minSum : 1, // Минимально допустимое количество валюты для торговли
        minOrderSize : 0.0001, // Минимальный размер ордера в базовой валюте
        razryad : 8, // Количество знаков в цене после запятой
        razryadQ : 0, // Количество знаков после запятой в количестве
    },
    
]

module.exports = symbols