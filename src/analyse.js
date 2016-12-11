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

    function assessTrad(startIndex, endIndex, sectorLimits) {
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
        var tpindices = [];
        var currentDistance;

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
        return {
            npoints: curLeg,
            turnIndices: tpindices,
            scoreDistance: bestSoFar,
            bestPoint: bestIndex,
        };
    }

    function checkAatSector(index, sector) {
        var limits = {};
        var heading;
        var sectorStatus;
        var retval;
        sectorStatus = utils.toPoint(task.coords[sector], flight.latLong[index]);
        switch (sector) {
            case 0:
                heading = task.bearing[1];
                limits.max = (heading + 270) % 360;
                limits.min = (heading + 90) % 360;
                //sectorStatus = utils.toPoint(task.coords[0], flight.latLong[index]);
                retval = (checkSector(sectorStatus.bearing, limits)) && (sectorStatus.distance < prefs.sectors.startrad);
                break;
            case task.coords.length - 1:
                if (prefs.sectors.finishtype === 'circle') {
                    //retval=(utils.toPoint(task.coords[sector],flight.latLong[index]).distance  < prefs.sectors.finrad);  
                    retval = (sectorStatus.distance < prefs.sectors.finrad);
                }
                else {
                    heading = task.bearing[sector];
                    limits.min = (heading + 270) % 360;
                    limits.max = (heading + 90) % 360;
                    retval = (checkSector(sectorStatus.bearing, limits)) && (sectorStatus.distance < prefs.sectors.finrad);
                }
                break;
            default:
                retval = (sectorStatus.distance < task.aatradii[sector - 1]);
        }
        return retval;
    }

    function getAatDistance(startIndex, endPoint, endRadius, timeOut, endIndex) {
        var startPoint = flight.latLong[startIndex];
        var maxDistance = 0;
        var maxIndex = startIndex;
        var currentDistance;
        var i = startIndex;
        var nextPointDistance;
        var status = 'landout';
        var intersector = {
            lat: 0,
            lng: 0
        };
        var goalDistance;
        if (endRadius === 0) {
            goalDistance = utils.toPoint(startPoint, endPoint).distance;
        }
        do {
            nextPointDistance = utils.toPoint(flight.latLong[i], endPoint).distance;
            if (endRadius === 0) {
                currentDistance = goalDistance - nextPointDistance;
            }
            else {
                intersector.lat = endRadius * (flight.latLong[i].lat - endPoint.lat) / nextPointDistance + endPoint.lat;
                intersector.lng = endRadius * (flight.latLong[i].lng - endPoint.lng) / nextPointDistance + endPoint.lng;
                currentDistance = utils.toPoint(startPoint, intersector).distance - nextPointDistance + endRadius;
            }
            if (Number(currentDistance) > Number(maxDistance)) {
                maxDistance = currentDistance;
                maxIndex = i;
            }
            if (flight.recordTime[i] >= timeOut) {
                status = 'timeout';
            }
            i++;
        }
        while ((i < endIndex) && (status !== 'timeout'));
        //recalculate Vincenty
        nextPointDistance = utils.getTrackData(flight.latLong[maxIndex], endPoint).distance;
        intersector.lat = endRadius * (flight.latLong[maxIndex].lat - endPoint.lat) / nextPointDistance + endPoint.lat;
        intersector.lng = endRadius * (flight.latLong[maxIndex].lng - endPoint.lng) / nextPointDistance + endPoint.lng;
        maxDistance = utils.getTrackData(startPoint, intersector).distance - nextPointDistance + endRadius;
        return {
            distance: maxDistance,
            status: status,
            bestIndex: maxIndex
        };
    }

    function assessAat(startIndex, endIndex, sectorLimits) {
        var i = startIndex;
        var j;
        var maxSector = -1;
        var prevSector = -1;
        var curSector;
        var startStatus = false;
        var checkLast;
        var bestLocation = [];
        var legBest = [];
        var currentDistance;
        var bestIndex = [];
        var finishStatus = false;
        var distance = 0;
        var bestPoint;
        var timeOutValue;
        var nonFinish;
        var status = null;
        var endrad;

        for (j = 0; j < task.coords.length; j++) {
            legBest[j] = 0;
        }
        do {
            if (checkAatSector(i, 0)) {
                curSector = 0;
            }
            else {
                (curSector = -1);
            }
            if ((prevSector === 0) && (curSector === -1)) {
                startStatus = true;
            }
            prevSector = curSector;
            i++;
        }
        while ((i < endIndex) && startStatus === false);
        bestIndex[0] = i - 1;
        maxSector = 0;
        bestLocation[0] = task.coords[0];
        do {
            checkLast = checkAatSector(i, maxSector);
            if (checkLast) {
                curSector = maxSector;
            }
            else {
                if (checkAatSector(i, maxSector + 1)) {
                    maxSector++;
                    curSector = maxSector;
                }
                else {
                    curSector = -1;
                }
            }
            if ((prevSector === 0) && (curSector === -1)) { // this is a restart
                bestIndex[0] = i;
            }
            if (curSector === task.coords.length - 1) { //finished
                finishStatus = true;
                bestIndex[task.coords.length - 1] = i;
                bestLocation[task.coords.length - 1] = task.coords[task.coords.length - 1];
                bestPoint = i;
            }
            else {
                if (curSector > 0) {
                    currentDistance = utils.toPoint(flight.latLong[i], bestLocation[curSector - 1]).distance + utils.toPoint(flight.latLong[i], task.coords[curSector + 1]).distance;
                    if (currentDistance > legBest[curSector]) {
                        legBest[curSector] = currentDistance;
                        bestIndex[curSector] = i;
                        bestLocation[curSector] = flight.latLong[i];
                    }
                }
            }
            prevSector = curSector;
            i++;
        }
        while ((i < endIndex) && (finishStatus === false));
        if (finishStatus) {
            for (j = 0; j < maxSector; j++) {
                distance += utils.getTrackData(bestLocation[j], bestLocation[j + 1]).distance;
            }
            if (prefs.sectors.finishtype === 'circle') {
                distance -= prefs.sectors.finrad;
            }
            status = 'finished';
        }
        else {
            timeOutValue = flight.recordTime[bestIndex[0]] + 60 * task.aatMins;
            j = 0;
            while ((j < maxSector) && (flight.recordTime[bestIndex[j]] < timeOutValue)) {
                distance += utils.getTrackData(bestLocation[j], bestLocation[j + 1]).distance;
                j++;
            }
            if (j === (task.coords.length - 2)) { //we are looking at the final leg
                if (prefs.sectors.finishtype === 'line') {
                    endrad = 0;
                }
                else {
                    endrad = prefs.sectors.finrad;
                }
            }
            else {
                endrad = task.aatradii[j];
            }
            nonFinish = getAatDistance(bestIndex[j], task.coords[j + 1], endrad, timeOutValue, endIndex);
            status = nonFinish.status;
            distance = parseFloat(distance) + parseFloat(nonFinish.distance);
            bestPoint = nonFinish.bestIndex;
        }
        return {
            status: status,
            turnIndices: bestIndex,
            scoreDistance: distance,
            bestPoint: bestPoint,
            npoints: bestIndex.length
        };
    }

    function assessSection(startIndex, endIndex, sectorLimits) {
        if (task.tasktype === 'trad') {
            return assessTrad(startIndex, endIndex, sectorLimits);
        }
        else {
            return assessAat(startIndex, endIndex, sectorLimits);
        }
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
