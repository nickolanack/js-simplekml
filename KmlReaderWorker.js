importScripts('KmlReader.js');


var reader = null;

onmessage = function(e) {


	if (!reader) {
		reader = new KmlReader(e.data);
		return;
	}


	if (typeof reader[e.data] == 'function') {
		reader[e.data](function(data, total, index) {
			postMessage({
				method: e.data,
				feature: data,
				total: total,
				index: index
			});

			if (index == total - 1) {
				postMessage({
					method: e.data,
					result: 'done'
				});
			}
		});

	}

}