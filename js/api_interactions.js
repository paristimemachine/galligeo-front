function test() {

    var r=new XMLHttpRequest();
    r.open("GET", "http://holtanna.ut-capitole.fr/geoserver/wms?service=WFS&version=1.0.0&request=DescribeFeatureType" , false);
    
    // r.send(); 
    var responseText = r.responseText;
    console.log(responseText);
    }

// function geoserverApi(endpoint) {
//     fetch("http://holtanna:8080/geoserver/rest/workspaces/generic/datastores/holtanna/featuretypes.json")
//   .then((response) => response.json())
//   .then((data) => console.log(data));
// }

urlGeoserverApi = 'http://holtanna.ut-capitole.fr/geoserver/rest/workspaces/generic/datastores/holtanna/featuretypes.json';



function getDataFromApi() {

    fetch(urlGeoserverApi, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic ' + btoa('admin' + ":" + '=y88AQ.u'),
        'redirect': 'follow'
      },
  })
  .then(response => response.json())
  // .then(response => console.log(JSON.stringify(response)))
  //.then(response => addJsonLayerSteriles(response))
  
  // addJsonLayerSteriles(response.json());
  
  }
  