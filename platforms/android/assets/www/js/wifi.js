var wifiHandler = function() {
    var self = this;
	self.init = function(callback) {
		console.log("Initializing Wifi");
        WifiWizard.setWifiEnabled(true,
            function(obj) {
                console.log('Properly connected to Wifi chip');
                console.log("Message " + JSON.stringify(obj));
                if (obj == 'OK') {
                    callback(true);
                }
            },
            function(obj) {
                console.log('Connection to Wifi chip failed');
                console.log('Message', obj.status);
                navigator.notification.alert(
                        'Wifi is not turned on, or could not be turned on.',
                        null,
                        'Wifi off?',
                        'Sorry!');
                callback(false);
            })
    }

    self.connectNetwork= function(SSID, key, keyType, callback) {
        console.log("Connecting Wifi to " + SSID);
        var wifiConfig= WifiWizard.formatWifiConfig(SSID,key,keyType);
        WifiWizard.addNetwork( wifiConfig,
            function() {
            console.log("Properly added network");
            console.log("attempting to connect to " + wifiConfig.SSID);
            WifiWizard.connectNetwork(wifiConfig.SSID,
                function(){
                    console.log("Connected to " + wifiConfig.SSID);
                    callback(true);
                },
                function() {
                    console.log("FAILED TO CONNECT");
                    callback(false);
                })
            },
            function(){
                console.log("FAILED TO ADD NETWORK");
                callback(false);
            });
    }

    self.getIP= function(callback){
        networkinterface.getIPAddress(function(ip){
            console.log("ip= "+ip);
            if(typeof callback== "function"){
                callback(ip);
            }
        },function(){
            console.log("connecting to wifi...");
            wifi.getIP(callback);
        });
    }
};