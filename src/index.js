// This is the entry point for the build.  Contains basic user interaction code.
(function() {
    var apiKeys = require('./apikeys');

    window.ginit = function() { //Callback after maps api loads.  Must be in global scope
        var map = require('./mapctrl');
        map.initmap();
    };

    window.importTask = function(points) {
        var present = require('./presentation');
        present.showImported(points);
        return "Task Entered";
    };

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?v=3&key=' + apiKeys.googleMaps + '&callback=ginit';
    document.body.appendChild(script);

    $(document).ready(function() {
        var preference = require('./preferences');
        var present = require('./presentation');
        preference.getStoredValues();
        present.showPreferences();

        $("#igc").prop("checked", true); //Firefox ignores markup on refresh

        $('#fileControl').change(function() {

            if (this.files.length > 0) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    //  try {                                                                //exception handling temporarily disabled till debugged
                    var igcFile = require('./igc');
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

        $('#timeSlider').on('input', function() {
            var t = parseInt($(this).val(), 10);
            present.showPosition(t);
        });

        $('#timeSlider').on('change', function() {
            var t = parseInt($(this).val(), 10);
            present.showPosition(t);
        });

        $('#zoomtrack').click(function() {
            present.zoomTrack();
        });

        $('#help').click(function() {
            present.showPreferences();
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

        $('.closewindow').click(function() {
            $(this).parent().hide();
        });

        $('#enterTask').click(function() {
            present.getUserTask();
        });

        $('input[type=radio][name=tasksource]').change(function() {
            preference.setTaskSource(this.id);
            present.replaceTask(this.id);
        });

        $('#sectorconfig').click(function() {
            $('#sectordefs').show();
        });

        $('#tpdefaults').click(function() {
            present.showSectorPreferences('default');
        });

        $('#setsectors').click(function() {
            present.setSectors();
        });

        $('#cancelsectors').click(function() {
            $(this).parent().hide();
        });

        $('#tpdefaults').click(function() {
            preference.setSectorDefaults();
            present.showSectorPreferences();
        });

        $('#enl').click(function() {
            $('#setenl').show();
        });

        $('#enldefaults').click(function() {
            present.showEnlPrefs('default');
        });

        $('#applyenl').click(function() {
            present.setEnlPrefs();
            $(this).parent().hide();
        });

        $('#cancelenl').click(function() {
            present.showEnlPrefs();
            $(this).parent().hide();
        });

        $('#altref').click(function() {
            $('#setaltref').show();
        });

        $('#althelp').click(function() {
            window.open("igchelp.html#alt", "_blank");
        });

        $('#restorealtref').click(function() {
            $(this).parent().hide();
            present.showAltPreferences();
        });

        $('#analyse').click(function() {
            present.reportFlight();
        });

        $('#applyaltref').click(function() {
            preference.setAltPrefs($("input[name='alttype']").filter(':checked').val(), $("input[name='altsource']").filter(':checked').val());
            present.altChange(parseInt($('#timeSlider').val(), 10));
            $(this).parent().hide();
        });
    });
})();
