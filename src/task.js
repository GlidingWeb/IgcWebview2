(function () {
  //This module handles task definitions

  var utils = require('./utilities');

  var tasklength;
  var names = [];
  var labels = [];
  var coords = [];
  var descriptions = [];
  var legsize = [];
  var bearing = [];


  module.exports = {

    clearTask: function () {
      tasklength = 0;
      names.length = 0;
      labels.length = 0;
      coords.length = 0;
      descriptions.length = 0;
      legsize.length = 0;
      bearing.length = 0;
    },

    createTask: function (points) {
     var prefs=require('./preferences');
      var i;
      var j = 1;
      this.clearTask();
      tasklength = 0;
      names[0] = points.names[0];
      labels[0] = "Start";
      coords[0] = points.coords[0];
      legsize[0] = 0;
      bearing[0] = 0;
      var leginfo;
      for (i = 1; i < points.coords.length; i++) {
        leginfo = utils.getTrackData(points.coords[i - 1], points.coords[i]);
        //eliminate situation when two successive points are identical (produces a divide by zero error on display.
        //To allow for FP rounding, within 30 metres is considered identical.
        if (leginfo.distance > 0.03) {
          names[j] = points.names[i];
          coords[j] = points.coords[i];
          labels[j] = "TP" + j;
          legsize[j] = leginfo.distance;
          bearing[j] = leginfo.bearing;
          tasklength += leginfo.distance;
          j++;
        }
      }
      if(prefs.sectors.finishtype==='circle') {
          tasklength-= prefs.sectors.finrad;
      }

      labels[labels.length - 1] = "Finish";
    },

    getTaskLength: function () {
      return tasklength;
    },
 
   setLength: function() {
        var prefs=require('./preferences');
       var i;
       var totalLength=0;
       for(i=0; i < coords.length; i++) {
           totalLength+=legsize[i];
       }
       if(prefs.sectors.finishtype==='circle') {
               totalLength-=prefs.sectors.finrad;
           }
       tasklength=totalLength;
   },
 
    names: names,
    labels: labels,
    coords: coords,
    bearing: bearing,
    legsize: legsize
  };
})();
