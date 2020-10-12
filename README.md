# binance
Automatic trade system on Binance API

Зарегистрируйтесь по моей ссылке https://www.binance.com/ru/register?ref=OG39WQGA в этом случае вы будете получать кешбек 10%

Пройдите верификацию аккаунта https://www.binance.com/ru/my/settings/profile




    this.apikey= 'THERE IS YOUR API PUBLIC KEY'
    this.secret= 'THERE IS YOUR API SECRET KEY'
    
    
    
    this.url= "https://api.binance.com"
    this.symbol = 'BNBUSDT' // Валютная пара
    this.exSymbols = []
    this.tradeSym = 'BNB' // Валюта для торговли
    this.baseSym = 'USDT' // Базовая валюта
    this.minSum = 0.001; // Минимально допустимое количество валюты для торговли
    this.extrem = 50   // Страховой зазор до потолка за сутки в пунктах
