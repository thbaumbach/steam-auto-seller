/*
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <tom@xolo.pw> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return - Thomas Baumbach
 */

// IMPORTS
const request = require('request'),
    async = require('async');

// USER / STEAM DATA
const SESSION_ID = '< get from cookie at steamcommunity.com >',
    STEAM_LOGIN_SECURE = decodeURIComponent('< get from cookie at steamcommunity.com >'), // contains "||" or "%7C%7C"
    USER_ID = STEAM_LOGIN_SECURE.split('||')[0];
    REFERER = `https://steamcommunity.com/profiles/${USER_ID}/inventory/`,
    COOKIE = `sessionid=${SESSION_ID}; steamLoginSecure=${encodeURIComponent(STEAM_LOGIN_SECURE)}`,
    APP_ID = 753, // Steam Inventory
    CONTEXT_ID = 6, // Context Id
    CURRENCY_ID = 3, // Euro
    TIMEOUT = 8000;

// item handler, the actual workflow...
const handleItem = (asset, description, callback) => {
    Promise.resolve()
        .then(() => {
            ////////////////////////////////////////////////////////////////////
            // 1. add some timeout (first)
            return new Promise((resolve, reject) => {
                if (description.marketable === 1) {
                    setTimeout(() => {
                        resolve();
                    }, TIMEOUT);
                } else {
                    console.log('not marketable, skip');
                    reject();
                }
            })
        })
        .then(() => {
            ////////////////////////////////////////////////////////////////////
            // 2. get price for specified asset type
            return new Promise((resolve, reject) => {
                request(
                    {
                        method: 'GET'
                        , uri: `https://steamcommunity.com/market/priceoverview/?country=DE&currency=${CURRENCY_ID}&appid=${APP_ID}&market_hash_name=${description.market_hash_name}`
                        , gzip: true
                        , headers: {
                            'Cookie': COOKIE,
                        }
                    }, (error, response, body) => {
                        if (error) {
                            console.log('item-get-error, skip', error);
                            reject();
                        } else {
                            resolve(body);
                        }
                    }
                );
            })
        })
        .then(body => {
            ////////////////////////////////////////////////////////////////////
            // 3. prepare price data
            return new Promise((resolve, reject) => {
                let data = null;
                try {
                    data = JSON.parse(body);
                } catch (err) {
                    console.log('item-parse-error, skip', err, body);
                    reject();
                }

                if (data) {
                    resolve(data);
                } else {
                    console.log('item-no-data-error, skip', body);
                    reject();
                    // resolve({ lowest_price:'0,03€' }); // set minimum price (i.e. 0,01€ + fees) if no data available
                }
            })
        })
        .then(data => {
            ////////////////////////////////////////////////////////////////////
            // 4. calculate sell price
            return new Promise((resolve, reject) => {
                let value = 0;
                try {
                    value = parseInt(data.lowest_price.replace('€','').replace('$','').replace(',','').replace('.',''))
                } catch (err) {
                    console.log('item-value-error, skip', err, data);
                    // reject is called later
                }

                if (value > 0) {
                    let newvalue = Math.floor(value / 1.15) - 2; // <<<<<<<<<<<<<< PRICE IS SET HERE !!!!
                    newvalue = newvalue < 1 ? 1 : newvalue;
                    resolve({
                        value_lowest: value,
                        value_sell: newvalue,
                    });
                } else {
                    console.log('item-no-value-error, skip', value);
                    reject();
                }
            })
        })
        .then(price => {
            ////////////////////////////////////////////////////////////////////
            // 5. add some timeout (second)
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(price);
                }, TIMEOUT);
            })
        })
        .then(price => {
            ////////////////////////////////////////////////////////////////////
            // 6. post item trade
            return new Promise((resolve, reject) => {
                const formData = {
                    sessionid: SESSION_ID,
                    appid: APP_ID,
                    contextid: CONTEXT_ID,
                    assetid: asset.assetid,
                    amount: 1,
                    price: price.value_sell
                };
                request(
                    {
                        method: 'POST'
                        , uri: 'https://steamcommunity.com/market/sellitem/'
                        , gzip: true
                        , headers: {
                            'Cookie': COOKIE,
                            'Referer': REFERER,
                        }
                        , form: formData
                    }, (error, response, body) => {
                        if (error) {
                            console.log('item-post-error', error);
                            reject('item-post-error');
                        } else {
                            let data = null;
                            try {
                                data = JSON.parse(body);
                                if (data.success) {
                                    console.log(`trade: lowest_price ${price.value_lowest}, sell_price: ${price.value_sell} + fees ${data.requires_confirmation ? '--> REQUIRES CONFIRMATION' : ''}`);
                                } else {
                                    console.log(`fail: ${data.message}`);
                                }
                                resolve();
                            } catch (err) {
                                console.log('result-parse-error', err, body);
                                reject('result-parse-error');
                            }
                        }
                    }
                );
            })
        })
        .then(() => {
            ////////////////////////////////////////////////////////////////////
            // 7. done
            callback();
        })
        .catch(error => {
            ////////////////////////////////////////////////////////////////////
            // error handling / skip item
            if (error)
                callback(error); // error, quit
            else
                callback(); // just skip item
        });
}

//
// START HERE
//

////////////////////////////////////////////////////////////////////
// 0. get all items from inventory for specified APP_ID
request(
    {
        method: 'GET'
        , uri: `https://steamcommunity.com/inventory/${USER_ID}/${APP_ID}/${CONTEXT_ID}?l=english&count=1000`
        , gzip: true
        , headers: {
            'Cookie': COOKIE,
        }
    }, (error, response, body) => {
        if (error) {
            console.log('inventory-get-error', error);
        } else {
            let data = null;
            try {
                data = JSON.parse(body);
            } catch (err) {
                console.log('inventory-parse-error', err);
            }

            if (data) {
                let i = 0;
                // handle all items, one by one
                async.eachLimit(data.assets, 1, (asset, callback) => {
                    const description = data.descriptions[i];
                    ++i;
                    if (asset && description) {
                        console.log(`${i}/${data.assets.length}: ${description.type} - ${description.market_name} --> ${asset.assetid}`);
                        handleItem(asset, description, callback);
                    } else {
                        console.log('item-no-asset-description-error, skip');
                        callback();
                    }
                }, err => {
                    if (err)
                        console.log('ERROR', err);
                    console.log('done.');
                });
            } else {
                console.log('ERROR', 'no data :(');
            }
        }
    }
);
