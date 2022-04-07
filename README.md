# js-simplekml
A Javascript kml parser

#Usage
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

#Usage in node js, requires xmldom
```js

const KmlReader=require('../KmlReader.js');
const DOMParser=require('@xmldom/xmldom').DOMParser;
const fs=require('fs');
(new KmlReader(new DOMParser().parseFromString(fs.readFileSync('somefile.kml').toString())))
  .parseMarkers(function(point){      
       
  }).parseLines((line)=>{
                
  }).parsePolygons((poly)=>{
                
  }).parseNetworklinks((link)=>{
                
  }).parseGroundOverlays((overlay)=>{
                
  });
