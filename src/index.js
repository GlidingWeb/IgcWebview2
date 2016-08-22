// This is the entry point for the build.  Contains basic user interaction code.

var preference=require('./preferences');
var present=require('./presentation');

window.ginit=function(){                            //Callback after maps api loads.  Must be in global scope
    var map=require('./mapctrl');
      map.initmap();
}

window.importTask=function(points) {
    var present=require('./presentation');
      console.log("imported");
      present.showImported(points);
      return "Task Entered";
  }

var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://maps.googleapis.com/maps/api/js?v=3&callback=ginit';
  document.body.appendChild(script);

  preference.getStoredValues();
  present.showStoredValues();
  
  $("#igc").prop("checked", true);  //Firefox ignores markup on refresh
  
 $('#fileControl').change(function() {

     if (this.files.length > 0) {
            var reader = new FileReader();
            reader.onload = function (e) {
            //  try {                                                                //exception handling temporarily disabled till debugged
                var igcFile=require('./igc');
                 igcFile.initialise(this.result);
                present.displayIgc();
              /*  
              } catch (ex) {
                if (ex instanceof IGCException) {
                  alert(ex.message);
                } else {
                  throw ex;
                }
              }
       */       
            };
            reader.readAsText(this.files[0]);
          }
    });
       
        $('#timeSlider').on('input', function () {
          var t = parseInt($(this).val(), 10);
           present.showPosition(t);
        });

      $('#timeSlider').on('change', function () {
          var t = parseInt($(this).val(), 10);
          present.showPosition(t);
        });

     $('#zoomtrack').click(function () {
          present.zoomTrack();
        });
          
      $('#help').click(function () {
          alert( "You are running jQuery version: " + $.fn.jquery );
        });
      
        $('#airclip').change(function() {
          preference.setAirclip($(this).val());
          present.airClipChange();
      });
      
      $('#altitudeunits').change(function() {
          preference.setAltUnits($(this).val());
          present.altChange(parseInt($('#timeSlider').val(),10));
      });
      
      $('#climbunits').change(function() {
          preference.setClimbUnits($(this).val());
      });
      
       $('#lengthunits').change(function() {
          preference.setLengthUnits($(this).val());
          present.lengthChange();
      });
      
    $('#cruiseunits').change(function() {
          preference.setCruiseUnits($(this).val());
      });
    
    $('#taskunits').change(function() {
          preference.setTaskUnits($(this).val());
      });
    
     $('#unitconfig').click(function() {
       $('#setunits').show();
   });
       
    $('.closewindow').click(function () {
          $(this).parent().hide();
        });
    
    $('#enterTask').click(function(){
        present.getUserTask();
    });
    
    $('input[type=radio][name=tasksource]').change(function () {
       // var task=require('./task');
       // var mapCtrl= require('./mapctrl');
       // task.clearTask();
       // present.clearTask();
        //mapCtrl.zapTask();
        preference.setTaskSource(this.id);
        present.replaceTask(this.id);
        /*
          $('#taskentry').hide();
          $('#task').hide();
          clearTask();
          switch (this.value) {
          case "infile":
            if (igcFile) {
              task = getFileTask();
              if (task) {
                showTask();
              } else {
                alert("No declaration found");
              }
            }
            break;
          case "user":
            $('#taskentry').show();
            break;
          case "xcplan":
            getFromPlanner(this.id);
            break;
          case "nix":
            clearTask();
            break;
          }
*/
    });
    