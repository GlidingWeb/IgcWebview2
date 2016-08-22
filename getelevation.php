<?php
$ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://maps.googleapis.com/maps/api/elevation/json?locations='.$_POST['lat'].','.$_POST['lon'].'&key=SECRET');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $json = curl_exec($ch);
    curl_close($ch);
   echo $json;
?>
