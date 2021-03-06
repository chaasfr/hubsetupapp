//////////////////////////////////////////////////////////////////////////////
// Indoor Localization Service
var indoorLocalizationServiceUuid = '7e170000-429c-41aa-83d7-d91220abeb33';
// Indoor Localization Service - Characteristics
var rssiUuid = '7e170001-429c-41aa-83d7-d91220abeb33';
var addTrackedDeviceUuid = '7e170002-429c-41aa-83d7-d91220abeb33';
var deviceScanUuid = '7e170003-429c-41aa-83d7-d91220abeb33';
var deviceListUuid = '7e170004-429c-41aa-83d7-d91220abeb33';
var listTrackedDevicesUuid = '7e170005-429c-41aa-83d7-d91220abeb33';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// General Service
var generalServiceUuid = 'f5f90000-59f9-11e4-aa15-123b93f75cba';
// General Service - Characteristics
var temperatureCharacteristicUuid = 'f5f90001-59f9-11e4-aa15-123b93f75cba';
var changeNameCharacteristicUuid = 'f5f90002-59f9-11e4-aa15-123b93f75cba';
var setConfigurationCharacteristicUuid = 'f5f90007-59f9-11e4-aa15-123b93f75cba';
var selectConfigurationCharacteristicUuid = 'f5f90008-59f9-11e4-aa15-123b93f75cba';
var getConfigurationCharacteristicUuid = 'f5f90009-59f9-11e4-aa15-123b93f75cba';
var deviceTypeUuid = 'f5f90003-59f9-11e4-aa15-123b93f75cba';
var roomUuid = 'f5f90004-59f9-11e4-aa15-123b93f75cba';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Power Service
var powerServiceUuid = '5b8d0000-6f20-11e4-b116-123b93f75cba';
// Power Service - Characteristics
var pwmUuid = '5b8d0001-6f20-11e4-b116-123b93f75cba';
var sampleCurrentUuid = '5b8d0002-6f20-11e4-b116-123b93f75cba';
var currentCurveUuid = '5b8d0003-6f20-11e4-b116-123b93f75cba';
var currentConsumptionUuid = '5b8d0004-6f20-11e4-b116-123b93f75cba';
var currentLimitUuid = '5b8d0005-6f20-11e4-b116-123b93f75cba';
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// Configuration types
var configNameUuid                               = 0x00;
var configDeviceTypeUuid                         = 0x01;
var configRoomUuid                               = 0x02;
var configFloorUuid                              = 0x03;
var configNearbyTimeoutUuid                      = 0x04;
var configPWMFreqUuid                            = 0x05;
var configIBeaconMajorUuid                       = 0x06;
var configIBeaconMinorUuid                       = 0x07;
var configIBeaconUuidUuid                        = 0x08;
var configIBeaconRSSIUuid                        = 0x09;
var configWifiUuid                               = 0x0A;

var RESERVED = 0xFF;

//////////////////////////////////////////////////////////////////////////////


var BLEHandler = function() {
	var self = this;
	var addressKey = 'address';
	var dobotsCompanyId = 0x1111 // has to be defined, this is only a dummy value

	var scanTimer = null;
	var connectTimer = null;
	var reconnectTimer = null;

	var iOSPlatform = "iOS";
	var androidPlatform = "Android";

	self.init = function(callback) {
		console.log("Initializing BLE");
		bluetoothle.initialize(function(obj) {
				console.log('Properly connected to BLE chip');
				console.log("Message " + JSON.stringify(obj));
				if (obj.status == 'enabled' || obj.status == 'initialized') {
					callback(true);
				}
			},
			function(obj) {
				console.log('Connection to BLE chip failed');
				console.log('Message', obj.status);
				navigator.notification.alert(
						'Bluetooth is not turned on, or could not be turned on. Make sure your phone has a Bluetooth 4.+ (BLE) chip.',
						null,
						'BLE off?',
						'Sorry!');
				callback(false);
			},
			{"request": true});
	}

	self.isConnected = function(address) {
		if (!address) return false;
		var paramsObj = {"address": address};
		var connected;
		bluetoothle.isConnected(connected, paramsObj);
		return connected;
	}

	self.reconnectDevice = function(address, timeout, callback) {
		console.log("Beginning to reconnect to " + address + " with " + timeout + " second timeout");
		var paramsObj = {"address": address};
		bluetoothle.reconnect(function(obj) { // reconnectSuccess
				if (obj.status == "connected") {
					console.log("Reconnected to: " + obj.name + " - " + obj.address);

					self.clearReconnectTimeout();

					if (callback) {
						callback(true);
					}

				}
				else if (obj.status == "connecting") {
					console.log("Reconnecting to: " + obj.name + " - " + obj.address);
				}
				else {
					console.log("Unexpected reconnect status: " + obj.status);
					self.clearReconnectTimeout();
					self.closeDevice(obj.address);
					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // reconnectError
				console.log("Reconnect error: " + obj.error + " - " + obj.message);
				self.clearReconnectTimeout();
				if (callback) {
					callback(false);
				}
			},
			paramsObj);

		self.reconnectTimer = setTimeout(function() { // connectTimeout
				console.log('Connection timed out, stop connection attempts');
				if (callback) {
					callback(false);
				}
			},
			timeout * 1000);
	}

	self.clearReconnectTimeout = function() {
		console.log("Clearing reconnect timeout");
		if (self.reconnectTimer != null) {
			clearTimeout(self.reconnectTimer);
		}
	}

	self.connectDevice = function(address, timeout, callback) {
		console.log("Beginning to connect to " + address + " with " + timeout + " second timeout");
		var paramsObj = {"address": address};
		bluetoothle.connect(function(obj) { // connectSuccess
				if (obj.status == "connected") {
					console.log("Connected to: " + obj.name + " - " + obj.address);

					self.clearConnectTimeout();

					if (callback) {
						callback(true);
					}

				}
				else if (obj.status == "connecting") {
					console.log("Connecting to: " + obj.name + " - " + obj.address);
				}
				else {
					console.log("Unexpected connect status: " + obj.status);
					self.clearConnectTimeout();
					self.closeDevice(obj.address);
					if (callback) {
						callback(false);
					}
				}
			},
			function(obj) { // connectError
				console.log("Connect error: " + obj.error + " - " + obj.message);
				// for now we are gonna attempt a reconnect
				if (obj.error == 'connect') {
					// console.log("Attempt a disconnect, a reconnect didn't work");
				//	self.reconnectDevice(address, timeout, callback);
					// self.disconnectDevice(address);
					console.log("close device, try again...");
					self.closeDevice(address);
				} else {
					self.clearConnectTimeout();
					if (callback) {
						callback(false);
					}
				}
			},
			paramsObj);

		self.connectTimer = setTimeout(function() { // connectTimeout
				console.log('Connection timed out, stop connection attempts');
				if (callback) {
					callback(false);
				}
			},
			timeout * 1000);
	}

	self.clearConnectTimeout = function() {
		console.log("Clearing connect timeout");
		if (self.connectTimer != null) {
			clearTimeout(self.connectTimer);
		}
	}

	/** Discovery of services and characteristics on the target device (crownstone).
	 *
	 * Discovery must be run before any of the getters/setters can be used. Or else "Service not found" errors
	 * will be generated.
	 */
	self.discoverServices = function(address, callback, errorCB) {
		console.log("Beginning discovery of services for device" + address);
		var paramsObj = {address: address};
		bluetoothle.discover(function(obj) { // discover success
				if (obj.status == "discovered")
				{
					console.log("Discovery completed");
					var services = obj.services;
					for (var i = 0; i < services.length; ++i) {
						var serviceUuid = services[i].serviceUuid;
						var characteristics = services[i].characteristics;
						for (var j = 0; j < characteristics.length; ++j) {
							var characteristicUuid = characteristics[j].characteristicUuid;
							console.log("Found service " + serviceUuid + " with characteristic " + characteristicUuid);

							if (callback) {
								callback(serviceUuid, characteristicUuid);
							}
						}
					}
				}
				else
				{
					var msg = "Unexpected discover status: " + obj.status;
					errorCB(msg);
				}
			},
			function(obj) { // discover error
				var msg = "Discover error: " + obj.error + " - " + obj.message;
				errorCB(msg);
			},
			paramsObj);
	}

	self.discoverCharacteristic = function(address, serviceUuid, characteristicUuid, callback, errorCB) {
		var paramsObj = {address: address};
		bluetoothle.discover(function(obj) { // discover success
				if (obj.status == "discovered")
				{
					var services = obj.services;
					var success = false;
					for (var i = 0; i < services.length; ++i) {
						var sUuid = services[i].serviceUuid;
						if (sUuid != serviceUuid) continue;
						var characteristics = services[i].characteristics;
						for (var j = 0; j < characteristics.length; ++j) {
							var cUuid = characteristics[j].characteristicUuid;
							if (cUuid != characteristicUuid) continue;
							success = true;
							if (success) break;
						}
						if (success) break;
					}
					if (success) {
						callback(serviceUuid, characteristicUuid);
					} else {
						var msg = "Could not find service " + serviceUuid +
							" or characteristic " + characteristicUuid;
						errorCB(msg);
					}
				}
				else
				{
					var msg = "Unexpected discover status: " + obj.status;
					errorCB(msg);
				}
			},
			function(obj) { // discover error
				var msg = "Discover error: " + obj.error + " - " + obj.message;
				errorCB(msg);
			},
			paramsObj);
	}

	self.startEndlessScan = function(callback) {
		//console.log('start endless scan');
		var paramsObj = {}
		bluetoothle.startScan(function(obj) {  // start scan success
				if (obj.status == 'scanResult') {
					var arr = bluetoothle.encodedStringToBytes(obj.advertisement);
					self.parseAdvertisement(arr, 0xFF, function(data) {
						var value = data[0] << 8 | data[1];
						if (value == dobotsCompanyId) {
							callback(obj);
						}
					})
				} else if (obj.status == 'scanStarted') {
					//console.log('Endless scan was started successfully');
				} else {
					console.log('Unexpected start scan status: ' + obj.status);
					console.log('Stopping scan');
					stopEndlessScan();
				}
			},
			function(obj) { // start scan error
				console.log('Scan error', obj.status);
				navigator.notification.alert(
						'Could not find a device using Bluetooth scanning.',
						null,
						'Status',
						'Sorry!');
			},
			paramsObj);
	}

	self.stopEndlessScan = function() {
		//console.log("stop endless scan...");
		bluetoothle.stopScan(function(obj) { // stop scan success
				if (obj.status == 'scanStopped') {
					//console.log('Scan was stopped successfully');
				} else {
					console.log('Unexpected stop scan status: ' + obj.status);
				}
			},
			function(obj) { // stop scan error
				console.log('Stop scan error: ' + obj.error + ' - ' + obj.message);
			});
	}

	self.parseAdvertisement = function(obj, search, callback) {
		var start = 0;
		var end = obj.length;
		for (var i = 0; i < obj.length; ) {
			var el_len = obj[i];
			var el_type = obj[i+1];
			if (el_type == search) {
				var begin = i+2;
				var end = begin + el_len - 1;
				var el_data = obj.subarray(begin, end);
				callback(el_data);
				return;
			} else if (el_type == 0) {
				// console.log(search.toString(16) + " not found!");
				return;
			} else {
				i += el_len + 1;
			}
		}
	}

	/** Contains bug: when a device is in "disconnecting" state, it will never be closed.
	 */
	self.disconnectDevice = function(address, successCB, errorCB) {
		var paramsObj = {"address": address}
		bluetoothle.disconnect(function(obj) { // disconnect success
				if (obj.status == "disconnected")
				{
					console.log("Device " + obj.address + " disconnected");
					self.closeDevice(obj.address);
					if (successCB) successCB();
				}
				else if (obj.status == "disconnecting")
				{
					console.log("Disconnecting device " + obj.address);
					if (errorCB) errorCB();
				}
				else
				{
					console.log("Unexpected disconnect status from device " + obj.address + ": " + obj.status);
					if (errorCB) errorCB();
				}
			},
			function(obj) { // disconnect error
				console.log("Disconnect error from device " + obj.address + ": " + obj.error + " - " + obj.message);
				if (errorCB) errorCB();
			},
			paramsObj);
	}

	self.closeDevice = function(address){
		paramsObj = {"address": address};
		bluetoothle.close(function(obj)	{ // close success
				if (obj.status == "closed")
				{
					console.log("Device " + obj.address + " closed");
				}
				else
				{
					console.log("Unexpected close status from device " + obj.address + ": " + obj.status);
				}
			},
			function(obj) { // close error
				console.log("Close error from device " + obj.address + ": " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.scanDevices = function(address, scan) {
		var u8 = new Uint8Array(1);
		u8[0] = scan ? 1 : 0;
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + indoorLocalizationServiceUuid + ' and characteristic ' + deviceScanUuid );
		var paramsObj = {"address": address, "serviceUuid": indoorLocalizationServiceUuid, "characteristicUuid": deviceScanUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to device scan characteristic - ' + obj.status);
				} else {
					console.log('Writing to device scan characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				console.log("Error in writing device scan characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.listDevices = function(address, callback) {
		console.log("Read device list at service " + indoorLocalizationServiceUuid + ' and characteristic ' + deviceListUuid );
		var paramsObj = {"address": address, "serviceUuid": indoorLocalizationServiceUuid, "characteristicUuid": deviceListUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var list = bluetoothle.encodedStringToBytes(obj.value);
					console.log("list: " + list[0]);

					callback(list);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading device list: ' + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.writeDeviceName = function(address, value) {
		if (value != "") {
		var u8 = bluetoothle.stringToBytes(value);
		} else {
			var u8 = new Uint8Array(1);
			u8[0] = 0;
		}
		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + generalServiceUuid + ' and characteristic ' + changeNameCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": generalServiceUuid, "characteristicUuid": changeNameCharacteristicUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					console.log('Successfully written to change name characteristic - ' + obj.status);
				} else {
					console.log('Writing to change name characteristic was not successful' + obj);
				}
			},
			function(obj) { // write error
				console.log("Error in writing to change name characteristic: " + obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	self.readDeviceName = function(address, callback) {
		console.log("Read device type at service " + generalServiceUuid +
				' and characteristic ' + changeNameCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": generalServiceUuid,
			"characteristicUuid": changeNameCharacteristicUuid };
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var deviceName = bluetoothle.encodedStringToBytes(obj.value);
					var deviceNameStr = bluetoothle.bytesToString(deviceName);
					console.log("deviceName: " + deviceNameStr);

					callback(deviceNameStr);
				}
				else
				{
					console.log("Unexpected read status: " + obj.status);
					self.disconnectDevice(address);
				}
			},
			function(obj) { // read error
				console.log('Error in reading change name characteristic: ' +
					obj.error + " - " + obj.message);
			},
			paramsObj);
	}

	/** Get a specific configuration, selected before in selectConfiguration
	 */
	self.getConfiguration = function(address, successCB, errorCB) {
		console.log("Get configuration at service " + generalServiceUuid +
				' and characteristic ' + getConfigurationCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": generalServiceUuid,
			"characteristicUuid": getConfigurationCharacteristicUuid};
		bluetoothle.read(function(obj) { // read success
				if (obj.status == "read")
				{
					var bytearray = bluetoothle.encodedStringToBytes(obj.value);
					var str = bluetoothle.bytesToString(bytearray);
					var configuration = {};
					configuration.type = bytearray[0];
					configuration.length = bytearray[2];
					configuration.payload = new Uint8Array(configuration.length);
					for (var i = 0; i < configuration.length; i++) {
						configuration.payload[i] = bytearray[i+4];
					}
					successCB(configuration);
				}
				else
				{
					var msg = "Unexpected read status: " + obj.status;
					console.log(msg);
					if (errorCB) errorCB();
				}
			},
			function(obj) { // read error
				var msg = 'Error in reading "get configuration" characteristic' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	/** Writing a configuration
	 *
	 */
	self.writeConfiguration = function(address, configuration, successCB, errorCB) {

		console.log("Write to " + address + " configuration type " + configuration.type);

		// build up a single byte array, prepending payload with type and payload length, preamble size is 4
		var u8 = new Uint8Array(configuration.length+4);;
		u8[0] = configuration.type;
		u8[1] = RESERVED;
		u8[2] = (configuration.length & 0x00FF); // endianness: least significant byte first
		u8[3] = (configuration.length >> 8);
		for (var i = 0; i < configuration.length; i++) {
			u8[i+4] = configuration.payload[i];
		}


		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + generalServiceUuid +
				' and characteristic ' + setConfigurationCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": generalServiceUuid,
			"characteristicUuid": setConfigurationCharacteristicUuid , "value" : v};
		bluetoothle.write(function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "write configuration" characteristic - ' +
						obj.status;
					console.log(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to "write configuration" characteristic - ' +
						obj;
					console.log(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error in writing to "write configuration" characteristic - ' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

	/** Before getting the value of a specific configuration type, we have to select it.
	 */
	self.selectConfiguration = function(address, configurationType, successCB, errorCB) {

		var u8 = new Uint8Array(1);
		u8[0] = configurationType;

		var v = bluetoothle.bytesToEncodedString(u8);
		console.log("Write " + v + " at service " + generalServiceUuid +
				' and characteristic ' + selectConfigurationCharacteristicUuid );
		var paramsObj = {"address": address, "serviceUuid": generalServiceUuid,
			"characteristicUuid": selectConfigurationCharacteristicUuid , "value" : v};
		bluetoothle.write(
			function(obj) { // write success
				if (obj.status == 'written') {
					var msg = 'Successfully written to "select configuration" characteristic - ' +
						obj.status;
					console.log(msg);
					if (successCB) successCB(msg);
				} else {
					var msg = 'Error in writing to "select configuration" characteristic - ' +
						obj;
					console.log(msg);
					if (errorCB) errorCB(msg);
				}
			},
			function(obj) { // write error
				var msg = 'Error CB in writing to "select configuration" characteristic - ' +
					obj.error + " - " + obj.message;
				console.log(msg);
				if (errorCB) errorCB(msg);
			},
			paramsObj);
	}

}


