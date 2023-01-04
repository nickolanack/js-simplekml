# js-simplekml
A pure js kml parser, for web or node.
Includes web implementation for parsing kml files in the background using a Web Worker

## Usage
```js
//simple usage in a web browser
(new KmlReader(xmlString))
  .parseMarkers(function(point){      
       
  }).parseLines(function(line){
                
  }).parsePolygons(function(poly){
                
  }).parseNetworklinks(function(link){
                
  }).parseGroundOverlays(function(overlay){
                
  });

```
## Background Web Worker Usage
Use BackgroundKmlReader instead of KmlReader to move kml parsing into a background thread, this class provides exactly the same methods as KmlReader.
Providing the remote url for a kml (instead of the kml string), in the constructor to BackgroundKmlReader, additionally moves the download into the background thread.

BackgroundKmlReader includes, and uses @xmldom/xmldom

```js
(new BackgroundKmlReader(kmlUrl /*accepts url, or kml string but not DOM*/))
  //...
  .parsePolygons(function(poly){
  
  });
  // ...
```


## Usage in node js, requires xmldom
```js

const KmlReader=require('../KmlReader.js');
const DOMParser=require('@xmldom/xmldom').DOMParser;
const fs=require('fs');
(new KmlReader(new DOMParser().parseFromString(fs.readFileSync('somefile.kml').toString())))
  .parseMarkers((point)=>{      
       
  }).parseLines((line)=>{
                
  }).parsePolygons((poly)=>{
                
  }).parseNetworklinks((link)=>{
                
  }).parseGroundOverlays((overlay)=>{
                
  });
