// This is the entry point for the build.  Contains basic user interaction code.
(function() {
    var apiKeys = require('./apikeys');
    var haveMap;
    window.ginit = function() { //Callback after maps api loads.  Must be in global scope
        $('#mapWrapper').show();
        var map = require('./mapctrl');
        window.haveMap=map.initmap();
    };

    window.importTask = function(points) {
        var present = require('./presentation');
        present.showImported(points);
        return "Task Entered";
    };


var doit;

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?v=3&key=' + apiKeys.googleMaps + '&callback=ginit';
    document.body.appendChild(script);

    function hiderest() {
        $('.easyclose').hide();
    }

    $(document).ready(function() {
        var preference = require('./preferences');
        var present = require('./presentation');
        var igcFile = require('./igc');
        preference.getStoredValues();
        present.showPreferences();
        document.getElementById('help').scrollIntoView();     
        $("#igc").prop("checked", true); //Firefox ignores markup on refresh

        $('#help').click(function() {
            window.open("igchelp.html", "_blank");
        });
        
          $('#about').click(function () {
          window.open("igcabout.html", "_blank");
        });
                  
        $('#fileControl').change(function() {
            if (this.files.length > 0) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        igcFile.initialise(this.result);
                        present.displayIgc();
                    }
                    catch (ex) {
                        if (ex instanceof igcFile.IGCException) {
                            alert(ex.message);
                        }
                        else {
                            throw ex;
                        }
                    }
                };
                reader.readAsText(this.files[0]);
            }
        });

resizedw= function() {
   if($('#righthalf').css('visibility')==='visible') {
    var plot= require('./plotgraph');
    var mapctrl=require('./mapctrl');
    plot.replot();
    mapctrl.resizeMap();
}
};
    
window.onresize = function(){
  clearTimeout(doit);
  doit = setTimeout(resizedw, 100);
};
        
        $('.closewindow').click(function() {
            $('.easyclose').hide();
            $('#timeSlider').focus();
        });

        $('#timeSlider').on('input', function() {
            hiderest();
            var t = parseInt($(this).val(), 10);
            present.showPosition(t);
        });

        $('#timeSlider').on('change', function() {
            hiderest();
            var t = parseInt($(this).val(), 10);
            present.showPosition(t);
        });

        $('#zoomtrack').click(function() {
            present.zoomTrack();
        });

        $('#airclip').change(function() {
            preference.setAirclip($(this).val());
            present.airClipChange();
        });

        $('#altitudeunits').change(function() {
            preference.setAltUnits($(this).val());
            present.altChange(parseInt($('#timeSlider').val(), 10));
        });

        $('#climbunits').change(function() {
            preference.setClimbUnits($(this).val());
            if (igcFile.recordTime.length > 0) {
                var t = parseInt($('#timeSlider').val(), 10);
                present.showPosition(t);
            }
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
            hiderest();
            $('#setunits').show();
        });

        $('#enterTask').click(function() {
            present.getUserTask();
        });

        $('input[type=radio][name=tasksource]').change(function() {
            preference.setTaskSource(this.id);
            present.replaceTask(this.id);
        });

        $('#sectorconfig').click(function() {
            hiderest();
            $('#sectordefs').show();
        });

        $('#tpdefaults').click(function() {
            present.showSectorPreferences('default');
        });

        $('#setsectors').click(function() {
            present.setSectors();
        });

        $('#tpdefaults').click(function() {
            preference.setSectorDefaults();
            present.showSectorPreferences();
        });

        $('#enl').click(function() {
            hiderest();
            $('#setenl').show();
        });

        $('#enldefaults').click(function() {
            present.showEnlPrefs('default');
        });
        
        $('#enlhelp').click(function () {
          window.open("igchelp.html#enl", "_blank");
        });

        $('#applyenl').click(function() {
            present.setEnlPrefs();
        });

        $('#cancelenl').click(function() {
            present.showEnlPrefs();
        });

        $('#altref').click(function() {
            hiderest();
            $('#setaltref').show();
        });

        $('#althelp').click(function() {
            window.open("igchelp.html#alt", "_blank");
        });

        $('#restorealtref').click(function() {
            present.showAltPreferences();
        });

        $('#analyse').click(function() {
            hiderest();
            present.reportFlight();
        });

        $('#height').click(function() {
            hiderest();
            $('#heightDetail').show();
            var t = parseInt($('#timeSlider').val(), 10);
            present.reportHeightInfo(t);
        });

        $('#thermal').click(function() {
            hiderest();
            $('#thermalDetail').show();
            var t = parseInt($('#timeSlider').val(), 10);
            present.reportThermal(t);
        });

        $('#applyaltref').click(function() {
            preference.setAltPrefs($("input[name='alttype']").filter(':checked').val(), $("input[name='altsource']").filter(':checked').val());
            present.altChange(parseInt($('#timeSlider').val(), 10));
        });
          
         $('#showgraph').click(function() {
            $(this).parent().hide();
            $('#map').css('zIndex',1);
            $('#barogram').css('zIndex',10);
             $('#showmap').show();
         });
         
         $('#showmap').click(function() {
             $('#map').css('zIndex', 10);
             $('#barogram').css('zIndex',1);
             $('#mapbuttons').show();;
              $(this).hide();
         });
         
         $('#showzoom').click(function() {
             $('#zoomdiv').css('zIndex',25);
             $('#zoomlabel').hide();
         });

        $('button.toggle').click(
          function () {
            $(this).next().toggle();
            if ($(this).next().is(':visible')) {
              $(this).text('Hide');
            } else {
              $(this).text('Show');
            }
          });
    });
})();
