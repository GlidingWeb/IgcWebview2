(function() {
    //This module sets up user display preferences and also handles unit conversion since
    //all internal records and calculations are in metres

    var METRE2FOOT = 3.2808399;
    var KM2MILES = 0.62137119224;
    var MPS2KNOT = 1.9426025694;
    var MPS2FPM = 196.8503937;
    var KM2NM = 0.53961;
    var sectors = {
        startrad: 5, //start line radius
        finrad: 1, //finish line radius
        tprad: 0.5, //'beer can' radius
        sector_rad: 20, //tp sector radius
        sector_angle: 90, //tp sector
        use_sector: true,
        use_barrel: true,
        finishtype: "line"
    };

    var altPrefs = {
        altsource: 'P',
        altref: 'QFE'
    };

    var enlPrefs = {
        detect: 'Off',
        threshold: 500,
        duration: 12
    };

    var enlDefaults = {
        detect: 'Off',
        threshold: 500,
        duration: 12
    };

    var tasksource = 'igc';

    var units = {
        altitude: 'mt',
        climb: 'kt',
        cruise: 'kt',
        task: 'kph',
        distance: 'km'
    };

    function enlRealityCheck(enl) {
        var configerror = "";
        if (enl.detect === 'On') {
            if ((enl.threshold < 1) || (enl.threshold > 999)) {
                configerror += "\nIllegal threshold value";
            }
            if ((enl.duration < 2) || (enl.duration > 100)) {
                configerror += "\nUnrealistic time value";
            }
        }
        if (configerror.length > 0) {
            alert(configerror);
            return false;
        }
        else {
            return true;
        }
    }

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
        }
        else {
            return true;
        }
    }

    function storePreference(name, value) {
        if (window.localStorage) {
            try {
                localStorage.setItem(name, value);
            }
            catch (e) {
                console.log("error");
                // If permission is denied, ignore the error.
            }
        }
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
        sectorDefaults: {
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
        enlPrefs: enlPrefs,
        enlDefaults: enlDefaults,
        altPrefs: altPrefs,
        metre2foot: METRE2FOOT,

        setSectorDefaults: function() {
            sectors.startrad = 5;
            sectors.finrad = 1;
            sectors.tprad = 0.5;
            sectors.sector_rad = 20;
            sectors.sector_angle = 90;
            sectors.use_sector = true;
            sectors.use_barrel = true;
            sectors.finishtype = "line";
        },

        setSectors: function(newsectors, savevals) {
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

        setEnl: function(newenl, savevals) {
            if (enlRealityCheck(newenl)) {
                this.enlPrefs = newenl;
                if (savevals) {
                    storePreference('enlprefs', JSON.stringify(newenl));
                }
                return true;
            }
            else {
                return false;
            }
        },

        getStoredValues: function() {
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
                var storedEnlPrefs = localStorage.getItem("enlprefs");
                if (storedEnlPrefs) {
                    this.enlPrefs = JSON.parse(storedEnlPrefs);
                }
                var storedAltPrefs = localStorage.getItem("altPrefs");
                if (storedAltPrefs) {
                    this.altPrefs = JSON.parse(storedAltPrefs);
                }
            }
            catch (e) {
                // If permission is denied, ignore the error.
                console.log("error");
            }
        },

        showCruise: function(speed) {
            var retval;
            switch (units.cruise) {
                case 'kph':
                    retval = Math.round(speed) + "\u00A0km/hr";
                    break;
                case 'kt':
                    retval = Math.round(KM2NM * speed) + "\u00A0kt";
                    break;
                case 'mph':
                    retval = Math.round(KM2MILES * speed) + "\u00A0miles/hr";
                    break;
            }
            return retval;
        },

        showDistance: function(distance) {
            var retvalue;
            if (units.distance === 'km') {
                retvalue = distance.toFixed(1) + "\u00A0Km";
            }
            else {
                var miles = distance * KM2MILES;
                retvalue = miles.toFixed(1) + "\u00A0miles";
            }
            return retvalue;
        },

        showTaskSpeed: function(speed) { //takes speed in km/hr, converts if needed 
            var descriptor;
            if (units.task === 'mph') {
                speed *= KM2MILES;
                descriptor = "\u00A0miles/hr";
            }
            else {
                descriptor = "\u00A0km/hr";
            }
            return speed.toFixed(2) + descriptor;
        },

        showClimb: function(climbRate) {
            var retval;
            switch (units.climb) {
                case 'kt':
                    climbRate *= MPS2KNOT;
                    retval = climbRate.toFixed(1) + "\u00A0knots";
                    break;
                case 'mps':
                    retval = climbRate.toFixed(1) + '\u00A0m/s';
                    break;
                case 'fpm':
                    climbRate *= MPS2FPM;
                    retval = Math.round(climbRate) + "\u00A0ft/min";
            }
            if (climbRate > 0) {
                retval = "+" + retval;
            }
            return retval;
        },

        displayAlt: function(metres) {
            var retval;
            var descriptor;
            if (units.altitude == 'ft') {
                retval = Math.round(METRE2FOOT * metres);
                descriptor = "\u00A0feet";
            }
            else {
                retval = Math.round(metres);
                descriptor = "\u00A0metres";
            }
            return {
                showval: retval,
                descriptor: descriptor
            };
        },

        showAltitude: function(pressureAlt, gpsAlt, toPressure, toGps, afElevation) {
            var takeoff;
            var source;
            var metreval;
            if (this.altPrefs.altsource === 'P') {
                metreval = pressureAlt;
                takeoff = toPressure;
                source = "&nbsp;(baro)&nbsp;";
            }
            else {
                metreval = gpsAlt;
                takeoff = toGps;
                source = "&nbsp;(GPS)&nbsp;";
            }
            switch (this.altPrefs.altref) {
                case 'QFE':
                    metreval -= takeoff;
                    break;
                case 'QNH':
                    metreval = metreval - takeoff + afElevation;
                    break;
            }
            var showalt = this.displayAlt(metreval);
            return {
                displaySentence: this.altPrefs.altref + source + showalt.showval + showalt.descriptor,
                altPos: showalt.showval,
                descriptor: showalt.descriptor
            };
        },

        setAirclip: function(value) {
            this.airclip = value;
            storePreference("airspaceClip", value);
        },

        setAltUnits: function(value) {
            units.altitude = value;
            storePreference("altitudeUnit", value);
        },

        setLengthUnits: function(value) {
            units.distance = value;
            storePreference("lengthUnit", value);
        },

        setClimbUnits: function(value) {
            units.climb = value;
            storePreference("climbUnit", value);
        },

        setCruiseUnits: function(value) {
            units.cruise = value;
            storePreference("cruiseUnit", value);
        },

        setTaskUnits: function(value) {
            units.task = value;
            storePreference("taskUnit", value);
        },

        setTaskSource: function(value) {
            this.tasksource = value;
        },

        setAltPrefs: function(altRef, altSource) {
            this.altPrefs.altref = altRef;
            this.altPrefs.altsource = altSource;
            storePreference("altPrefs", JSON.stringify(this.altPrefs));
        }
    };
})();
