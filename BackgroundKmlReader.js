'use strict';

/**
 * BackgroundKmlReader is meant to be a drop in replacement for KmlReader class
 */
var BackgroundKmlReader = (function() {

	var current=document.currentScript.src;
	var workerScript=current.replace('BackgroundKmlReader.js', 'KmlReaderWorker.js');


	var BackgroundKmlReader = function(kml) {

		this._worker=new Worker(workerScript);
		this._worker.postMessage(kml);
		this._handlers={};
		var me=this;
		this._worker.onmessage=function(e){

			if(!me._handers[e.data.method]){
				throw 'Unexpected message: '+JSON.stringify(e.data);
			}

			if(e.data.result=="done"){
				delete me._handers[e.data.method];
				return;
			}

			if(me._filter(e.data.feature)){
				me._handers[e.data.method](e.data.feature, e.data.total, e.data.index);
			}



		};
	};

	BackgroundKmlReader.prototype._execute = function(method, callback) {
		this._handlers[method]=callback;
		this._worker.postMessage(method);
	};

	BackgroundKmlReader.prototype.parseMarkers = function(callback) {
		this._execute('parseMarkers', callback);
	};

	BackgroundKmlReader.prototype.parsePolygons = function(callback) {
		this._execute('parsePolygons', callback);
	};

	BackgroundKmlReader.prototype.parseLines = function(callback) {
		this._execute('parseLines', callback);
	};

	BackgroundKmlReader.prototype.parseNetworklinks = function(callback) {
		this._execute('parseNetworklinks', callback);
	};

	BackgroundKmlReader.prototype.parseGroundOverlays = function(callback) {
		this._execute('parseGroundOverlays', callback);
	};










	 BackgroundKmlReader.prototype._filter = function(item) {
        if (this._filters) {


            var bool = true;
            this._filters.forEach(function(f) {

                if (typeof f != 'function' && f.type) {
                    if (item.type === f.type) {
                        if (f.filter(item) === false) {
                            bool = false;
                        }
                    }
                    return;

                }

                if (f(item) === false) {
                    bool = false;
                }
            });
            return bool;
        }
        return true
    };
    BackgroundKmlReader.prototype.addFilter = function(type, fn) {

        if (!this._filters) {
            this._filters = [];
        }

        if (typeof type == 'function') {
            fn = type;
            this._filters.push(fn);
            return this;

        }

        this._filters.push({
            type,
            filter: fn
        });

        return this;
    };




	return BackgroundKmlReader;



})();

