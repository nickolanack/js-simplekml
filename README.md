# js-simplekml
A Javascript kml parser, for web or node.
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
## Background Webworker Usage
uses BackgroundKmlReader, which provides exactly the same methods as KmlReader
providing the url to a kml (instead of the kml string) moves the download into the background thread as well

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
