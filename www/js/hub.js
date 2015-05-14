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

var hub = {

	// array with info of partners (and ourselves), like address, logo, description, etc.
	partnersById: {},

	// map of wifi network
	networks: {},


	/* Start should be called if all plugins are ready and all functionality can be called.
	 */
	start:function() {
		// set up wifi connection
		wifi.init(function(enabled) {
			$('#wifiScanBtn').prop("disabled", false);
		});
	},

	create:function() {
		var self = this;

		console.log("---------------------------------------------------------");
		console.log("----- Distributed Organisms B.V. (http://dobots.nl) -----");
		console.log("---------------------------------------------------------");
		console.log("Start Hub application");

		wifi = new WifiWizard();

		var repeatFunctionHandle = null;

		// if debug is disabled, hide everything with class debug
		if (!DEBUG) {
			$(".debug").hide();
		}

		var searching = false;
		var connected = false;
		var connecting = false;

		var connectedNetwork = "";


		/*******************************************************************************************************
		 * Selection page
		 ******************************************************************************************************/

		connectionFailed = function() {
			if (!connected) {
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

		disconnect = function() {
			if (!connectedNetwork) {
				console.log("not connected to a network currently!!");
				return;
			}

			if (connected) {
				connected = false;
				console.log("disconnecting...");
				wifi.disconnectNetwork(connectedNetwork,
				    console.log("disconnected"),
				    console.log("can't disconnect");
				);
				connectedNetwork = null;
			}
		}

		start();
	}
}

