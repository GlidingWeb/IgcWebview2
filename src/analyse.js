//given the igc data and task returns speed, distance flown
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
                    limits.max = heading + 90;
                    limits.min = heading - 90;
                    break;
                default:
                    if (sectordefs.use_sector) {
                        bearingOut = (task.bearing[i] + 180) % 360;
                        bisector = task.bearing[i - 1] + (bearingOut - task.bearing[i - 1]) / 2;
                        if (Math.abs(bearingOut - task.bearing[i]) > 180) {
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
        tpindices = [];
        do {
            if (curLeg < 2) { //not reached first TP
                startstatus = utils.toPoint(task.coords[0], flight.latLong[i]); //check if in start zone
                if ((checkSector(startstatus.bearing, sectorLimits[0])) && (startstatus.distance < prefs.sectors.startrad)) {
                    curLeg = 0; // we are  in the start zone
                    startIndexLatest = i;
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
                nextstatus = utils.toPoint(task.coords[curLeg], flight.latLong[i]); //distance to next turning point
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
                    }
                }
            }
            i++;
        }
        while (i < endIndex);
        if (bestSoFar === 0) { //allow for crossing start line then going backwards
            curLeg = 0;
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
        }
    }
}())
