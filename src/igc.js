//This module parses the IGC file
//It also contains some calculated data that is directly a function of the file content

var  unixStart=[];
 var headers= [];
var latLong =[];
var pressureAltitude=[];
var gpsAltitude= [];
var recordTime= [];
var fixQuality= [];
var enl= [];
var hasPressure;
var taskpoints={
    names: [],
    coords: []
   };
var bounds= {};
var timeZone= {
    zoneAbbr: 'UTC',
    offset: 0,
    zoneName: 'UTC'
};
var baseElevation={
    valid: false,
    value: 0
};
 
function clearFlight() {
headers.length=0;
latLong.length=0;
pressureAltitude.length=0;
gpsAltitude.length=0;
recordTime.length=0;
fixQuality.length=0;
enl.length=0;
taskpoints.names.length=0;
taskpoints.coords.length=0;
hasPressure=0;
unixStart.length=0;
bounds.south=90;
bounds.west=180;
bounds.north=-90;
bounds.east=-180;
timeZone.zoneAbbr='UTC';
timeZone.offset=0;
timeZone.zoneName='UTC';
baseElevation.valid=false;
}
     
module.exports={
    
initialise: function(infile){
    
  function getTaskPoints(declaration) {
    if (declaration.length > 4) {
      var i;
      var taskdata = {
        coords: [],
        names: []
      };
      for (i = 1; i <declaration.length - 1; i++) {
      if((declaration[i].substring(1,8) + declaration[i].substring(9,17)) !== '000000000000000') {   //Allow for loggers with empty C records (eg. EW)
       taskpoints.coords.push(utils.parseLatLong(declaration [i].substring(1,18)));
      taskpoints.names.push(declaration[i].substring(18));
      }
  }
  }
  }
  
function parsePosition(positionInfo,startTime) {
         var positionTime=utils.getUnixTime(positionInfo[1]);   //Simple conversion from hhmmss. Return seconds offset from UTC midnight- all we need.
         if(positionTime < startTime) {    //allow for flight straddling UTC midnight
             positionTime+=86400;
         }
         var position=utils.parseLatLong(positionInfo[2]);       //conversion to latLong format done in utilites module, as the same code is used elsewhere
        if((position.lat !==0) && (position.lng !==0)) {
             return {
                recordTime: positionTime,
                latLong:  position,
                quality: positionInfo[3],
                pressureAltitude: parseInt(positionInfo[4], 10),
                gpsAltitude: parseInt(positionInfo[5], 10)
            };
        }
        }
    
function getReadEnl(iRecord) {
        var charpt=iRecord.search("ENL");
        if(charpt > 6) {
     var pos=iRecord.substring(charpt-4,charpt);
       return {
            start: parseInt(pos.substring(0,2))-1,
            end: parseInt(pos.substring(2,4))
        };
        }
        else {
            return null;
    }
    }  
    
function parseHeader(headerRecord) {
        var headerSubtypes = {
            'PLT': 'Pilot',
            'CM2': 'Crew member 2',
            'GTY': 'Glider type',
            'GID': 'Glider ID',
            'DTM': 'GPS Datum',
            'RFW': 'Firmware version',
            'RHW': 'Hardware version',
            'FTY': 'Flight recorder type',
            'GPS': 'GPS',
            'PRS': 'Pressure sensor',
            'FRS': 'Security suspect, use validation program',
            'CID': 'Competition ID',
            'CCL': 'Competition class'
        };

        var headerName = headerSubtypes[headerRecord.substring(2, 5)];
        if (headerName !== undefined) {
            var colonIndex = headerRecord.indexOf(':');
            if (colonIndex !== -1) {
                var headerValue = headerRecord.substring(colonIndex + 1);
                if (headerValue.length > 0 && /([^\s]+)/.test(headerValue)) {
                    return {
                        name: headerName,
                        value: headerValue
                    };
                }
            }
        }
    }
    
    function parseManufacturer(aRecord) {
        var manufacturers = {
             'ACT': 'Aircotec',
             'CAM': 'Cambridge Aero Instruments',
             'CNI': 'Clearnav Instruments',
             'DSX': 'Data Swan',
             'EWA': 'EW Avionics',
             'FIL': 'Filser',
             'FLA': 'FLARM',
             'FLY': 'Flytech',
             'GCS': 'Garrecht',
             'IMI':  'IMI Gliding Equipment',
             'LGS': 'Logstream',
             'LXN': 'LX Navigation',
              'LXV': 'LXNAV d.o.o.',
             'NAV': 'Naviter',
              'NKL': 'Nielsen Kellerman',
              'NTE': 'New Technologies s.r.l.',
              'PES': 'Peschges',
              'PFE': 'PressFinish Technologies',
              'PRT': 'Print Technik',           
              'SCH': 'Scheffel',
            'SDI': 'Streamline Data Instruments',
            'TRI': 'Triadis Engineering GmbH',
            'WES': 'Westerboer',
            'XCS': 'XCSoar',
            'ZAN': 'Zander'
        };
        var manufacturerInfo = {
            manufacturer: 'Unknown',
            serial: aRecord.substring(4, 7)
        };
        var manufacturerCode = aRecord.substring(1, 4);
        if (manufacturers[manufacturerCode]) {
            manufacturerInfo.manufacturer = manufacturers[manufacturerCode];
        }
        return manufacturerInfo;
    }
    //start actual parse
var utils=require("./utilities.js");
        var lineIndex;
      var positionData;
      var recordType;
       var currentLine;
      var headerData;
       var readEnl=null; 
       var positionMatch;
       var cRecords=[];
       var firstFix=0;
       var taskMatch;
      var positionRegex = /^B([\d]{6})([\d]{7}[NS][\d]{8}[EW])([AV])([-\d][\d]{4})([-\d][\d]{4})/; 
      var taskRegex = /^C([\d]{7})[NS]([\d]{8})[EW].*/;
      clearFlight();
      var igcLines=infile.split("\n");
            //file validity check to go  here
      var manufacturerInfo = parseManufacturer(igcLines[0]);
         headers.push({
             name: 'Logger manufacturer',
              value: manufacturerInfo.manufacturer
                 });
          headers.push({
            name: 'Logger serial number',
           value: manufacturerInfo.serial
          });
        var dateRecord = igcLines[1].substring(5);
        for(lineIndex=2 ;lineIndex < igcLines.length; lineIndex++) {
         currentLine = igcLines[lineIndex];
        recordType = currentLine.charAt(0);
          switch (recordType) {
            case 'H': // Header information
                headerData = parseHeader(currentLine);
                if (headerData) {
                    headers.push(headerData);
                }
                break;
                   case 'I':  //Fix extensions
                 readEnl= getReadEnl(currentLine);
                  break;
            case 'C': 
               if(taskRegex.test(currentLine))  {       //will parse later
                      cRecords.push(currentLine.trim());
                    }
                break;
                    case 'B': // Position fix
               positionMatch=currentLine.match(positionRegex);
                positionData = parsePosition(positionMatch,firstFix);
                if (positionData) {
                    recordTime.push(positionData.recordTime);
                    latLong.push(positionData.latLong);
                    pressureAltitude.push(positionData.pressureAltitude);
                    gpsAltitude.push(positionData.gpsAltitude);
                   
                    fixQuality.push(positionData.quality);
                    if(readEnl !==null) {
                          noiseLevel=parseInt(currentLine.substring(readEnl.start,readEnl.end));
                          }
                      else {
                            noiseLevel=0;
                         }
                    enl.push(noiseLevel);
                    if(positionData.pressureAltitude > 0) {       //determine whether pressure altitude is available
                        hasPressure=true;
                    }
               if(recordTime.length===0) {
                  firstFix=positionData.recordTime;             
               }
              if(positionData.latLong.lat > bounds.north) {                            //This will mean that the track bounds are returned with the file.
                  bounds.north=positionData.latLong.lat;                                //Gives a faster display than using the maps api after plotting the track
              }
               if(positionData.latLong.lat < bounds.south) {
                  bounds.south=positionData.latLong.lat;
             }
             if(positionData.latLong.lng > bounds.east) {
                bounds.east=positionData.latLong.lng;
            }
             if(positionData.latLong.lng < bounds.west) {
                bounds.west=positionData.latLong.lng;
              }
            }
                break;
          }
        }
 unixStart.push(utils.getUnixDate(dateRecord) + recordTime[0]);    //This is the only place we use Javascript Date object, easiest way of getting the day of week
getTaskPoints(cRecords);
},
timeZone: timeZone,                                                                 //values here persist, can be interrogated from other modules once this is "required"
unixStart: unixStart,
headers: headers,
latLong: latLong,
pressureAltitude: pressureAltitude,
gpsAltitude: gpsAltitude,
recordTime: recordTime,
fixQuality: fixQuality,
enl: enl,
hasPressure: hasPressure,
taskpoints: taskpoints,
 bounds:  bounds,
 baseElevation: baseElevation
}

