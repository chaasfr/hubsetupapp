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
var connectedDeviceAddress;

var SSID;
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
				    if(connectedBLE) {
                        ble.disconnectDevice(connectedDeviceAddress,
                            function(){
                                connectedBLE= false;
 //                               searchCrownstones();
                            },function(){
                            console.log("error: couldn't disconnect");
                            }
                        );
				    } else {
				    searchingBLE = true;
				    connectedBLE= false;
				    searchCrownstones();
				    }
				} else {
					searchingBLE = false;
					stopSearch();
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

					if (map[el]['name'].indexOf("wifi") > -1) {
                        connectedDeviceAddress=el;
						wanted_rssi = map[el]['rssi'];
						wanted_name = map[el]['name'];
                        if (searchingBLE) {
                            searchingBLE = false;
                            stopSearch();
                        }
                        var timeout = 10;
                        connectAndDiscover(
                            connectedDeviceAddress,
                            generalServiceUuid,
                            selectConfigurationCharacteristicUuid,
                            function(){
                                connectedBLE=true;
                                selectWifi(
                                    connectedDeviceAddress,
                                    function(){ //errorCB readWifi
                                        console.log("error: couldn't get wifi infos");
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

		selectWifi= function(address, errorCB){
            ble.selectConfiguration(
                address,
                configWifiUuid,
                readWifi,
                function(){
                    errorCB();
                    console.log("error: couldn't select the configuration");
                }
            )
        }

        readWifi= function(){
            ble.getConfiguration( //selectconfig successCB
                connectedDeviceAddress,
                function(configuration){ //get config successCB
                    var string;
                    string=bluetoothle.bytesToString(configuration.payload);
                    var json = JSON.parse(string);
                    console.log("json= "+json);
                    SSID=json.ssid;
                    password=json.key;
                    console.log("SSID= " + SSID + " password= " + password + "typeof(string)= " + typeof(string));
                    connectWifi(SSID,password,keyType,
                        function(){ //successCB connectWifi
                            wifi.getIP(function(ip){ //successCB getIP
                                IP= ip;
                                writeIP(
                                    connectedDeviceAddress,
                                    function(){ //successCB writeIP
//                                        ble.disconnectDevice(
//                                            connectedDeviceAddress,
//                                            function(){ //succesCB disconnect
////                                                                    console.log("disconnected successfully");
//                                            },function(){ //errorCB disconnect
////                                                                    console.log("error: couldn't disconnect");
//                                            }
//                                        );
                                    console.log("succesCB writeIP");
                                    },function(){ //errorCB writeIP
//                                                            console.log("failed to write IP");
                                    }
                                );
                            });
                        },
                        function(){ //errorCB connectWifi
//                                                console.log("connectWifi failed");
                        }
                    );
                },
                function(){
//                    errorCB();
                    console.log("error: couldn't get the configuration");
                }
            );
        }

		writeIP=function(address, successCB, errorCB){
            var u8 = new Uint8Array(IP.length);
            u8 = bluetoothle.stringToBytes(IP);
            var configuration= {};
            configuration.type=configWifiUuid;
            configuration.length=IP.length;
            configuration.payload= u8;
            console.log("payload= " + configuration.payload + " payload[1]= " + configuration.payload[1] + " typeof(payload)= " + typeof(configuration.payload));
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

        connectAndDiscover = function(address, serviceUuid, characteristicUuid, successCB, errorCB) {
            var timeout = 10; // 10 seconds here
            /*
                var connected = ble.isConnected(address);
                if (connected) {
                console.log("Device is already connected");
                } else {
                console.log("Device is not yet connected");
                }*/
            console.log("Connect to service " + serviceUuid + " and characteristic " + characteristicUuid);
            connect(
                    address,
                    timeout,
                    function connectionSuccess() {
                        ble.discoverCharacteristic(
                                address,
                                serviceUuid,
                                characteristicUuid,
                                successCB,
                                function discoveryFailure(msg) {
                                    console.log(msg);
                                    disconnect();
                                    errorCB(msg);
                                }
                                )
                    },
                    function connectionFailure(msg) {
                        errorCB(msg);
                    }
                    );
        }

	}
}

