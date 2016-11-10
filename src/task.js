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
  var tasktype;
  var aatradii=[];
  var aatRange;
  var aatMins;

  function  getAatRange() {
      var prefs= require('./preferences');
      var minDistance=0;
      var maxDistance=0;
      var i;
      var bisector;
      var prevnearest=coords[0]
      var prevfurthest=coords[0];
      var minpoint=[];
      var backbearing;
      var nearest;
      var furthest;
      for(i=1; i < bearing.length-1; i++) {
       backbearing = (bearing[i+1] + 180) % 360;
       bisector = bearing[i] + (backbearing - bearing[i]) / 2;
        if (Math.abs(backbearing - bearing[i]) > 180) {
            bisector = (bisector + 180) % 360;
        }
          furthest= utils.targetPoint(coords[i],aatradii[i-1],bisector);
          nearest= utils.targetPoint(coords[i],aatradii[i-1],(bisector + 180)%360);
         minDistance +=utils.toPoint(prevnearest,nearest).distance;
         maxDistance += utils.toPoint(prevfurthest,furthest).distance;
         prevnearest=nearest;
         prevfurthest=furthest;
      }
      minDistance+=utils.toPoint(coords[coords.length-1],nearest).distance;
        maxDistance+=utils.toPoint(coords[coords.length-1],furthest).distance;
        if(prefs.sectors.finishtype==='circle') {
            minDistance-=prefs.sectors.finrad;
            maxDistance-=prefs.sectors.finrad;
        }
         return minDistance.toFixed(1) + " / " + maxDistance.toFixed(1) + " Km";
  }
  
  module.exports = {

    clearTask: function () {
      tasklength = 0;
      names.length = 0;
      labels.length = 0;
      coords.length = 0;
      descriptions.length = 0;
      legsize.length = 0;
      bearing.length = 0;
      aatradii.length=0;
      this.tasktype='trad';
    },

    createTask: function (points) {
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
        leginfo = utils.toPoint(points.coords[i - 1], points.coords[i]);
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
      labels[labels.length - 1] = "Finish";
    },

    getTaskLength: function () {
      return tasklength;
    },
 
    setAat: function(radii,aattime) {
        var i;
        this.tasktype='aat';
        aatradii.length=0;
        for(i=0;i < radii.length; i++) {
            aatradii.push(radii[i]);
        }
        this.aatRange=getAatRange();
        this.aatMins=aattime;
    },

    setSectorType: function(type) {
        this.tasktype=type;
    },
 
    names: names,
    labels: labels,
    coords: coords,
    bearing: bearing,
    legsize: legsize,
    aatradii: aatradii,
    tasktype: tasktype,
    aatRange: aatRange,
    aatMins: aatMins
  };
})();
