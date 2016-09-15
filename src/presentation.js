(function() {
    //This module handles all presentation tasks that are in simple html- ie: excluding the map and graph
    "use strict";
    var flight = require('./igc');
    var prefs = require('./preferences');
    var utils = require('./utilities');
    var mapControl = require('./mapctrl.js');
    var barogram = require('./plotgraph');
    var task = require('./task.js');
    var planWindow;

    function zapTask() {
        $('#taskentry').hide();
        $('#task').hide();
        task.clearTask();
        mapControl.zapTask();
    }

    function enterTask(points, zoomto) {
        task.createTask(points);
        var distance = task.getTaskLength();
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
        mapControl.addTask(points, zoomto);
        $('#taskbuttons button').on('click', function(event) {
            var li = $(this).index();
            mapControl.showTP(task.coords[li]);
        });
    }

    function showLocalTime(index) {
        return utils.unixToString((flight.recordTime[index] + flight.timeZone.offset + 86400) % 86400);
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
        var planUrl = "../TaskMap/xcplan.php?version=" + source;
        if ((!(planWindow)) || (planWindow.closed)) {
            planWindow = window.open(planUrl, "_blank");
        }
        planWindow.focus();
    }

    module.exports = {

        setSectors: function() {
            var sectors = {
                startrad: $('#startrad').val(),
                finrad: $('#finishrad').val(),
                tprad: $('#tpbarrelrad').val(),
                sector_rad: $('#tpsectorrad').val(),
                sector_angle: $('#subtends').val(),
                use_sector: $('#tpsector').prop('checked'),
                use_barrel: $('#tpbarrel').prop('checked'),
                finishtype: $("input[name=finishtype]:checked").val()
            };

            var saveit = $('#savesectors').prop('checked');
            if (prefs.setSectors(sectors, saveit)) {
                mapControl.addSectors();
                $('#sectordefs').hide();
            }
        },

        setEnlPrefs: function() {
            var enl = {
                detect: $("input[name=enldetect]:checked").val(),
                threshold: $('#enlthreshold').val(),
                duration: $('#enltime').val()
            };
            var saveit = $('#saveenl').prop('checked');
            if (prefs.setEnl(enl, saveit)) {
                if (flight.recordTime.length > 0) {
                    flight.getEngineRuns(enl);
                    mapControl.showEngineRuns(flight.engineRunList);
                    barogram.plot();
                }
            }
        },

        showImported: function(points) {
            enterTask(points, true);
        },

        showSectorPreferences: function(origin) {
            var sectorObj;
            if (origin === 'current') {
                sectorObj = prefs.sectors;
            }
            else {
                sectorObj = prefs.sectorDefaults;
            }
            $('#startrad').val(sectorObj.startrad);
            $('#finishrad').val(sectorObj.finrad);
            $('#tpbarrelrad').val(sectorObj.tprad);
            $('#tpsectorrad').val(sectorObj.sector_rad);
            $('#subtends').val(sectorObj.sector_angle);
            if (sectorObj.use_sector) {
                $('#tpsector').prop('checked', true);
            }
            if (sectorObj.use_barrel) {
                $('#tpbarrel').prop('checked', true);
            }
            if (sectorObj.finishtype === 'line') {
                $("input[name=finishtype][value='line']").prop("checked", true);
            }
            else {
                $("input[name=finishtype][value='circle']").prop("checked", true);
            }
        },

        showEnlPrefs: function(origin) {
            var enlObj;
            if (origin === 'current') {
                enlObj = prefs.enlPrefs;
            }
            else {
                enlObj = prefs.enlDefaults;
            }
            if (enlObj.detect === 'On') {
                $("input[name=enldetect][value='On']").prop("checked", true);
            }
            else {
                $("input[name=enldetect][value='Off']").prop("checked", true);
            }
            $('#enlthreshold').val(enlObj.threshold),
                $('#enltime').val(enlObj.duration)
        },

        showPreferences: function() {
            $('#altitudeunits').val(prefs.units.altitude);
            $('#lengthunits').val(prefs.units.distance);
            $('#climbunits').val(prefs.units.climb);
            $('#cruiseunits').val(prefs.units.cruise);
            $('#taskunits').val(prefs.units.task);
            $('#airclip').val(prefs.airclip);
            this.showSectorPreferences('current');
            this.showEnlPrefs('current');
            this.showAltPreferences();
        },

        getUserTask: function() {
            var input;
            var pointdata;
            var success = true;
            var taskdata = {
                coords: [],
                names: []
            };
            $("#requestdata :input[type=text]").each(function() {
                input = $(this).val().replace(/ /g, '');
                if (input.length > 0) {
                    pointdata = utils.getPoint(input);
                    if (pointdata.message === "OK") {
                        taskdata.coords.push(pointdata.coords);
                        taskdata.names.push(pointdata.name);
                    }
                    else {
                        success = false;
                        alert("\"" + $(this).val() + "\"" + " not recognised-" + " ignoring entry");
                    }
                }
            });
            if (success === true) {
                if (taskdata.names.length > 1) {
                    enterTask(taskdata, true);
                }
                $('#taskentry').hide();
            }
        },

        replaceTask: function(source) {
            var taskpoints = null;
            $('#taskentry').hide();
            $('#task').hide();
            switch (source) {
                case 'igc':
                    if (flight.latLong.length > 0) {
                        if (flight.taskpoints.names.length > 1) {
                            taskpoints = flight.taskpoints;
                            enterTask(taskpoints, false);
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
                    break;
                case 'uk':
                    getFromPlanner('uk');
                    break;
                case 'nix':
                    zapTask();
                    break;
            }
        },

        /*
        showPosition: function(index) {
            var climbRate = flight.getClimb(index);
            var altInfo = prefs.showAltitude(flight.pressureAltitude[index], flight.gpsAltitude[index], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
            var displaySentence = showLocalTime(index) + ' ' + flight.timeZone.zoneAbbr + ': ';
            displaySentence += altInfo.displaySentence;
            displaySentence += ": " + utils.showFormat(flight.latLong[index]);
            if (climbRate !== null) {
                displaySentence += "; vario: " + prefs.showClimb(climbRate);
            }
            if (Math.abs(flight.turnRate[index]) < 2) {
                displaySentence += " Ground speed: " + prefs.showCruise(flight.groundSpeed[index]);
            }
            $('#timePositionDisplay').html(displaySentence);
            var xval = 1000 * (flight.recordTime[index] + flight.timeZone.offset);
            var yval = altInfo.altPos;
            mapControl.setTimeMarker(flight.latLong[index]);
            barogram.lockCrosshair({
                x: xval,
                y: yval
            });
        },
*/
        showPosition: function(index) {
            var flightMode = "Transition";
            var climbRate = flight.getClimb(index);
            var altInfo = prefs.showAltitude(flight.pressureAltitude[index], flight.gpsAltitude[index], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
            var displaySentence = "<b>Time:</b>&nbsp;" + showLocalTime(index) + "&nbsp;" + flight.timeZone.zoneAbbr + ":";
            displaySentence += "  <b>Position:</b>&nbsp;" + utils.showFormat(flight.latLong[index]) + ":";

            var takeOffIndex = flight.getTakeOffIndex();
            var landingIndex = flight.getLandingIndex();
            if (index < takeOffIndex) {
                flightMode = "Pre&nbsp;take&nbsp;off";
            }
            else {
                if (index > landingIndex) {
                    flightMode = "Landed";
                }
                else {
                    var turn = Math.abs(flight.turnRate[index]);
                    if (turn > 5) {
                        flightMode = "Circling";
                    }
                    if (turn < 4) {
                        flightMode = "Cruising";
                    }
                }
            }
            if (flightMode) {
                displaySentence += " <b>Flight&nbsp;mode:</b>&nbsp;" + flightMode + ":";
            }
            displaySentence += " <b>Altitude:</b>&nbsp;" + altInfo.displaySentence + ":";
            if (climbRate !== null) {
                displaySentence += " <b>Vario:</b> " + prefs.showClimb(climbRate) + ":";
            }
            if (flightMode === "Cruising") {
                displaySentence += " <b>Ground speed:</b>&nbsp;" + prefs.showCruise(flight.groundSpeed[index]);
            }
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
            if (flight.latLong.length > 0) {
                barogram.plot();
                this.showPosition(index);
            }
        },

        airClipChange: function() {
            mapControl.showAirspace();
        },

        lengthChange: function() {
            var distance = task.getTaskLength();
            $('#tasklength').text("Task distance: " + prefs.showDistance(distance));
        },

        getGeoInfo: function(elevation) {
            if (elevation === null) {
                var message = "Start elevation not available.";
                $('#QNH').attr('disabled', true);
                $('#QFE').attr('disabled', false);
                if (prefs.altPrefs.altref === 'QNH') {
                    message += " Using QFE";
                    prefs.altPrefs.altref = 'QFE';
                    $('#QFE').prop('checked', true);
                }
                alert(message);
            }
            else {
                $('#QNH').attr('disabled', false);
                flight.baseElevation = elevation;
            }
            barogram.plot();
            $('#datecell').text(utils.showDate(flight.unixStart[0] + flight.timeZone.offset));
            this.showPosition(0);
        },

        displayIgc: function() {
            if (flight.takeOff.pressure === null) {
                $('#P').attr('disabled', true);
                $('#G').attr('disabled', false);
                if (prefs.altPrefs.altsource === 'P') {
                    alert("Pressure altitude not available. Using GPS");
                    prefs.altPrefs.altsource = 'G';
                    $('#G').prop('checked', true);
                }
            }
            else {
                $('#P').attr('disabled', false);
            }
            var tzBack = this.getGeoInfo.bind(this);
            utils.getLocalInfo(flight.unixStart[0], flight.latLong[0], flight.timeZone, tzBack);
            displayHeaders(flight.headers);
            $('#timeSlider').val(0);
            $('#timeSlider').prop('max', flight.recordTime.length - 1);
            mapControl.setBounds(flight.bounds);
            $.when(utils.getAirspace(flight.bounds, 20)).done(function(args) {
                mapControl.setAirspace(args);
                mapControl.showAirspace();
            });
            mapControl.addTrack(flight.latLong);
            if (prefs.enlPrefs.detect === 'On') {
                flight.getEngineRuns(prefs.enlPrefs);
                mapControl.showEngineRuns(flight.engineRunList);
            }
            if (prefs.tasksource === 'igc') {
                if (flight.taskpoints.names.length > 1) {
                    enterTask(flight.taskpoints, false);
                }
                else {
                    zapTask();
                }
            }
            $('#timeSlider').val(0);
            $('#timeSlider').prop('max', flight.recordTime.length - 1);
        },

        zoomTrack: function() {
            if (flight) {
                mapControl.setBounds(flight.bounds);
            }
        },

        showAltPreferences: function() {
            var altSource = prefs.altPrefs.altsource;
            $('#' + altSource).prop('checked', true);
            var altRef = prefs.altPrefs.altref;
            $('#' + altRef).prop('checked', true);
        },

        reportFlight: function() {
            $('#sectordefs').hide();
            $('taskcalcs').text('');
            $('#taskdata').show();
            var takeOffIndex = flight.getTakeOffIndex();
            var landingIndex = flight.getLandingIndex();
            var altValue = [];
            var altLoss;
            $('#taskcalcs').html("Take off:  " + showLocalTime(takeOffIndex) + "<br>");
            if (task.coords.length > 1) {
                var analyse = require('./analyse');
                var taskData = analyse.assessTask();
                var i;
                for (i = 0; i < task.coords.length; i++) {
                    $('#taskcalcs').append("<br/>" + task.labels[i] + ": ");
                    if (i < taskData.npoints) {
                        $('#taskcalcs').append(showLocalTime(taskData.turnIndices[i]) + ": Altitude: ");
                        altValue[i] = prefs.showAltitude(flight.pressureAltitude[taskData.turnIndices[i]], flight.gpsAltitude[taskData.turnIndices[i]], flight.takeOff.pressure, flight.takeOff.gps, flight.baseElevation);
                        $('#taskcalcs').append(altValue[i].altPos + altValue[i].descriptor);
                    }
                    else {
                        $('#taskcalcs').append("No control");
                    }
                }
                if (taskData.npoints === task.coords.length) { //task completed
                    $('#taskcalcs').append("<br/><br/>" + prefs.showDistance(task.getTaskLength()) + "  task completed");
                    var elapsedTime = flight.recordTime[taskData.turnIndices[taskData.npoints - 1]] - flight.recordTime[taskData.turnIndices[0]];
                    $('#taskcalcs').append("<br/>Elapsed time: " + utils.unixToPaddedString(elapsedTime));
                    $('#taskcalcs').append("<br/>Speed: " + prefs.showTaskSpeed(3600 * task.getTaskLength() / elapsedTime));
                    altLoss = altValue[0].altPos - altValue[task.coords.length - 1].altPos;
                    $('#taskcalcs').append("<br/>Height loss: " + altLoss + " " + altValue[0].descriptor);
                    if (prefs.units.altitude !== 'mt') {
                        if (prefs.altPrefs.source === 'P') {
                            altLoss = flight.pressureAltitude[taskData.turnIndices[0]] - flight.pressureAltitude[taskData.turnIndices[task.coords.length - 1]];
                        }
                        else {
                            altLoss = flight.gpsAltitude[taskData.turnIndices[0]] - flight.gpsAltitude[taskData.turnIndices[task.coords.length - 1]];
                        }
                        $('#taskcalcs').append(" (" + altLoss + "m)");
                    }
                }
                else { // GPS landout
                    if (taskData.npoints > 0) {
                        $('#taskcalcs').append("<br/><br/>\"GPS Landing\" at: " + showLocalTime(taskData.bestPoint));
                        $('#taskcalcs').append("<br/>Position: " + utils.showFormat(flight.latLong[taskData.bestPoint]));
                        $('#taskcalcs').append("<br/>Scoring distance: " + prefs.showDistance(taskData.scoreDistance));
                        mapControl.pushPin(flight.latLong[taskData.bestPoint]);
                    }
                }
            }
            $('#taskcalcs').append("<br/><br/>Landing: " + showLocalTime(landingIndex));
            var flightSeconds = flight.recordTime[landingIndex] - flight.recordTime[takeOffIndex];
            $('#taskcalcs').append("<br/><br/>Flight time: " + Math.floor(flightSeconds / 3600) + "hrs " + utils.pad(Math.round(flightSeconds / 60) % 60) + "mins");
        },

        showQfe: function(elevation, index) {
            var displayValue;
            if (elevation !== null) {
                if (flight.takeOff.pressure === null) {
                    displayValue = flight.gpsAltitude[index] - flight.takeOff.pressure + flight.baseElevation - elevation;
                }
                else {
                    displayValue = flight.pressureAltitude[index] - flight.takeOff.pressure + flight.baseElevation - elevation;
                }
                var showdata = prefs.displayAlt(displayValue);
                $('#heightAGL').text("Height above ground: " + showdata.showval + showdata.descriptor);
            }
        },

        reportHeightInfo: function(index) {
            var elevation;
            if (flight.baseElevation !== null) {
                var elBack = this.showQfe.bind(this);
                utils.getElevation(flight.latLong[index], elBack, index);
            }
        }
    };
})();
