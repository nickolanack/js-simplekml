# js-simplekml
A Javascript kml parser

#Usage
```js
//simple usage
(new KmlReader(xmlString))
  .parseMarkers(function(point){      
       
  }).parseLines(function(line){
                
  }).parsePolygons(function(poly){
                
  }).parseNetworklinks(function(link){
                
  }).parseGroundOverlays(function(overlay){
                
  });

```
