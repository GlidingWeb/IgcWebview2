
(function () {
    //Most of this is still to be written
    //It sets up user display preferences and also handles unit conversion since
    //all internal records and calculations are in metres

    var METRE2FOOT = 3.2808399;
    var KM2MILES = 0.62137119224;

    var altPrefs = {
        altsource: 'P',
        altref: 'QFE'
    };

    var tasksource = 'igc';

    var units = {
        altitude: 'mt',
        climb: 'kt',
        cruise: 'kt',
        task: 'kph',
        distance: 'km'
    };

    function sectorsRealityCheck(newVals) {
        var configerror = "";

        if (!(newVals.startrad > 0)) {
            configerror = "\nStart radius needed";
        }
        if (!(newVals.finrad > 0)) {
            configerror += "\nFinish radius needed";
        }
        if ((newVals.use_barrel === false) && (newVals.use_sector === false)) {
            configerror += "\nSelect circle and/or sector for TPs";
        }
        if ((newVals.use_barrel === true) && (!(newVals.tprad > 0))) {
            configerror += "\nTP circle radius needed";
        }
        if ((newVals.use_sector === true) && (!(newVals.sector_rad > 0))) {
            configerror += "\nTP sector radius needed";
        }
        if (configerror.length > 0) {
            alert(configerror);
            return false;
        } else {
            return true;
        }
    }

    function storePreference(name, value) {
        if (window.localStorage) {
            try {
                localStorage.setItem(name, value);
            } catch (e) {
                console.log("error");
                // If permission is denied, ignore the error.
            }
        }
    }

    function setConverter(unitObj, descriptor, multiplier, precision, abbr) {
        unitObj.descriptor = descriptor;
        unitObj.multiplier = multiplier;
        unitObj.precision = precision;
        unitObj.abbr = abbr;
    }

    module.exports = {
        airclip: 6001,
        tasksource: tasksource,
        distance: 'km',
        sectors: {
            startrad: 5, //start line radius
            finrad: 1, //finish line radius
            tprad: 0.5, //'beer can' radius
            sector_rad: 20, //tp sector radius
            sector_angle: 90, //tp sector
            use_sector: true,
            use_barrel: true,
            finishtype: "line"
        },
        units: units,
        altPrefs: altPrefs,
        metre2foot: METRE2FOOT,

        setSectorDefaults: function () {
            sectors.startrad = 5;
            sectors.finrad = 1;
            sectors.tprad = 0.5;
            sectors.sector_rad = 20;
            sectors.sector_angle = 90;
            sectors.use_sector = true;
            sectors.use_barrel = true;
            sectors.finishtype = "line";
        },

        setSectors: function (newsectors, savevals) {
            if (sectorsRealityCheck(newsectors)) {
                this.sectors = newsectors;
                if (savevals) {
                    storePreference('sectordefs', JSON.stringify(newsectors));
                }
                return true;
            }
            else {
                return false;
            }
        },

        getStoredValues: function () {
            try {
                var storedAltitudeUnit = localStorage.getItem("altitudeUnit");
                if (storedAltitudeUnit) {
                    units.altitude = storedAltitudeUnit;
                    $('#altitudeunits').val(storedAltitudeUnit);
                }
                var storedLengthUnit = localStorage.getItem("lengthUnit");
                if (storedLengthUnit) {
                    units.distance = storedLengthUnit;
                }
                var storedClimbUnit = localStorage.getItem("climbUnit");
                if (storedClimbUnit) {
                    units.climb = storedClimbUnit;
                }
                var storedCruiseUnit = localStorage.getItem("cruiseUnit");
                if (storedCruiseUnit) {
                    units.cruise = storedCruiseUnit;
                }
                var storedTaskUnit = localStorage.getItem("taskUnit");
                if (storedTaskUnit) {
                    units.task = storedTaskUnit;
                }
                var storedAirspaceClip = localStorage.getItem("airspaceClip");
                if (storedAirspaceClip) {
                    this.airclip = storedAirspaceClip;
                }
                var storedSectors = localStorage.getItem("sectordefs");
                if (storedSectors) {
                    this.sectors = JSON.parse(storedSectors);
                }
                var storedAltPrefs = localStorage.getItem("altPrefs");
                if (storedAltPrefs) {
                    this.altPrefs = JSON.parse(storedAltPrefs);
                }
            } catch (e) {
                // If permission is denied, ignore the error.
                console.log("error");
            }
        },

        showDistance: function (distance) {
            var retvalue;
            if (units.distance === 'km') {
                retvalue = distance.toFixed(1) + " Km";
            }
            else {
                var miles = distance * KM2MILES;
                retvalue = miles.toFixed(1) + " miles";
            }
            return retvalue;
        },

        showAltitude: function (pressureAlt, gpsAlt, toPressure, toGps, afElevation) {
            var takeoff;
            var source;
            var multiplier;
            if (this.altPrefs.source === 'P') {
                showalt = pressureAlt;
                takeoff = toPressure;
                source = " (baro) ";
            }
            else {
                showalt = gpsAlt;
                takeoff = toGps;
                source = " (GPS) ";
            }
            switch (this.altPrefs.altref) {
                case 'QFE':
                    showalt -= takeoff;
                    break;
                case 'QNH':
                    showalt = showalt - takeoff + afElevation;
                    break;
            }
            if (units.altitude === 'ft') {
                multiplier = METRE2FOOT;
                descriptor = " feet ";
            }
            else {
                descriptor = " metres ";
                multiplier = 1;
            }
            showalt = Math.round(showalt * multiplier);
            return {
                displaySentence: this.altPrefs.altref + source + showalt + descriptor,
                altPos: showalt
            };
        },

        setAirclip: function (value) {
            this.airclip = value;
            storePreference("airspaceClip", value);
        },

        setAltUnits: function (value) {
            units.altitude = value;
            storePreference("altitudeUnit", value);
        },

        setLengthUnits: function (value) {
            units.distance = value;
            storePreference("lengthUnit", value);
        },

        setClimbUnits: function (value) {
            units.climb = value;
            storePreference("climbUnit", value);
        },

        setCruiseUnits: function (value) {
            units.cruise = value;
            storePreference("cruiseUnit", value);
        },

        setTaskUnits: function (value) {
            units.task = value;
            storePreference("taskUnit", value);
        },

        setTaskSource: function (value) {
            this.tasksource = value;
        },

        setAltPrefs: function (altRef, altSource) {
            this.altPrefs.altref = altRef;
            this.altPrefs.altsource = altSource;
            storePreference("altPrefs", JSON.stringify(this.altPrefs));
        }
    };
})();
