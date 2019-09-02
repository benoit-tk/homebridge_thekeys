# homebridge_thekeys

## install the plugin

```console
git clone https://github.com/benoit-tk/homebridge_thekeys.git
cd homebridge_thekeys
npm install -g .
```


## Requirement

* A smartlock The Keys: https://store.the-keys.fr/fr/serrure/8-serrure-connecte.html
* A gateway: https://store.the-keys.fr/fr/accessoires/11-gateway.html
* The locker need to be at version 57 for the update status from main loop

![Pack domotique](https://www.the-keys.eu/195-large_default/pack-domotique.jpg)


## Create the access

* Create an access for the gateway from the app or from https://api.the-keys.fr
* Open the share on https://api.the-keys.fr to get the share code
![Share](/screenshots/share.png)

## Configure the plugin
Find the "ID Serrure" from api.the-keys.fr (here 1751): 
![Configuration](/screenshots/conf_serrure.png)

Edit config.json (~/.homebridge/config.json), and add the configuration:

```json
    "accessories": [
        ....,
        {
            "accessory":      "TheKeys",
            "name":           "TK Maison",
            "locker_name":    "TK Maison",
            "identifier":     "1751",
            "code":           "0Ge3uGsPVYwVxLZM",
            "ip":             "192.168.0.10"
        }
    ]
```
