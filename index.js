var Service, Characteristic;

var request = require('request');
var CryptoJS = require("crypto-js");

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-thekeys", "TheKeys", TheKeysAccessory);
}

function TheKeysAccessory(log, config) {
  this.log = log;
  
  this.log("Create new instance of TK accessory");

  
  this.name = config["name"];
  this.lockerName = config["locker_name"] || this.name;
  this.lockerState = Characteristic.LockTargetState.UNSECURED; 
  this.code = config["code"];
  this.identifier = config["identifier"];
  this.log("Starting a TK locker device with name '" + this.lockerName + "'...");
  this.tkService = new Service.LockMechanism(this.name);
}

TheKeysAccessory.prototype.get_state = function(callback) {
  //TODO: this should be implemented!
  this.log("state of %s: %d", this.lockerName, this.lockerState);
  
  callback(null, this.lockerState);
}

TheKeysAccessory.prototype.action = function(action, callback) {
  this.log("action on %s: %d", this.lockerName, action);
  if(this.isExecuting)  {
      this.log("already executing");
      return;
  }
  this.isExecuting = true;
  var ts = ""+Math.floor(Date.now() / 1000);
  var hash = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(ts, this.code));
  //this.log("code: " + this.code);
  //this.log("ts: " + ts);
  //this.log("hash: " + hash);
    
  var actionStr = null;
  if (action == Characteristic.LockTargetState.UNSECURED) {
      actionStr = "open";
    this.log("open %s", this.lockerName);
  } else {
      actionStr = "close";
    this.log("close %s", this.lockerName);
  }

  var self = this;
  request.post({
                url: 'http://thekeys.local/' + actionStr, 
            headers: {'content-type' : 'application/x-www-form-urlencoded'}, 
                body: 'identifier='+this.identifier+ '&ts='+ ts + '&hash=' + hash
                },  
                function(err, httpResponse, body) {
                    self.isExecuting = false;        
                    
                    if(err != null) {
                        callback(err);
                    } else {
                        res = JSON.parse(body);    
                        if(res["code"] != 0) {
                            callback(res["cause"]);
                        } else {
                            self.lockerState = action;
                            self.tkService.setCharacteristic(Characteristic.LockTargetState, action);
                            self.log("Done: " + body);
                            self.log("Error: " + err);
                            callback();
                        }
                        
                    }
            });
}

TheKeysAccessory.prototype.getServices = function() {    
    this.tkService
      .getCharacteristic(Characteristic.LockTargetState)
      .on('get', this.get_state.bind(this))
      .on('set', this.action.bind(this));

    this.tkService
      .getCharacteristic(Characteristic.LockCurrentState)
      .on('get', this.get_state.bind(this));

    return [this.tkService];
}


