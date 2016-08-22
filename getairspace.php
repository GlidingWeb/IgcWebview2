<?php
function getpolygons($whereclause) {
global $mysqli;
$polygons=array();
$polylist = $mysqli->query("SELECT base,AsText(outline) FROM geopoly WHERE $whereclause");
while($polygon=$polylist->fetch_row())
   {
   $reduced=str_replace(")","",str_replace("LINESTRING(","",str_replace(")LINESTRING(",",",$polygon[1])));
   $pointlist=explode(",",$reduced);
   unset($coordlist);
   foreach($pointlist as $point) {
     $splitpoint= explode(" ",$point);
     $coords['lat']=$splitpoint[0];
     $coords['lng']=$splitpoint[1];
     $coordlist[]=$coords;
   }
   $polygons[]=( object)array("base"=>$polygon[0],"coords"=>$coordlist);
   }
   $polylist->close();
   return  $polygons;
}

function getcircles($whereclause) {
global $mysqli;
$circlelist = $mysqli->query("SELECT base,AsText(centre),radius FROM geocircle WHERE $whereclause");
$circles=array();
   while($circle=$circlelist->fetch_row()) {
   $reduced=str_replace(")","",str_replace("POINT(","",$circle[1]));
   $splitpoint=explode(" ",$reduced);
   $centre['lat']=$splitpoint[0];
   $centre['lng']=$splitpoint[1];
    $circles[]=( object)array("base"=>$circle[0],"centre"=>$centre,"radius"=>$circle[2]);
   }
   return $circles;
}


$degdist = 111; // km- circumference of the earth divided by 360
require_once("../db_inc.php");
$mysqli=new mysqli($dbserver,$username,$password,$database);
$bounds=json_decode($_POST['bounds']);
$latmargin=$_POST['margin']/$degdist;
if(abs($bounds->north) > abs($bounds->south)) {
$latref=$bounds->south;
}
else {
$latref= $bounds->north;
}
$lngmargin=$latmargin/cos(deg2rad($latref));
 $north=$bounds->north + $latmargin;
$south= $bounds->south - $latmargin;;
$east= $bounds->east + $lngmargin;
if($east > 180) {
     $east= 360-$east;
     }
$west=$bounds->west - $lngmargin;
if($west < -180) {
     $west= 360 + $west;
     }
 $box="POLYGON(($north $west,$north $east,$south $east,$south $west,$north $west))";
  $sql="SET @bbox=GeomFromText('".$box."')";
  $mysqli->query($sql);
  $wherepolygons="INTERSECTS(outline,@bbox)";
  $wherecircles="INTERSECTS(mbr,@bbox)";
  $retval['polygons']=getpolygons($wherepolygons);
  $retval['circles']=getcircles($wherecircles);
  echo json_encode($retval,JSON_NUMERIC_CHECK);
  $mysqli->close();
?>