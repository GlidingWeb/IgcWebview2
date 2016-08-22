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
    var altOffset;
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
    if(prefs.altRefs.source==='P') {
        altitudeLabel="Pressure Altitude";
     plotColour = '#FF0000';
       switch (prefs.altRefs.reference) {
      case "QFE":
        altitudeLabel += " (QFE takeoff)";
        altOffset= -flight.pressureAltitude[0];
        break;
      case "QNH":
        altitudeLabel += " (QNH)";
        altOffset=flight.baseElevation-flight.pressureAltitude[0];
        break;
      case "std":
        altitudeLabel += " (ref 1013mb)";
        altOffset=0;
        break;
      }
       for (j = 0; j < flight.recordTime.length; j++) {
        barogramData.push([1000*(flight.recordTime[j] + flight.timeZone.offset), multiplier*(flight.pressureAltitude[j]+altOffset)]);
      }
    }
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

   


