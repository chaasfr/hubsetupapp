Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var DEBUG = true; // enable debug, some UI elements are only shown if DEBUG is set to true


var wifi;
var ble;

var searchingWifi;
var connectingWifi;
var IP;

var searchingBLE;
var connectedBLE;
var connectingBLE;

var connectedNetwork;
var connectedDeviceBLE;

var SSID= "RF_Almende";
var password;
var keyType='WPA';

var hub = {

	// array with info of partners (and ourselves), like address, logo, description, etc.
	partnersById: {},

	// map of wifi network
	networks: {},

    // map of crownstones
    crownstones: {},


	/* Start should be called if all plugins are ready and all functionality can be called.
	 */
	start:function() {
		// set up wifi connection
		wifi.init(function(enabledWifi) {
			$('#wifiScanBtn').prop("disabled", !enabledWifi);
		});
		ble.init(function(enabled) {
            $('#findCrownstones').prop("disabled", !enabled);
            searchCrownstones();
        });
	},

	create:function() {
		var self = this;

		console.log("---------------------------------------------------------");
		console.log("----- Distributed Organisms B.V. (http://dobots.nl) -----");
		console.log("---------------------------------------------------------");
		console.log("Start Hub application");

		wifi = new wifiHandler();
        ble= new BLEHandler();

		// if debug is disabled, hide everything with class debug
		if (!DEBUG) {
			$(".debug").hide();
		}

		searchingWifi = false;
		connectedWifi = false;
		connectingWifi = false;

        searchingBLE = true;
        connectedBLE = false;
        connectingBLE = false;

		connectedNetwork = "";
        connectedDeviceBLE = "";

		$("#selectionPage").on("pagecreate", function(event) {
			// get partner information
			console.log("Get partner information");
			$.getJSON('data/partners.js', function(partners) {
				console.log("Update data structure with partner information");

				for (var c = 0; c < partners.length; c++) {
					var partner = partners[c];
					self.partnersById[partner.id] = partner;
				}
			}).error(function() {
				console.log("Did you make an error in the data/partners.js file?");
			}).success(function() {
				console.log("Retrieved data structure successfully");
			});

			console.log("Add event handler to on-click event for a listed crownstone");
			$('#findCrownstones').on('click', function(event) {
				console.log("User clicks button to start searching for crownstones");

				if (!searchingBLE) {
					searchingBLE = true;
					searchCrownstones();
				} else {
					searchingBLE = false;
					stopSearch();
					console.log("sort");
				}
			});
		});

		searchCrownstones = function() {
			$('#wantedCrownstone').html("Wanted Crownstone: ");
			var map = {};

			findCrownstones(function(obj) {

				if (!map.hasOwnProperty(obj.address)) {
					map[obj.address] = {'name': obj.name, 'rssi': obj.rssi};
				} else {
					map[obj.address]['rssi'] = obj.rssi;
				}

				wanted_rssi = -128;
				wanted_name = "";
				for (var el in map) {

					if (map[el]['name'].indexOf("crown") > -1) {
						wanted_rssi = map[el]['rssi'];
						wanted_name = map[el]['name'];
                        if (searchingBLE) {
                            searchingBLE = false;
                            stopSearch();
                        }
                        var timeout = 5;
                        connect(el, timeout,
                            function(){
                                readWifi(el,
                                    function(){
                                    console.log("got wifi infos");
                                    },
                                    function(){
                                    console.log("error: couldn't get wifi infos");
                                });
                                connectWifi(SSID,password,keyType,
                                    function(){
                                        wifi.getIP(function(ip){
                                            IP= ip;
                                            console.log("IP found= " + IP);
                                            writeIP(el,function(){
                                                    console.log("wrote IP");
                                                },function(){
                                                    console.log("failed to write IP");
                                                });
                                        });
                                    },
                                    function(){
                                        console.log("connectWifi failed");
                                    }
                                );
                            },
                            connectionFailed);
					}
				}

				$('#wantedCrownstone').html("Wanted Crownstone: <b>" + wanted_name + "</b>");

			});
		}

		findCrownstones = function(callback) {
			console.log("Find crownstones");
			ble.startEndlessScan(callback);
		}

		stopSearch = function() {
			$('#findCrownstones').html("Restart");
			console.log("stop search");
			ble.stopEndlessScan();
		}

		connect = function(address, timeout, successCB, errorCB) {
			if (!(connectedBLE || connectingBLE)) {
				connectingBLE = true;
				console.log("connecting to " + address);
				//
				ble.connectDevice(address, timeout, function(success) {
					connectingBLE = false;
					if (success) {
						connectedBLE = true
						connectedDeviceBLE = address;
						successCB();
					} else {
						var msg = "Connection failure";
						errorCB(msg);
					}
				});
			}
		}

		connectWifi= function(SSID, password, keyType, successCB, errorCB){
            wifi.connectNetwork(SSID, password, keyType, function(connectedWifi) {
                   if(connectedWifi){
                       successCB();
                   }
                   else errorCB();
            });
		}

		readWifi= function(address,successCB, errorCB){
            ble.selectConfiguration(
                address,
                configWifiUuid,
                ble.getConfiguration(
                    address,
                    function(configuration){
                        SSID=bluetoothle.bytesToString(configuration.payload.SSID);
                        password=bluetoothle.bytesToString(configuration.payload.key);
                        successCB();
                    },
                    errorCB
                ),
                errorCB
            );
		}

		writeIP=function(address, successCB, errorCB){
            var configuration= {};
            configuration.type=configWifiUuid;
            configuration.length=4;
            configuration.payload= IP.split('.');
            ble.writeConfiguration(address,configuration,successCB,errorCB);
		}

		connectionFailed = function() {
			if (!connectedBLE) {
				navigator.notification.alert(
						'Could not connect to network',
						null,
						'Wifi error',
						'Sorry!');
			} else {
				navigator.notification.alert(
						'Wifi disconnected!!',
						function() {
							// go back to selection page
							$('#crownstone').hide();
							history.back();
						},
						'Wifi error',
						'Try again!');
			}
		}
	}
}

