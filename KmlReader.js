/**
 * Author - Nick Blackwell
 * 
 * License - MIT
 *
 * Description - Defines a class, KmlReader which is a container for static kml parsing methods. 
 * 
 */

/**
 * KmlReader Class parses standard kml documents and returns objects representiong it's data. 
 * the optional transformations define the data within these objects, ie, documentTransform (for Geolive)
 * will create a Layer object from its contents, and pull out the items which will be transformed aswell as MapItems.
 * 
 * 
 * 
 */
'use strict';

var KmlReader = (function() {


    if (typeof console == 'undefined') {
        var _console = {
            "log": function() {},
            "warn": function() {},
            "error": function() {}
        }
        if (typeof window != 'undefined') {
            window.console = _console;
        }
    }



    var _append = function(obj /*, arg1, arg2*/ ) {

        var a = obj || {};
        var items = Array.prototype.slice.call(arguments, 1);

        items.forEach(function(b) {
            b = b || {};
            Object.keys(b).forEach(function(k) {
                a[k] = b[k];
            });
        });

        return a;

    }



    var KmlReader = function(kml) {

        var me = this;

        if (typeof kml == 'string') {


            var parseXml;

            (function() {

                if (typeof window != 'undefined') {
                    if (window && window.DOMParser) {

                        parseXml = function(xmlStr) {
                            return (new window.DOMParser()).parseFromString(xmlStr, 'text/xml');
                        };
                    } else if (window && typeof window.ActiveXObject != 'undefined' && new window.ActiveXObject('Microsoft.XMLDOM')) {

                        parseXml = function(xmlStr) {
                            var xmlDoc = new window.ActiveXObject('Microsoft.XMLDOM');
                            xmlDoc.async = 'false';
                            xmlDoc.loadXML(xmlStr);
                            return xmlDoc;
                        };
                    }

                }

            })();

            if (!parseXml) {
                throw 'DOMParser is not available. You can pass DomDocument as arg directly to KmlReader ie: new KmlReader(new DOMParser().parseFromString(...));';
            }

            kml = parseXml(kml);

        }

        me._kml = kml;



    }

    KmlReader.prototype.remove = function() {
        delete this._kml;
    }


    KmlReader.prototype.runOnceOnIdle = function(fn) {
        if (!this._idleFns) {
            this._idleFns = [];
        }

        this._idleFns.push(fn);
    }

    KmlReader.prototype._scheduleIdle = function(fn) {

        if (this._idleTimer) {
            clearTimeout(this._idleTimer);
        }
        var me = this;
        this._idleTimer = setTimeout(function() {
            delete me._idleTimer;
            if (me._idleFns && me._idleFns.length > 0) {
                var fns = me._idleFns.slice(0);
                me._idleFns = [];
                fns.forEach(function(fn) {
                    fn();
                });
            }
        }, 100);


    }



    KmlReader.prototype.parseDocuments = function(kml, callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }

        var documentData = me._filter(KmlReader.ParseDomDocuments(kml));
        documentData.forEach(function(p, i) {
            callback(p, documentData.length, i);
            me._scheduleIdle();
        });
        me._scheduleIdle();
        return me;
    };

    KmlReader.prototype.parseFolders = function(kml, callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }
        var folderData = me._filter(KmlReader.ParseDomFolders(kml));
        folderData.forEach(function(p, i) {
            callback(p, folderData.length, i);
            me._scheduleIdle();
        });
        me._scheduleIdle();
        return me;
    };


    var _batchTimeout = function(someList, callback, chunkLength, timeout) {

        var i = 0;
        if (typeof chunkLength == 'undefined') {
            chunkLength = 1000;
        }
        if (typeof timeout == 'undefined') {
            timeout = 10;
        }

        var _batch = function() {
            setTimeout(function() {
                var list = [];


                callback(someList.slice(i, Math.min(i + chunkLength, someList.length)), i);
                i += chunkLength;

                if (i < someList.length) {
                    _batch();
                }
            }, timeout);
        };
        _batch();

    };


    KmlReader.prototype.parseMarkers = function(kml /*optional*/ , callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }


        var markerNodes = KmlReader.ParseDomMarkerNodes(kml);
        var dataList = markerNodes.map(function() {
            return null;
        });


        /**
         * the following processes markers in batches of 1000, using a chained timeout call 
         * the dataList argument may contain null values at higher indexes 
         */

        var getStyle = KmlReader._GetCachedStyleLookupFn(kml);
        var offset = 0;
        _batchTimeout(markerNodes, function(markerDomNodes, i) {
            var filteredData = me._filter(markerDomNodes.map(function(markerDomNode) {
                return KmlReader.ParseDomMarker(markerDomNode, getStyle);
            }));


            dataList.splice(i, markerDomNodes.length, filteredData);
            filteredData.forEach(function(data, index) {
                callback(data, dataList.length, index + offset);
                me._scheduleIdle();
            });
            offset += filteredData.length;
            me._scheduleIdle();
        });
        me._scheduleIdle();

        // var markerData = me._filter(KmlReader.ParseDomMarkers(kml));
        // markerData.forEach(function(p, i) {
        //     callback(p, markerData, i);
        // });
        return me;
    };

    KmlReader.prototype.parsePolygons = function(kml, callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }
        KmlReader.ParseDomPolygons(kml, function(p, i, len) {
            if (me._filterItem(p, i)) {
                callback(p, len, i);
            }
            me._scheduleIdle();
        });
        me._scheduleIdle();
        return me;
    };
    KmlReader.prototype.parseLines = function(kml, callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }

        KmlReader.ParseDomLines(kml, function(p, i, len) {
            if (me._filterItem(p, i)) {
                callback(p, len, i);
            }
            me._scheduleIdle();
        });

        me._scheduleIdle();

        return me;
    };
    KmlReader.prototype.parseGroundOverlays = function(kml, callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }
        var overlayData = me._filter(KmlReader.ParseDomGroundOverlays(kml));
        overlayData.forEach(function(o, i) {
            callback(o, overlayData.length, i);
            me._scheduleIdle();
        });
        me._scheduleIdle();
        return me;
    };
    KmlReader.prototype.parseNetworklinks = function(kml, callback) {
        /**
         * alias method backward-compatibility
         */
        return this.parseNetworkLinks.apply(this, arguments);
    }
    KmlReader.prototype.parseNetworkLinks = function(kml, callback) {
        var me = this;
        if (!callback) {
            callback = kml;
            kml = me._kml;
        }
        var linkData = me._filter(KmlReader.ParseDomLinks(kml));
        linkData.forEach(function(p, i) {
            callback(p, linkData.length, i);
            me._scheduleIdle();
        });
        me._scheduleIdle();
        return me;
    };
    KmlReader.prototype._filterItem = function(item, i) {

        var bool = true;
        if (this._filters) {
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
        }
        return bool
    };

    KmlReader.prototype._filter = function(a) {
        var me = this;
        var filtered = [];
        if (me._filters && a && a.length) {
            a.forEach(function(item, i) {

                var bool = true;
                me._filters.forEach(function(f) {

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
                if (bool) {
                    filtered.push(item);
                }
            });
            return filtered;
        }
        return a;
    };
    KmlReader.prototype.addFilter = function(type, fn) {

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


    /**
     * static methods
     */



    KmlReader.ParseDomDocuments = function(xmlDom) {
        var docs = [];
        var docsDomNodes = xmlDom.getElementsByTagName('Document');
        var i;
        for (i = 0; i < docsDomNodes.length; i++) {
            var node = docsDomNodes.item(i);
            var docsData = _append({
                type: 'document'
            }, KmlReader.ParseDomDoc(node), KmlReader.ParseNonSpatialDomData(node, {}));
            var transform = function(options) {
                return options;
            };
            docs.push(transform(docsData));
        }
        return docs;
    };

    KmlReader.ParseDomDoc = function(xmlDom) {
        return {};
    };

    KmlReader.ParseDomFolders = function(xmlDom) {
        var folders = [];
        var folderDomNodes = KmlReader.ParseDomItems(xmlDom, 'Folder');
        var i;
        for (i = 0; i < folderDomNodes.length; i++) {
            var node = folderDomNodes[i];
            var folderData = _append({
                type: 'folder'
            }, KmlReader.ParseDomFolder(node), KmlReader.ParseNonSpatialDomData(node, {}));
            var transform = function(options) {
                return options;
            };
            folders.push(transform(folderData));
        }
        return folders;
    };

    KmlReader.ParseDomDoc = function(xmlDom) {
        return {};
    };

    KmlReader.ParseDomLinks = function(xmlDom) {
        var links = [];
        var linkDomNodes = xmlDom.getElementsByTagName('NetworkLink');
        var i;
        for (i = 0; i < linkDomNodes.length; i++) {
            var node = linkDomNodes.item(i);
            var linkData = _append({}, KmlReader.ParseDomLink(node), KmlReader.ParseNonSpatialDomData(node, {}), KmlReader.ParseRegionDomData(node, {}));

            var transform = function(options) {
                return options;
            };
            links.push(transform(linkData));
        }
        return links;
    };
    KmlReader.ParseDomFolder = function(xmlDom) {
        return {};
    };
    KmlReader.ParseDomLink = function(xmlDom) {

        var urls = xmlDom.getElementsByTagName('href');
        var link = {
            type: 'link'
        };
        if (urls.length > 0) {
            var url = urls.item(0);
            link.url = KmlReader.Value(url);
        }
        return link;
    };

    KmlReader.ParseDomLines = function(xmlDom, callback) {
        var lines = [];
        var lineDomNodes = KmlReader.ParseDomItems(xmlDom, 'LineString');


        var styles = {};
        var getStyle = function(styleName, xmlDom) {
            if (typeof styles[styleName] == "undefined") {
                var style = KmlReader.ResolveDomStyle(styleName, xmlDom);
                styles[styleName] = style;
            }
            return styles[styleName];
        }

        var i;
        for (i = 0; i < lineDomNodes.length; i++) {

            var node = lineDomNodes[i];


            var attributes = KmlReader.ParseNonSpatialDomData(node, {});
            var styleName = KmlReader.ParseDomStyle(node);
            var style = getStyle(styleName, xmlDom);

            var polygonData = _append({
                    type: 'line',
                    lineColor: '#FF000000', // black
                    lineWidth: 1,
                    polyColor: '#77000000', //black semitransparent,
                    coordinates: KmlReader.ParseDomCoordinates(node) //returns an array of GLatLngs
                },
                attributes,
                style

            );

            var rgb = KmlReader.KMLConversions.KMLColorToRGB(polygonData.lineColor);
            polygonData.lineOpacity = rgb.opacity;
            polygonData.lineColor = rgb.color;

            if (callback) {
                callback(polygonData, i, lineDomNodes.length);
            } else {
                lines.push(polygonData);
            }
        }

        if (callback) {
            return;
        }

        return lines;
    };

    KmlReader.ParseDomPolygons = function(xmlDom, callback) {
        var polygons = [];
        var polygonDomNodes = KmlReader.ParseDomItems(xmlDom, 'Polygon');


        var styles = {};
        var getStyle = function(styleName, xmlDom) {
            if (typeof styles[styleName] == "undefined") {
                var style = KmlReader.ResolveDomStyle(styleName, xmlDom);
                styles[styleName] = style;
            }
            return styles[styleName];
        }

        var i;
        for (i = 0; i < polygonDomNodes.length; i++) {

            var node = polygonDomNodes[i];

            polygonDomNodes[i] = null; //clear memory

            var attributes = KmlReader.ParseNonSpatialDomData(node, {});
            var styleName = KmlReader.ParseDomStyle(node);
            var style = getStyle(styleName, xmlDom);

            var polygonData = _append({
                    type: 'polygon',
                    fill: true,
                    lineColor: '#FF000000', // black
                    lineWidth: 1,
                    polyColor: '#77000000', //black semitransparent,
                    coordinates: KmlReader.ParseDomCoordinates(node) //returns an array of google.maps.LatLng
                },

                attributes,
                style

            );

            var lineRGB = KmlReader.KMLConversions.KMLColorToRGB(polygonData.lineColor);

            polygonData.lineOpacity = lineRGB.opacity;
            polygonData.lineColor = lineRGB.color;

            var polyRGB = KmlReader.KMLConversions.KMLColorToRGB(polygonData.polyColor);

            polygonData.polyOpacity = (polygonData.fill) ? polyRGB.opacity : 0;
            polygonData.polyColor = polyRGB.color;

            if (callback) {
                callback(polygonData, i, polygonDomNodes.length);
            } else {
                polygons.push(polygonData);
            }
        }

        if (callback) {
            return;
        }

        return polygons;
    };

    KmlReader.ParseDomGroundOverlays = function(xmlDom) {
        var lines = [];
        var lineDomNodes = KmlReader.ParseDomItems(xmlDom, 'GroundOverlay');
        var i;
        for (i = 0; i < lineDomNodes.length; i++) {

            var node = lineDomNodes[i];

            var polygonData = _append({
                    type: 'imageoverlay',
                    icon: KmlReader.ParseDomIcon(node),
                    bounds: KmlReader.ParseDomBounds(node)
                },
                KmlReader.ParseNonSpatialDomData(node, {}),
                KmlReader.ParseRegionDomData(node.parentNode, {})
            );

            lines.push(polygonData);
        }

        return lines;
    };

    KmlReader.ParseDomMarkers = function(xmlDom) {
        var markerDomNodes = KmlReader.ParseDomMarkerNodes(xmlDom);

        var getStyle = KmlReader._GetCachedStyleLookupFn(xmlDom);

        return markerDomNodes.map(function(markerDomNode) {
            return KmlReader.ParseDomMarker(markerDomNode, getStyle);
        });
    };

    KmlReader.ParseDomMarkerNodes = function(xmlDom) {
        return KmlReader.ParseDomItems(xmlDom, 'Point');
    };



    KmlReader._GetCachedStyleLookupFn = function(xmlDom) {

        var styles = {};
        var getStyle = function(styleName) {
            if (typeof styles[styleName] == "undefined") {
                var style = KmlReader.ResolveDomStyle(styleName, xmlDom);
                styles[styleName] = style;
            }
            return styles[styleName];
        }
        return getStyle;

    }

    KmlReader.ParseDomMarker = function(xmlMarkerNode, getStyleFn) {


        var attributes = KmlReader.ParseNonSpatialDomData(xmlMarkerNode, {});
        var styleName = KmlReader.ParseDomStyle(xmlMarkerNode);

        var coords = KmlReader.ParseDomCoordinates(xmlMarkerNode);
        var marker = _append({
            type: 'point'
        }, {
            coordinates: coords[0] //returns an array of google.maps.LatLng
        }, attributes);
        var icon = styleName;
        if (icon.charAt(0) == '#') {
            icon = getStyleFn(styleName).icon;
        }
        if (icon) {
            marker.icon = icon; //better to not have any hint of an icon (ie: icon:null) so that default can be used by caller
        }
        return marker;

    }



    KmlReader.ParseDomCoordinates = function(xmlDom) {
        var coordNodes = xmlDom.getElementsByTagName('coordinates');
        if (!coordNodes.length) {
            console.warn(['KmlReader. DOM Node did not contain coordinates!', {
                node: xmlDom
            }]);
            return null;
        }

        var parseCoords = function(node) {


            var s = KmlReader.Value(node);
            s = s.trim();
            var coordStrings = s.split(' ');
            var coordinates = [];
            (coordStrings).forEach(function(coord) {
                var c = coord.split(',');
                if (c.length > 1) {

                    //JSConsole([c[1],c[0]]);
                    coordinates.push([c[1], c[0]]);
                }


            });

            return coordinates;

        }

        var coordinates = parseCoords(coordNodes.item(0));

        if (coordNodes.length > 1) {

            coordinates = [coordinates];
            for (var i = 1; i < coordNodes.length; i++) {
                coordinates.push(parseCoords(coordNodes.item(i)));
            }
        }



        return coordinates;
    };


    KmlReader.ParseDomBounds = function(xmlDom) {
        var coordNodes = xmlDom.getElementsByTagName('LatLonBox');

        if (!coordNodes.length) {
            coordNodes = xmlDom.getElementsByTagName('LatLonAltBox');
        }

        if (!coordNodes.length) {
            console.warn(['KmlReader. DOM Node did not contain coordinates!', {
                node: xmlDom
            }]);
            return null;
        }
        var node = coordNodes.item(0);
        var norths = node.getElementsByTagName('north');
        var souths = node.getElementsByTagName('south');
        var easts = node.getElementsByTagName('east');
        var wests = node.getElementsByTagName('west');

        var north = null;
        var south = null;
        var east = null;
        var west = null;

        if (!norths.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain north!', {
                node: xmlDom
            }]);
        } else {
            north = parseFloat(KmlReader.Value(norths.item(0)));
        }
        if (!souths.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain south!', {
                node: xmlDom
            }]);
        } else {
            south = parseFloat(KmlReader.Value(souths.item(0)));
        }
        if (!easts.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain east!', {
                node: xmlDom
            }]);
        } else {
            east = parseFloat(KmlReader.Value(easts.item(0)));
        }
        if (!wests.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain west!', {
                node: xmlDom
            }]);
        } else {
            west = parseFloat(KmlReader.Value(wests.item(0)));
        }
        var data = {
            north: north,
            south: south,
            east: east,
            west: west
        };



        //optional 

        var minAltitudes = node.getElementsByTagName('minAltitude');

        if (minAltitudes.length) {
            data.minAltitude = parseFloat(KmlReader.Value(minAltitudes.item(0)));
        }

        var maxAltitudes = node.getElementsByTagName('maxAltitude');

        if (maxAltitudes.length) {
            data.maxAltitude = parseFloat(KmlReader.Value(maxAltitudes.item(0)));
        }


        return data;

    };

    KmlReader.ParseDomLOD = function(xmlDom) {
        var lodNodes = xmlDom.getElementsByTagName('Lod');
        if (!lodNodes.length) {
            console.warn(['KmlReader. DOM Node did not contain Lod!', {
                node: xmlDom
            }]);
            return null;
        }


        minLodPixels, maxLodPixels, minFadeExtent

        var node = lodNodes.item(0);
        var minLodPixelsNodes = node.getElementsByTagName('minLodPixels');
        var maxLodPixelsNodes = node.getElementsByTagName('maxLodPixels');
        var minFadeExtentNodes = node.getElementsByTagName('minFadeExtent');


        var minLodPixels = null;
        var maxLodPixels = null;
        var minFadeExtent = null;


        if (!minLodPixelsNodes.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain minLodPixels!', {
                node: xmlDom
            }]);
        } else {
            minLodPixels = parseFloat(KmlReader.Value(minLodPixelsNodes.item(0)));
        }
        if (!maxLodPixelsNodes.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain maxLodPixels!', {
                node: xmlDom
            }]);
        } else {
            maxLodPixels = parseFloat(KmlReader.Value(maxLodPixelsNodes.item(0)));
        }
        if (!minFadeExtentNodes.length) {
            console.warn(['KmlReader. DOM LatLngBox Node did not contain minFadeExtent!', {
                node: xmlDom
            }]);
        } else {
            minFadeExtent = parseFloat(KmlReader.Value(minFadeExtentNodes.item(0)));
        }

        var data = {
            minLodPixels: minLodPixels,
            maxLodPixels: maxLodPixels,
            minFadeExtent: minFadeExtent,
        };

        return data;

    };

    KmlReader.ParseNonSpatialDomData = function(xmlDom, options) {
        var config = _append({}, {
            maxOffset: 2
        }, options);

        var data = {
            name: '',
            description: null,
            tags: {}
        };
        var names = xmlDom.getElementsByTagName('name');
        var i;
        for (i = 0; i < names.length; i++) {
            if (KmlReader.WithinOffsetDom(xmlDom, names.item(i), config.maxOffset)) {
                data.name = (KmlReader.Value(names.item(i)));
                break;
            }
        }
        var descriptions = xmlDom.getElementsByTagName('description');
        for (i = 0; i < descriptions.length; i++) {
            if (KmlReader.WithinOffsetDom(xmlDom, descriptions.item(i), config.maxOffset)) {
                data.description = (KmlReader.Value(descriptions.item(i)));
                break;
            }
        }

        if (xmlDom.hasAttribute('id')) {
            data.id = parseInt(xmlDom.getAttribute('id'), 10);
        }

        var tags = {};
        var extendedDatas = xmlDom.getElementsByTagName('ExtendedData');
        for (i = 0; i < extendedDatas.length; i++) {
            if (KmlReader.WithinOffsetDom(xmlDom, extendedDatas.item(i), config.maxOffset)) {
                var j;
                for (j = 0; j < extendedDatas.item(i).childNodes.length; j++) {
                    var c = extendedDatas.item(i).childNodes.item(j);
                    var t = KmlReader.ParseTag(c);
                    if (t.name != '#text') {
                        data.tags[t.name] = t.value;
                    }
                }
            }
        }


        return data;

    };

    KmlReader.ParseRegionDomData = function(xmlDom, options) {

        var config = _append({}, {

        }, options);

        var data = {};

        var regionData = xmlDom.getElementsByTagName('Region');

        for (var i = 0; i < regionData.length; i++) {
            data.region = {
                bounds: KmlReader.ParseDomBounds(regionData.item(0)),
                lod: KmlReader.ParseDomLOD(regionData.item(0))
            }

        }



        return data;
    };


    KmlReader.ParseTag = function(xmlDom) {
        var tags = {
            name: null,
            value: {}
        };
        switch (xmlDom.nodeName) {

            case 'Data': //TODO: add data tags...
            case 'data':

                var label = xmlDom.getElementsByTagName('displayName');
                if (label.length > 0) {
                    tags.label = label.item(0).childNodes.item(0).nodeValue;
                }

                tags.name = xmlDom.getAttribute('name');
                tags.value = xmlDom.getElementsByTagName('value').item(0).childNodes.item(0).nodeValue

                break;
            case 'ID':
                tags.name = 'ID';
                tags.value = KmlReader.Value(xmlDom);
                break;
            default:
                tags.name = xmlDom.nodeName;
                tags.value = KmlReader.Value(xmlDom);
                break;
        }
        return tags;
    };

    KmlReader.WithinOffsetDom = function(parent, child, max) {
        var current = child.parentNode;
        for (var i = 0; i < max; i++) {
            if (current.nodeName == (typeof(parent) == 'string' ? parent : parent.nodeName)) {
                return true;
            }
            current = current.parentNode;
        }
        console.error(['KmlReader. Could not find parent node within expected bounds.', {
            parentNode: parent,
            childNode: child,
            bounds: max
        }]);
        return false;
    };
    KmlReader.ParseDomStyle = function(xmlDom, options) {

        var config = _append({}, {
            defaultStyle: 'default'
        }, options);



        var styles = xmlDom.getElementsByTagName('styleUrl');
        var style = config.defaultStyle;
        if (styles.length == 0) {

            var warning = 'KmlReader. DOM Node did not contain styleUrl!';

            // console.warn([warning, {
            //     node: xmlDom,
            //     options: config
            // }]);
        } else {
            var node = styles.item(0);
            style = (KmlReader.Value(node));
        }
        return style;
    };
    KmlReader.ParseDomIcon = function(xmlDom, options) {

        var config = _append({}, {
            defaultIcon: false,
            defaultScale: 1.0
        }, options);



        var icons = xmlDom.getElementsByTagName('Icon');
        var icon = config.defaultStyle;
        var scale = config.defaultScale;
        if (icons.length == 0) {
            console.warn(['KmlReader. DOM Node did not contain Icon!', {
                node: xmlDom,
                options: config
            }]);
        } else {
            var node = icons.item(0);
            var urls = node.getElementsByTagName('href');
            if (urls.length == 0) {
                console.warn(['KmlReader. DOM Icon Node did not contain href!', {
                    node: xmlDom,
                    options: config
                }]);
            } else {
                var hrefNode = urls.item(0);
                icon = (KmlReader.Value(hrefNode));
            }

            var scales = node.getElementsByTagName('viewBoundScale');
            if (scales.length == 0) {
                console.warn(['KmlReader. DOM Icon Node did not contain viewBoundScale!', {
                    node: xmlDom,
                    options: config
                }]);

            } else {
                var scaleNode = scales.item(0);
                scale = parseFloat(KmlReader.Value(scaleNode));
            }


        }
        return {
            url: icon,
            scale: scale
        };
    };



    KmlReader.ResolveDomStyle = function(style, xmlDom) {
        var data = {};
        var name = (style.charAt(0) == '#' ? style.substring(1, style.length) : style);
        var styles = xmlDom.getElementsByTagName("Style");
        var i;
        for (i = 0; i < styles.length; i++) {

            var node = styles.item(i);
            var id = node.getAttribute("id");
            if (id == name) {
                var lineStyles = node.getElementsByTagName('LineStyle');
                var polyStyles = node.getElementsByTagName('PolyStyle');
                var iconStyles = node.getElementsByTagName('href');
                if (lineStyles.length > 0) {
                    var lineStyle = lineStyles.item(0);
                    var colors = lineStyle.getElementsByTagName('color');
                    if (colors.length > 0) {
                        var color = colors.item(0);
                        data.lineColor = KmlReader.Value(color);
                    }
                    var widths = lineStyle.getElementsByTagName('width');
                    if (widths.length > 0) {
                        var width = widths.item(0);
                        data.lineWidth = KmlReader.Value(width);
                    }
                }
                if (polyStyles.length > 0) {
                    var polyStyle = polyStyles.item(0);
                    var colors = polyStyle.getElementsByTagName('color');
                    if (colors.length > 0) {
                        var color = colors.item(0);
                        data.polyColor = KmlReader.Value(color);
                    }
                    var outlines = polyStyle.getElementsByTagName('outline');
                    if (outlines.length > 0) {
                        var outline = outlines.item(0);
                        var o = KmlReader.Value(outline);
                        data.outline = (o ? true : false);
                    }
                }
                if (iconStyles.length > 0) {
                    var iconStyle = iconStyles.item(0);
                    var icon = KmlReader.Value(iconStyle);
                    data.icon = icon;
                }



            }
        }
        return data;
    };
    KmlReader.ParseDomItems = function(xmlDom, tag) {
        var tagName = tag || 'Point';
        var items = [];
        var markerDomNodes = xmlDom.getElementsByTagName(tagName);
        var i;
        for (i = 0; i < markerDomNodes.length; i++) {
            var node = markerDomNodes.item(i);
            if (tag == "GroundOverlay") {
                items.push(node);
                continue;
            }
            var parent = (node.parentNode.nodeName == 'Placemark' ? node.parentNode : (node.parentNode.parentNode.nodeName == 'Placemark' ? node.parentNode.parentNode : null));
            if (parent == null) {
                console.error(['Failed to find ParentNode for Element - ' + tagName, {
                    node: xmlDom
                }]);
                mm_trace();
            } else {

                if (node.parentNode.tagName !== 'MultiGeometry' || node.parentNode.childNodes.item(0) === node) {

                    items.push(parent);
                }
            }
        }
        return items;
    };

    KmlReader.KMLConversions = {


        // KML Color is defined similar to RGB except it is in the opposite order and starts with opacity, 
        // #OOBBGGRR
        KMLColorToRGB: function(colorString) {
            var colorStr = colorString.replace('#', '');
            while (colorStr.length < 6) {
                colorStr = '0' + colorStr;
            } //make sure line is dark!
            while (colorStr.length < 8) {
                colorStr = 'F' + colorStr;
            } //make sure opacity is a large fraction
            if (colorStr.length > 8) {
                colorStr = colorStr.substring(0, 8);
            }
            var color = colorStr.substring(6, 8) + colorStr.substring(4, 6) + colorStr.substring(2, 4);
            var opacity = ((parseInt(colorStr.substring(0, 2), 16)) * 1.000) / (parseInt("FF", 16));

            var rgbVal = {
                color: '#' + color,
                opacity: opacity
            };

            return rgbVal;
        },
        RGBColorToKML: function(rgb, opacity) {

            var colorStr = rgb.replace('#', '');
            while (colorStr.length < 6) {
                colorStr = '0' + colorStr;
            } //make sure line is dark!
            if (colorStr.length > 6) {
                colorStr = colorStr.substring(0, 6);
            }

            if ((opacity != null)) {
                if (opacity >= 0.0 && opacity <= 1.0) {
                    var opacityNum = opacity;
                } else if (parseInt(opacity) >= 0.0 && parseInt(opacity) <= 1.0) {
                    var opacityNum = parseInt(opacity);
                }
            }
            if ((opacityNum == null)) {
                var opacityNum = 1.0;
            }

            var opacityNum = (opacityNum * 255.0);
            var opacityStr = opacityNum.toString(16);

            var kmlStr = opacityStr.substring(0, 2) + "" + colorStr.substring(4, 6) + colorStr.substring(2, 4) + colorStr.substring(0, 2);

            return kmlStr;
        }

    };
    KmlReader.Value = function(node) {
        var value = node.nodeValue;
        if (value) return value;
        var str = "";
        try {
            if (node.childNodes && node.childNodes.length)(KmlReader.ChildNodesArray(node)).forEach(function(c) {
                str += KmlReader.Value(c);
            });
        } catch (e) {
            console.error(['SimpleKML Parser Exception', e]);
        }
        return str;
    };

    KmlReader.ChildNodesArray = function(node) {
        var array = [];
        if (node.childNodes && node.childNodes.length > 0) {
            var i = 0;
            for (i = 0; i < node.childNodes.length; i++) {
                array.push(node.childNodes.item(i));
            }

        }
        return array;
    };


    return KmlReader;


})();


if (typeof module != 'undefined') {
    module.exports = KmlReader;
}