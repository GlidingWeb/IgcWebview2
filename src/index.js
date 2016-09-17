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

    function hiderest() {
        $('.easyclose').hide();
    }

    $(document).ready(function() {
        var preference = require('./preferences');
        var present = require('./presentation');
        var igcFile = require('./igc');
        preference.getStoredValues();
        present.showPreferences();

        $("#igc").prop("checked", true); //Firefox ignores markup on refresh

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
    });
})();
