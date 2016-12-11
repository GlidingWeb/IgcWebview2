(function() {
    //Plots the barogram.
    //Also exports the "lockCrosshair()" function

    require('../lib/jquery.flot.min.js');
    require('../lib/jquery.flot.time.min.js');
    require('../lib/jquery.flot.axislabels.js');
    require('../lib/jquery.flot.crosshair.js');
    var baro;
    module.exports = {
        plot: function() {
            var j;
            var altitudeLabel;
            var plotColour;
            var barogramData = [];
            var enlData = [];
            var altOffset = 0;
            var flight = require('./igc');
            var prefs = require('./preferences');
            var multiplier;
            var showEnl;
            var enlLabel;
            var enlThreshold;
            var spotAlt;
            var yaxisLabel;
            var altMin = 0;

            var startTime = 1000 * (flight.recordTime[0] + flight.timeZone.offset);
            var finishTime = 1000 * (flight.recordTime[flight.recordTime.length - 1] + flight.timeZone.offset);
            if (prefs.enlPrefs.detect === 'Off') {
                showEnl = false;
                enlLabel = '';
            }
            else {
                showEnl = true;
                enlLabel = 'ENL';
                enlThreshold = prefs.enlPrefs.threshold;
            }
            if (prefs.units.altitude === 'ft') {
                multiplier = prefs.metre2foot;
                yaxisLabel = "Altitude (feet)";
            }
            else {
                yaxisLabel = "Altitude (metres)";
                multiplier = 1;
            }

            if (prefs.altPrefs.altref === 'QNH') {
                altOffset = flight.baseElevation;
            }

            if (prefs.altPrefs.altsource === 'P') {
                altitudeLabel = "Pressure Altitude";
                plotColour = '#FF0000';
                if (prefs.altPrefs.altref !== 'std') {
                    altOffset -= flight.takeOff.pressure;
                }
                for (j = 0; j < flight.recordTime.length; j++) {
                    spotAlt = multiplier * (flight.pressureAltitude[j] + altOffset);
                    barogramData.push([1000 * (flight.recordTime[j] + flight.timeZone.offset), spotAlt]);
                    if (spotAlt < altMin) {
                        altMin = spotAlt;
                    }
                }
            }
            else {
                altitudeLabel = "GPS Altitude";
                plotColour = '#8080FF';
                if (prefs.altPrefs.altref !== 'std') {
                    altOffset -= flight.takeOff.gps;
                }
                for (j = 0; j < flight.recordTime.length; j++) {
                    if (flight.fixQuality[j] === 'A') {
                        barogramData.push([1000 * (flight.recordTime[j] + flight.timeZone.offset), multiplier * (flight.gpsAltitude[j] + altOffset)]);
                    }
                }
            }
            if (showEnl) {
                for (j = 0; j < flight.recordTime.length; j++) {
                    enlData.push([1000 * (flight.recordTime[j] + flight.timeZone.offset), flight.enl[j]]);
                }
            }
            altitudeLabel = altitudeLabel + " (" + prefs.altPrefs.altref + ")";
            baro = new $.plot("#barogram", [{
                label: enlLabel,
                data: enlData,
                yaxis: 2,
                bars: {
                    show: showEnl
                },
                lines: {
                    show: false
                },
                color: '#D0D0FF'
            }, {
                label: altitudeLabel,
                data: barogramData,
                color: plotColour
            }, {
                label: '',
                data: [
                    [startTime, enlThreshold],
                    [finishTime, enlThreshold]
                ],
                color: '#D0D0FF',
                yaxis: 2,
                lines: {
                    show: showEnl
                }
            }], {
                axisLabels: {
                    show: true
                },
                xaxes: [{
                    mode: 'time',
                    timeformat: '%H:%M',
                    axisLabel: 'Time (' + flight.timeZone.zoneName + ')'
                }],
                yaxes: [{
                    axisLabel: yaxisLabel,
                    min: altMin
                }, {
                    position: "right",
                    axisLabel: 'Environmental Noise Level',
                    min: 20,
                    max: 4000,
                    show: showEnl,
                    ticks: [0, 500, 1000]
                }],
                crosshair: {
                    mode: 'xy'
                },
                grid: {
                    clickable: true,
                    autoHighlight: false
                }
            });

            $("#barogram").bind("plotclick", function(event, pos, item) {
                if (item) {
                    var present = require('./presentation');
                    present.showPosition(item.dataIndex);
                    $('#timeSlider').val(item.dataIndex);
                    $('#timeSlider').focus();
                    $('.easyclose').hide();
                }
            });
        },

        replot: function() {
            $('#barogram').text('');
            this.plot();
        },
 
        lockCrosshair: function(pos) {
            baro.lockCrosshair(pos);
        }
    };
})();
