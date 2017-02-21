//given the igc data and task returns speed, distance flown
//Also calculates data on individual thermals
(function() {
    var flight = require('./igc');
    var task = require('./task');
    var prefs = require('./preferences');
    var utils = require('./utilities');

    function getSectorLimits(task, sectordefs) {
        var i;
        var heading;
        var bearingOut;
        var bisector;
        var sectorLimits = [];

        for (i = 1; i < (task.coords.length + 1); i++) {
            var limits = {};
            switch (i) {
                case 1: //start zone
                    heading = task.bearing[1];
                    limits.max = heading - 90;
                    limits.min = heading + 90;
                    break;
                case task.coords.length: //finish line
                    heading = task.bearing[task.coords.length - 1];
                    limits.max = heading - 90;
                    limits.min = heading + 90;
                    break;
                default:
                    if (sectordefs.use_sector) {
                        bearingOut = (task.bearing[i] + 180) % 360;
                        bisector = task.bearing[i - 1] + (bearingOut - task.bearing[i - 1]) / 2;
                        if (Math.abs(bearingOut - task.bearing[i - 1]) < 180) {
                            bisector = (bisector + 180) % 360;
                        }
                        limits.max = bisector + sectordefs.sector_angle / 2;
                        limits.min = bisector - sectordefs.sector_angle / 2;
                    }
            }
            limits.max = (limits.max + 360) % 360;
            limits.min = (limits.min + 360) % 360;
            sectorLimits.push(limits);
        }
        return sectorLimits;
    }

    function checkSector(target, comparison) {
        var min = comparison.min;
        var max = comparison.max;
        if (min > max) {
            max += 360;
            if (target < comparison.max) {
                target += 360;
            }
        }
        return ((target > min) && (target < max));
    }

    function assessSection(startIndex, endIndex, sectorLimits) {
        var i = startIndex;
        var curLeg = -1;
        var startstatus;
        var startIndexLatest;
        var distanceToNext;
        var nextstatus;
        var turned;
        var bestSoFar = 0;
        var bestIndex;
        var bestLeg;
        var currentDistance;
        var tpindices = [];

        do {
            if (curLeg < 2) { //not reached first TP
                startstatus = utils.toPoint(task.coords[0], flight.latLong[i]); //check if in start zone
                if ((checkSector(startstatus.bearing, sectorLimits[0])) && (startstatus.distance < prefs.sectors.startrad)) {
                    curLeg = 0; // we are  in the start zone
                    startIndexLatest = i;
                    distanceToNext = 0;
                }
                else {
                    if (curLeg === 0) { //if we were in the start zone and now aren't
                        curLeg = 1; //we're now on the first leg
                        startIndexLatest = i; //and this is our latest recorded start
                        distanceToNext = task.legsize[1];
                    }
                }
            }
            if ((curLeg > 0) && (curLeg < task.coords.length)) { // if started
                nextstatus = utils.toPoint(flight.latLong[i], task.coords[curLeg]); //distance and bearing to  next turning point- iterative so use haversine
                turned = false;
                if (curLeg === task.coords.length - 1) { // If we are on the final leg
                    if (nextstatus.distance < prefs.sectors.finrad) {
                        if (prefs.sectors.finishtype === "circle") {
                            turned = true;
                        }
                        else {
                            if (checkSector(nextstatus.bearing, sectorLimits[curLeg])) {
                                turned = true;
                            }
                        }
                    }
                }
                else {
                    if ((prefs.sectors.use_barrel) && (nextstatus.distance < prefs.sectors.tprad)) {
                        turned = true;
                    }
                    if (prefs.sectors.use_sector) {
                        if ((checkSector(nextstatus.bearing, sectorLimits[curLeg])) && (nextstatus.distance < prefs.sectors.sector_rad)) {
                            turned = true;
                        }
                    }
                }
                if (turned) {
                    bestSoFar = distanceToNext;
                    bestIndex = i;
                    tpindices[curLeg] = i;
                    curLeg++;
                    distanceToNext += task.legsize[curLeg];
                }
                else {
                    currentDistance = distanceToNext - nextstatus.distance;
                    if (currentDistance > bestSoFar) {
                        bestSoFar = currentDistance;
                        tpindices[0] = startIndexLatest;
                        bestIndex = i;
                        bestLeg = curLeg;
                    }
                }
            }
            i++;
        }
        while (i < endIndex);
        if (bestSoFar === 0) { //allow for crossing start line then going backwards
            curLeg = 0;
        }
        if ((bestLeg === curLeg) && (curLeg < task.coords.length)) { //ignore this if the best distance was at the last TP, don't bother if finished
            bestSoFar = distanceToNext - utils.getTrackData(flight.latLong[bestIndex], task.coords[curLeg]).distance; //recalculate using ellipsoid model
        }
        if(bestLeg > curLeg) {
            curLeg=bestLeg;
        }
        return {
            npoints: curLeg,
            turnIndices: tpindices,
            scoreDistance: bestSoFar,
            bestPoint: bestIndex
        };
    }

    module.exports = {
        assessTask: function() {
            var assessment;
            var tempAssess;
            var bestLength = 0;
            var i;
            var sectorLimits = getSectorLimits(task, prefs.sectors);
            if ((prefs.enlPrefs.detect === 'Off') || (flight.engineRunList.length === 0)) {
                assessment = assessSection(flight.getTakeOffIndex(), flight.getLandingIndex(), sectorLimits);
            }
            else {
                for (i = 0; i < flight.glidingRuns.start.length; i++) {
                    tempAssess = assessSection(flight.glidingRuns.start[i], flight.glidingRuns.end[i], sectorLimits);
                    if (tempAssess.scoreDistance > bestLength) {
                        bestLength = tempAssess.scoreDistance;
                        assessment = tempAssess;
                    }
                }
            }
            return assessment;
        },

        getThermalCount: function(startIndex, endIndex) {
            var i = startIndex;
            var thermalData;
            var circleTime = 0;
            var thermalClimb = 0;
            var thermalCount = 0;
            var thisClimbTime;
            var windInfo;

            do {
                do {
                    i++;
                }
                while ((Math.abs(flight.turnRate[i]) < 6) && (i < endIndex));
                if (i < endIndex) {
                    thermalData = flight.getThermalInfo(i);
                    thisClimbTime = flight.recordTime[thermalData.exitIndex] - flight.recordTime[thermalData.entryIndex];
                    if (thisClimbTime > 30) {
                        circleTime += thisClimbTime;
                        if (flight.takeOff.pressure === null) {
                            thermalClimb += (flight.gpsAltitude[thermalData.exitIndex] - flight.gpsAltitude[thermalData.entryIndex]);
                        }
                        else {
                            thermalClimb += (flight.pressureAltitude[thermalData.exitIndex] - flight.pressureAltitude[thermalData.entryIndex]);
                        }
                        thermalCount++;
                    }
                    i = thermalData.exitIndex;
                }
            }
            while (i < endIndex);
            windInfo = this.getWindInfo(startIndex, endIndex);
            return {
                circleTime: circleTime,
                heightGain: thermalClimb,
                windSpeed: windInfo.speed,
                windDirection: windInfo.direction
            };
        },

        getWindInfo: function(thermalStart, thermalEnd) {

            function getVectors(index) { //Private function.  Gets x and y vectors to next fix point
                //Use Pythagoras, as distances are small, and we're doing lots of calculations
                var EARTHRAD = utils.getEarthSize();
                var x = (flight.latLong[index + 1].lng - flight.latLong[index].lng) * Math.cos(Math.PI * (flight.latLong[index + 1].lat + flight.latLong[index].lat) / 360);
                var y = (flight.latLong[index + 1].lat - flight.latLong[index].lat);
                var vectorY = 1000 * y * Math.PI * EARTHRAD / 180 / (flight.recordTime[index + 1] - flight.recordTime[index]);
                var vectorX = 1000 * x * Math.PI * EARTHRAD / 180 / (flight.recordTime[index + 1] - flight.recordTime[index]);
                return {
                    xVector: vectorX,
                    yVector: vectorY
                };
            }
            var xVectors = [];
            var yVectors = [];
            var cuSumX = 0;
            var cuSumY = 0;
            var vectors;
            var xMean;
            var yMean;
            var i = thermalStart;
            do {
                if (Math.abs(flight.turnRate[i]) > 6) {
                    vectors = getVectors(i);
                    xVectors.push(vectors.xVector);
                    cuSumX += vectors.xVector;
                    yVectors.push(vectors.yVector);
                    cuSumY += vectors.yVector;
                }
                i++;
            }
            while (i < thermalEnd);
            xMean = cuSumX / xVectors.length;
            yMean = cuSumY / yVectors.length;
            // We now have an array of vectors for all fix points in the thermal
            //If we assume constant airspeed and constant wind speed these should plot into a circle.
            //The vector from the origin to the circle centre represents wind speed and direction
            //So we now perform a regression analysis to find it
            var circleData = utils.kasaRegress(xVectors, yVectors, xMean, yMean);
            return {
                speed: 3.6 * circleData.magnitude,
                direction: circleData.direction
            };
        }
    };
}());
