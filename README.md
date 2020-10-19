# binance
Automatic trade system on Binance API

Зарегистрируйтесь по моей ссылке https://www.binance.com/ru/register?ref=OG39WQGA в этом случае вы будете получать кешбэк 10%

Пройдите верификацию аккаунта https://www.binance.com/ru/my/settings/profile

Создайте ключ API
https://www.binance.com/ru/usercenter/settings/api-management

полученные значения ключей вставьте в файле config.js вот в эти строки:

    apikey: 'THERE IS YOUR API PUBLIC KEY',
    secret: 'THERE IS YOUR API SECRET KEY',
    
Дополнительные натройки можно проделать в данных строках
    
    symbol : 'BNBUSDT', // Валютная пара
    tradeSym : 'BNB', // Валюта для торговли
    baseSym : 'USDT', // Базовая валюта
    minSum : 0.001, // Минимально допустимое количество валюты для торговли
    extrem : 50,   // Страховой зазор до потолка за сутки в пунктах
    lifeTime : 15 // Время жизни ордера на покупку в минутах
    

Для работы скрипта необходимо иметь установленную на компьютере nodejs.
Скачать и установить отсюда https://nodejs.org/en/download/

После установки запустите командную строку, перейдите в папку со скаченным и настроеным скриптом и запустите команду npm install

Пополните кошелек USDT основного аккаунта на сумму не менее 5 USDT и не более, чем вы хотите рискнуть.

по окончании установки запускаем скрипт командой node index.js
