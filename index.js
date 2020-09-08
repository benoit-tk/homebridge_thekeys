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
  this.ip = config["ip"];
  this.identifier = config["identifier"];
  this.lastLog = 0;
  this.log("Starting a TK locker device with name '" + this.lockerName + "'...");
  this.log('Gateway ip: ' + this.ip);
  this.tkService = new Service.LockMechanism(this.name);

  setInterval(function () {
      this.check_locker(function () {})
  }.bind(this), 5000)
}

TheKeysAccessory.prototype.check_locker = function(callback) {
  self = this;
  this.log("check lockers");
  request.get({
                url: "http://" + this.ip + "/lockers",
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
                timeout: 10000
                },
                function(err, httpResponse, body) {
                  //self.log(body);
                  try{
                    res = JSON.parse(body);
                  } catch(err) {
                    callback();
                    return;
                  }

                  for(var l in res["devices"]) {
                    var locker = res["devices"][l];
                    //self.log(locker["identifier"]);
                    if(locker["identifier"] == self.identifier && self.lastLog != locker["last_log"]) {
                      self.get_state(callback);
                      self.lastLog = locker["last_log"];
                    }
                  }
                }
  );
}

TheKeysAccessory.prototype.get_current_state = function(callback) {
  this.log("current state of %s: %d", this.lockerName, this.lockerState);
  callback(null, this.lockerState);
}

TheKeysAccessory.prototype.get_state = function(callback) {
  this.log("state of %s: %d", this.lockerName, this.lockerState);
  if(this.isExecuting)  {
      this.log("already executing");
      return;
  }
  this.isExecuting = true;
  var ts = ""+Math.floor(Date.now() / 1000);
  var hash = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(ts, this.code));

  var url = 'http://' + this.ip + '/locker_status';
  var body = 'identifier='+this.identifier+ '&ts='+ ts + '&hash=' + hash;
  this.log("Calling url: " + url);
  this.log("   body: " + body);
  var self = this;

  request.post({
                url: url,
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
                body: body,
                timeout: 10000
                },
                function(err, httpResponse, body) {
                    self.isExecuting = false;
                    self.log(body);
                    if(err != null) {
                        self.log(err);
                        callback(err);
                    } else {
                        try{
                          res = JSON.parse(body);
                        } catch(err) {
                          callback();
                        }
                        if(res["code"] == 49) {
                          self.lockerState = Characteristic.LockTargetState.SECURED;
                          self.tkService.getCharacteristic(Characteristic.LockCurrentState).updateValue(self.lockerState, undefined, null);
                          self.tkService.getCharacteristic(Characteristic.LockTargetState).updateValue(self.lockerState, undefined, null);
                          callback();
                        } else if(res["code"] == 50) {
                          self.lockerState = Characteristic.LockTargetState.UNSECURED;
                          self.tkService.getCharacteristic(Characteristic.LockCurrentState).updateValue(self.lockerState, undefined, null);
                          self.tkService.getCharacteristic(Characteristic.LockTargetState).updateValue(self.lockerState, undefined, null);
                          callback();
                        } else {
                            self.log(body);
                            callback(res["error"]);
                        }


                    }
            });
}

TheKeysAccessory.prototype.action = function(action, callback, context) {
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
  var url = 'http://' + this.ip + '/' + actionStr;
  var body = 'identifier='+this.identifier+ '&ts='+ ts + '&hash=' + hash;
  this.log("Calling url: " + url);
  this.log("   body: " + body);

  var self = this;
  request.post({
                url: url,
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
                body: body,
                timeout: 10000
                },
                function(err, httpResponse, body) {
                    self.isExecuting = false;

                    if(err != null) {
                        self.log(err);
                        callback(err);
                    } else {
                        res = JSON.parse(body);
                        if(res["code"] != 0) {
                            self.log(body);
                            callback(res["error"]);
                        } else {
                            self.lockerState = action;
                            self.tkService.getCharacteristic(Characteristic.LockTargetState).updateValue(action, undefined, null);
                            self.tkService.getCharacteristic(Characteristic.LockCurrentState).updateValue(action, undefined, null);
                            //self.log("Done: " + body);
                            //self.log("Error: " + err);
                            callback();
                        }

                    }
            });
}

TheKeysAccessory.prototype.getServices = function() {
    this.tkService
      .getCharacteristic(Characteristic.LockTargetState)
      .on('get', this.get_current_state.bind(this))
      .on('set', this.action.bind(this));

    this.tkService
      .getCharacteristic(Characteristic.LockCurrentState)
      .on('get', this.get_current_state.bind(this));

    return [this.tkService];
}
