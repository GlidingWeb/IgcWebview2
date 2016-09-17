(function() {
    //Wrapper for the Google Maps api

    var mapObj = {};
    var trackline;
    var gliderMarker;
    var taskfeatures = [];
    var sectorfeatures = [];
    var airspace = {
        polygons: [],
        circles: [],
        polygon_bases: [],
        circle_bases: []
    };
    var engineLines = [];

    function deleteEnl() {
        var i;
        for (i = 0; i < engineLines.length; i++) {
            engineLines[i].setMap(null);
        }
        engineLines = [];
    }


    function getLineBounds(line) {
        var bounds = new google.maps.LatLngBounds();
        line.getPath().forEach(function(latLng) {
            bounds.extend(latLng);
        });
        return bounds;
    }

    function zapAirspace() {
        var i;
        var j;

        for (i = 0; i < airspace.polygons.length; i++) {
            airspace.polygons[i].setMap(null);
            airspace.polygons[i] = null;
        }
        airspace.polygons.length = 0;
        airspace.polygon_bases.length = 0;
        for (j = 0; j < airspace.circles.length; j++) {
            airspace.circles[j].setMap(null);
            airspace.circles[j] = null;
        }
        airspace.circles.length = 0;
        airspace.circle_bases.length = 0;
    }

    function zapSectors() {
        var i;
        for (i = 0; i < sectorfeatures.length; i++) {
            sectorfeatures[i].setMap(null);
        }
        sectorfeatures = [];
    }

    function drawLine(centre, bearing, length) {
        var utils = require('./utilities');
        var brng1 = (bearing + 270) % 360;
        var brng2 = (bearing + 90) % 360;
        var linestart = utils.targetPoint(centre, length, brng1);
        var lineend = utils.targetPoint(centre, length, brng2);
        var targetLine = new google.maps.Polyline({
            path: [linestart, lineend],
            strokeColor: 'black',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        return targetLine;
    }

    function sectorCircle(centre, radius) {
        var tpCircle = new google.maps.Circle({
            strokeColor: 'black',
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: 'green',
            fillOpacity: 0.1,
            center: centre,
            clickable: false,
            radius: radius * 1000
        });
        return tpCircle;
    }

    function drawSector(centre, bearingIn, bearingOut, angle, radius) {
        var j;
        var interval = 5;
        var polydef = [];
        var backbearing = (bearingOut + 180) % 360;
        var utils = require('./utilities');
        var bisector = bearingIn + (backbearing - bearingIn) / 2;
        if (Math.abs(backbearing - bearingIn) > 180) {
            bisector = (bisector + 180) % 360;
        }
        polydef.push(centre);
        var startangle = (bisector - angle / 2 + 360) % 360;
        polydef.push(utils.targetPoint(centre, radius, startangle));
        var endangle = (bisector + angle / 2 + 360) % 360;
        var interpoints = angle / interval - 1;
        var azi = startangle;

        for (j = 1; j < interpoints; j++) {
            azi += interval;
            polydef.push(utils.targetPoint(centre, radius, azi));
        }
        polydef.push(utils.targetPoint(centre, radius, endangle));
        polydef.push(centre);
        var sectorPoly = new google.maps.Polygon({
            paths: polydef,
            strokeColor: 'black',
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: 'green',
            fillOpacity: 0.1,
            clickable: false
        });
        return sectorPoly;
    }

    module.exports = {
        initmap: function() {
            var myStyles = [{
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            }, {
                "featureType": "transit",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            }];

            var mapOpt = {
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                streetViewControl: false,
                styles: myStyles
            };

            mapObj = new google.maps.Map($('#map').get(0), mapOpt);
            gliderMarker = new google.maps.Marker({
                icon: 'Icons/glidericon.png',
                clickable: false,
                optimized: false,
                zIndex: 999
            });

            var pinicon = {
                url: 'Icons/pin.png',
                anchor: new google.maps.Point(4, 48)
            };

            pin = new google.maps.Marker({
                icon: pinicon,
                clickable: false
            });
        },

        setBounds: function(bounds) {
            mapObj.fitBounds(bounds);
        },

        addTrack: function(track) {
            if (trackline) {
                trackline.setMap(null);
            }
            trackline = new google.maps.Polyline({
                path: track,
                strokeColor: 'blue',
                strokeOpacity: 1.0,
                clickable: false,
                strokeWeight: 4
            });
            trackline.setMap(mapObj);
            gliderMarker.setPosition(track[0]);
            gliderMarker.setMap(mapObj);
            pin.setMap(null);
        },

        showAirspace: function() {
            var i;
            var j;
            var clipalt = require('./preferences').airclip;
            for (i = 0; i < airspace.polygons.length; i++) {
                if (airspace.polygon_bases[i] < clipalt) {
                    airspace.polygons[i].setMap(mapObj);
                }
                else {
                    airspace.polygons[i].setMap(null);
                }
            }
            for (j = 0; j < airspace.circles.length; j++) {
                if (airspace.circle_bases[j] < clipalt) {
                    airspace.circles[j].setMap(mapObj);
                }
                else {
                    airspace.circles[j].setMap(null);
                }
            }
        },

        setAirspace: function(airdata) {
            var i;
            var j;
            zapAirspace();
            var airDrawOptions = {
                strokeColor: 'black',
                strokeOpacity: 0.8,
                strokeWeight: 1,
                fillColor: '#FF0000',
                fillOpacity: 0.2,
                clickable: false
            };
            for (i = 0; i < airdata.polygons.length; i++) {
                airspace.polygons[i] = new google.maps.Polygon(airDrawOptions);
                airspace.polygons[i].setPaths(airdata.polygons[i].coords);
                airspace.polygon_bases[i] = airdata.polygons[i].base;
            }
            for (j = 0; j < airdata.circles.length; j++) {
                airspace.circles[j] = new google.maps.Circle(airDrawOptions);
                airspace.circles[j].setRadius(1000 * airdata.circles[j].radius);
                airspace.circles[j].setCenter(airdata.circles[j].centre);
                airspace.circle_bases[j] = airdata.circles[j].base;
            }
        },

        addSectors: function() {
            var i;
            var circle;
            var line;
            var sector;
            zapSectors();
            var task = require('./task');
            if (task.names.length > 0) {
                var prefs = require('./preferences').sectors;
                line = drawLine(task.coords[0], task.bearing[1], prefs.startrad);
                sectorfeatures.push(line);
                for (i = 1; i < task.names.length - 1; i++) {
                    if (prefs.use_barrel) {
                        circle = sectorCircle(task.coords[i], prefs.tprad);
                        sectorfeatures.push(circle);
                    }
                    if (prefs.use_sector) {
                        sector = drawSector(task.coords[i], task.bearing[i], task.bearing[i + 1], prefs.sector_angle, prefs.sector_rad);
                        sectorfeatures.push(sector);
                    }
                }
                if (prefs.finishtype === 'line') {
                    finish = drawLine(task.coords[task.names.length - 1], task.bearing[task.names.length - 1], prefs.finrad);
                }
                else {
                    finish = sectorCircle(task.coords[task.names.length - 1], prefs.finrad);
                }
                sectorfeatures.push(finish);
                for (i = 0; i < sectorfeatures.length; i++) {
                    sectorfeatures[i].setMap(mapObj);
                }
            }
        },

        zapTask: function() {
            var i;
            zapSectors();
            for (i = 0; i < taskfeatures.length; i++) {
                taskfeatures[i].setMap(null);
            }
            taskfeatures = [];
        },

        showEngineRuns: function(runList) {
            var i;
            var lineOpt = {
                strokeColor: 'yellow',
                strokeOpacity: 1.0,
                clickable: false,
                zIndex: google.maps.Marker.MAX_ZINDEX + 1,
                strokeWeight: 4
            };
            deleteEnl();
            for (i = 0; i < runList.length; i++) {
                engineLines[i] = new google.maps.Polyline(lineOpt);
                engineLines[i].setPath(runList[i]);
                engineLines[i].setMap(mapObj);
            }
        },

        addTask: function(tplist, zoomto) {
            var j;
            this.zapTask();
            var route = new google.maps.Polyline({
                path: tplist.coords,
                strokeColor: 'dimgray',
                strokeOpacity: 1.0,
                strokeWeight: 3
            });
            if (zoomto) {
                var taskbounds = getLineBounds(route);
                mapObj.fitBounds(taskbounds);
            }
            route.setMap(mapObj);
            taskfeatures.push(route);
            for (j = 0; j < tplist.names.length - 1; j++) {
                var taskmarker = new google.maps.Marker({
                    position: tplist.coords[j],
                    map: mapObj,
                    label: j + '',
                    title: tplist.names[j],
                    clickable: false,
                    zIndex: 50
                });
                taskfeatures.push(taskmarker);
            }
            this.addSectors(tplist);
        },

        showTP: function(tpoint) {
            mapObj.panTo(tpoint);
            mapObj.setZoom(13);
        },

        pushPin: function(coords) {
            pin.setPosition(coords);
            pin.setMap(mapObj);
        },

        setTimeMarker: function(position) {
            gliderMarker.setPosition(position);
            var gliderpos = new google.maps.LatLng(position);
            if (!(mapObj.getBounds().contains(gliderpos))) {
                mapObj.panTo(gliderpos);
            }
        }
    };
})();
