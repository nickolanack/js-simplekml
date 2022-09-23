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
		this._idleFns=[];
		this._filters=[];
		var me=this;
		this._worker.onmessage=function(e){

			if(e.data=="idle"){
				me._idle();
				return;
			}

			if(e.data.progress){

				return;
			}

			if(!me._handlers[e.data.method]){
				throw 'Unexpected message: '+JSON.stringify(e.data);
			}

			if(e.data.result=="done"){
				delete me._handlers[e.data.method];
				return;
			}

			if(me._filter(e.data.feature, e.data.index)){
				me._handlers[e.data.method](e.data.feature, e.data.total, e.data.index);
			}


		};
	};

	BackgroundKmlReader.prototype.remove = function() {
		this._worker.terminate();
		delete this._worker;
		delete this._handlers;
		delete this._idleFns;
		delete this._filters;
	};

	BackgroundKmlReader.prototype._execute = function(method, callback) {
		this._handlers[method]=callback;
		this._worker.postMessage(method);
	};

	BackgroundKmlReader.prototype.parseMarkers = function(callback) {
		this._execute('parseMarkers', callback);
		return this;
	};

	BackgroundKmlReader.prototype.parsePolygons = function(callback) {
		this._execute('parsePolygons', callback);
		return this;
	};

	BackgroundKmlReader.prototype.parseLines = function(callback) {
		this._execute('parseLines', callback);
		return this;
	};

	BackgroundKmlReader.prototype.parseNetworklinks = function(callback) {
		this._execute('parseNetworklinks', callback);
		return this;
	};

	BackgroundKmlReader.prototype.parseGroundOverlays = function(callback) {
		this._execute('parseGroundOverlays', callback);
		return this;
	};




	BackgroundKmlReader.prototype.runOnceOnIdle = function(fn){
        this._worker.postMessage('idle');
        this._idleFns.push(fn);
    }

    BackgroundKmlReader.prototype._idle=function(){

    	if(this._idleFns.length>0){

	    	var fns=this._idleFns.slice(0);
			this._idleFns=[];
	        fns.forEach(function(fn){
	            fn();
	        });
	    }

    }

	 BackgroundKmlReader.prototype._filter = function(item, i) {

        var bool = true;
        this._filters.forEach(function(f) {

            if (typeof f != 'function' && f.type) {
                if (item.type === f.type) {
                    if (f.filter(item, i) === false) {
                        bool = false;
                    }
                }
                return;

            }

            if (f(item, i) === false) {
                bool = false;
            }
        });
        return bool;

    };
    BackgroundKmlReader.prototype.addFilter = function(type, fn) {

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

