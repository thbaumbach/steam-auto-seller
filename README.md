# steam-auto-seller

> auto-sell items from your Steam inventory

Be careful, it's a just-for-fun project and not thoroughly tested. No guaranty or warranty for anything.

The price will be set to `(lowest_price / 1.15 - 0.02) €/$` aka 0.01 below the lowest current price (according to the Steam API).

## HowTo

Go to `steamcommunity.com` and login. Check the cookies (CTRL+i) and extract `sessionid` and `steamLoginSecure`.

Replace the value of `SESSION_ID` and `STEAM_LOGIN_SECURE` in the file `index.js` with the data from the cookie.

Run

```
$ npm install
$ node index.js
```

This will automatically create sell orders for you Steam inventory (e.g. tradings card, etc.). One at a time due to limitations of the Steam web API.

Recommended: Logout from `steamcommunity.com` when you're done.

## Known Issues

* sometimes confirmation requests are stuck, just reset them on the "Market" page
* issues with the API, just re-run the tool

## TODO

* command-line input or login
* refactor code

## License

```
"THE BEER-WARE LICENSE" (Revision 42):
<tom@xolo.pw> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return - Thomas Baumbach
```
