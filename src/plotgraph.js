 //Plots the barogram.
 //Also exports the "lockCrosshair()" function
 
 require('../lib/jquery.flot.min.js');
  require('../lib/jquery.flot.time.min.js');
  require('../lib/jquery.flot.axislabels.js');
  require('../lib/jquery.flot.crosshair.js');
  var baro;
module.exports =  {
 plot: function() {
   var j;
    var altitudeLabel;
    var plotColour;
    var barogramData=[];
    var altOffset=0;
    var flight=require('./igc');
    var prefs=require('./preferences');
    var multiplier;
    if(prefs.units.altitude==='ft') {
        multiplier=prefs.metre2foot;
        yaxisLabel= "Altitude (feet)";
    }
    else {
         yaxisLabel= "Altitude (metres)";
         multiplier=1;
    }
    
    if(prefs.altPrefs.altref==='QNH') {
        altOffset=flight.baseElevation;
    }
   
    if(prefs.altPrefs.altsource==='P') {
      altitudeLabel="Pressure Altitude";
      plotColour = '#FF0000';
      if(prefs.altPrefs.altref !=='std') {
          altOffset-=flight.takeOff.pressure;
      }
    for (j = 0; j < flight.recordTime.length; j++) {
        barogramData.push([1000*(flight.recordTime[j] + flight.timeZone.offset), multiplier*(flight.pressureAltitude[j]+altOffset)]);
      }
    }
else {
      altitudeLabel = "GPS Altitude";
      plotColour = '#8080FF';
    if(prefs.altPrefs.altref !=='std'){
          altOffset-=flight.takeOff.gps;
      }
        for (j = 0; j < flight.recordTime.length; j++) {
            if(flight.fixQuality[j] ==='A') {
               barogramData.push([1000*(flight.recordTime[j] + flight.timeZone.offset), multiplier*(flight.gpsAltitude[j]+altOffset)]);
            }
      }
}
altitudeLabel = altitudeLabel + " (" +prefs.altPrefs.altref + ")";
    baro=new $.plot("#barogram", [ {
      label: altitudeLabel,
      data: barogramData,
      color: plotColour
    }],
     {
      axisLabels: {
        show: true
      },
       xaxes: [{
        mode: 'time',
        timeformat: '%H:%M',
        axisLabel: 'Time (' + flight.timeZone.zoneName + ')'
      }],
      yaxes: [{
        axisLabel: yaxisLabel
      }],
      crosshair: {
        mode: 'xy'
      },
      grid: {
        clickable: true,
        autoHighlight: false
      }
     }
    );

$("#barogram").bind("plotclick", function (event, pos, item) {
   if (item) {
            var present=require('./presentation');
            present.showPosition(item.dataIndex);
            $('#timeSlider').val(item.dataIndex);
          }
});
 },
 
 lockCrosshair: function(pos) {
     baro.lockCrosshair(pos);
 }
 }

   


