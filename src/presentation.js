//This module handles all presentation tasks that are in simple html- ie: excluding the map and graph

var flight=require('./igc');
var prefs=require('./preferences');
var utils=require('./utilities');
var mapControl=require('./mapctrl.js');
var barogram=require('./plotgraph');
 var task=require('./task.js');
 var planWindow;

 function zapTask() {
     $('#taskentry').hide();
      $('#task').hide();
      task.clearTask();
      mapControl.zapTask();
 }
 
 function  enterTask(points,zoomto) {
     task.createTask(points);
    var distance=task.getTaskLength();
  var i;
    var pointlabel;
    $('#taskbuttons').html("");
        $('#taskinfo').html("");
    for (i = 0; i < task.labels.length; i++) {
      $('#taskinfo').append('<tr><th>' + task.labels[i] + ':</th><td>' + task.names[i] + ':</td><td>' + utils.showFormat(task.coords[i]) + '</td></tr>');
      switch (i) {
      case 0:
        pointlabel = "Start";
        break;
      case task.labels.length - 1:
        pointlabel = "Finish";
        break;
      default:
        pointlabel = "TP" + i.toString();
      }
      $('#taskbuttons').append('&nbsp;<button>' + pointlabel + '</button>');
    }
    $('#tasklength').text("Task distance: " + prefs.showDistance(distance));
     $('#task').show();
     mapControl.addTask(points,zoomto);
     $('#taskbuttons button').on('click', function (event) {
        var li = $(this).index();
        mapControl.showTP(task.coords[li]);
      });
}
 
function displayHeaders(headerList) {
 var headerBlock = $('#headers'); 
    var headerIndex;
      headerBlock.html('');
    for (headerIndex = 0; headerIndex < headerList.length; headerIndex++) {
        headerBlock.append('<tr><th>' + headerList[headerIndex].name + ":  </th><td>" + headerList[headerIndex].value + "</td></tr>");
    }
}

function getFromPlanner(source) {
    var planUrl = "../TaskMap/xcplan.php?version="  + source;
    if ((!(planWindow)) || (planWindow.closed)) {
      planWindow = window.open(planUrl, "_blank");
    }
    planWindow.focus();
  }

module.exports={
    
showImported: function(points) {
    enterTask(points,true);
},
    
showStoredValues: function() {
    $('#altitudeunits').val(prefs.units.altitude);
    $('#lengthunits').val(prefs.units.distance);
     $('#climbunits').val(prefs.units.climb);
     $('#cruiseunits').val(prefs.units.cruise);
     $('#taskunits').val(prefs.units.task);
    $('#airclip').val(prefs.airclip);
},

getUserTask: function() {
    var input;
    var pointdata;
    var success = true;
    var taskdata = {
      coords: [],
      names: []
    };
    $("#requestdata :input[type=text]").each(function () {
        input = $(this).val().replace(/ /g, '');
        if (input.length > 0) {
          pointdata = utils.getPoint(input);
          if (pointdata.message === "OK") {
            taskdata.coords.push(pointdata.coords);
            taskdata.names.push(pointdata.name);
          } else {
            success = false;
            alert("\"" + $(this).val() + "\"" + " not recognised-" + " ignoring entry");
          }
        }
      });
     if(success===true) {
         if(taskdata.names.length > 1) {
             enterTask(taskdata,true);
         }
         $('#taskentry').hide();
     }
    /*
    if (taskdata.name.length > 1) {
      if (success) {
        return maketask(taskdata);
      } else {
        return null;
      }
    }
    */
  },

replaceTask: function(source) {
      var taskpoints=null;
     $('#taskentry').hide();
      $('#task').hide();
      switch(source) {
          case 'igc':
              if(flight.latLong.length >0) {
                 if(flight.taskpoints.names.length > 1) {
                    taskpoints=flight.taskpoints;
                      enterTask(taskpoints,false);
                 }
                 else {
                     alert("No task found in IGC file");
                 }
              }
              break;
          case 'user':
              $('#taskentry').show();
              break;
          case 'world':
              getFromPlanner('world');
          case 'uk':
              getFromPlanner('uk');
              break;
          case 'nix': 
              zapTask();
              break;
      }
},

showPosition:  function(index) {
    var altInfo=prefs.showAltitude(flight.pressureAltitude[index],flight.gpsAltitude[index],flight.baseElevation,flight.pressureAltitude[0],flight.gpsAltitude[0]);
     var displaySentence=utils.unixToString((flight.recordTime[index] + flight.timeZone.offset + 86400)%86400) + ' ' + flight.timeZone. zoneAbbr + ': ';
    displaySentence+= altInfo.displaySentence;
    displaySentence+= ": " + utils.showFormat(flight.latLong[index]);
    $('#timePositionDisplay').html(displaySentence);
      var xval = 1000 * (flight.recordTime[index] + flight.timeZone.offset);
      var yval = altInfo.altPos;
      mapControl.setTimeMarker(flight.latLong[index]);
       barogram.lockCrosshair({
      x: xval,
      y: yval
    });
},

altChange: function(index) {
    if(flight.latLong.length > 0) {
        barogram.plot();
        this.showPosition(index);
    }
},

airClipChange: function() {
    mapControl.showAirspace();
},

lengthChange: function() {
    var distance=task.getTaskLength();
      $('#tasklength').text("Task distance: " + prefs.showDistance(distance));
},

displayIgc: function(){
var task=require('./task.js');
displayHeaders(flight.headers);
$('#timeSlider').val(0);
$('#timeSlider').prop('max', flight.recordTime.length-1);
mapControl.setBounds(flight.bounds);
$.when(utils.getAirspace(flight.bounds,20)).done(function(args) {
             mapControl.setAirspace(args);
             mapControl.showAirspace();
           });
var _this=this;
 $.when(utils.getTimeZone(flight.unixStart[0],flight.latLong[0]),utils.getElevation(flight.latLong[0])).done(function (tzargs,elargs) {
          if (tzargs[0].status === 'OK') {
                  flight.timeZone.zoneAbbr = tzargs[0].timeZoneName.match(/[A-Z]/g).join('');
                  flight.timeZone.offset = parseFloat(tzargs[0].rawOffset) + parseFloat(tzargs[0].dstOffset);
                 flight.timeZone.zoneName = tzargs[0].timeZoneName;
                  $('#datecell').text(utils.showDate(flight.unixStart[0] + flight.timeZone.offset));
        } 
        if (elargs[0].status === 'OK') {
          flight.baseElevation.valid=true;
          flight.baseElevation.value = elargs[0].results[0].elevation;
        }
          barogram.plot();
        _this.showPosition(0);
        });

mapControl.addTrack(flight.latLong);
if(prefs.tasksource==='igc') {
    if(flight.taskpoints.names.length > 1) {
    enterTask(flight.taskpoints,false);
     }
     else {
         zapTask();
     }
    }
    $('#timeSlider').val(0);
    $('#timeSlider').prop('max', flight.recordTime.length - 1);

},

zoomTrack: function() {
    if(flight) {
       mapControl.setBounds(flight.bounds);
    }
}

}