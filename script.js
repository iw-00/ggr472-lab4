/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaXcwMCIsImEiOiJjbTV2aXFlajYwMjZmMmtvbWtrMGRhd3lkIn0.DbEVxhgWv4ANYwpIpCc4iA'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: '',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 11 // starting zoom level
});


/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

let collisiongeojson;

// Fetch geojson from url and store response.
fetch("https://raw.githubusercontent.com/iw-00/ggr472-lab4/refs/heads/main/data/pedcyc_collision_06-21.geojson")
    .then(response => response.json())
    .then(response => {
        console.log(response); //Check response in console
        collisiongeojson = response; // Store geojson as variable using URL from fetch response
    });

// Check points
map.on('load', () => {

    //Add datasource using GeoJSON variable
    map.addSource('toronto-collision', {
        type: 'geojson',
        data: collisiongeojson
    });

    map.addLayer({
        'id': 'toronto-collision-pts',
        'type': 'circle',
        'source': 'toronto-collision',
        'paint': {
            'circle-radius': 5,
            'circle-color': 'blue'
        }
    });

    /*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
    --------------------------------------------------------------------*/
    //HINT: All code to create and view the hexgrid will go inside a map load event handler
    //      First create a bounding box around the collision point data
    //      Access and store the bounding box coordinates as an array variable
    //      Use bounding box coordinates as argument in the turf hexgrid function
    //      **Option: You may want to consider how to increase the size of your bbox to enable greater geog coverage of your hexgrid
    //      Consider return types from different turf functions and required argument types carefully here

    // Create a bounding box from the collision data.
    let envresult = turf.envelope(collisionData);

    // Increase size of bounding box.
    let bboxscaled = turf.transformScale(envresult, 1.1);
    console.log(bboxscaled)

    // Get min and max coords of bounding box axes.
    let bboxcoords = [
        bboxscaled.geometry.coordinates[0][0][0],
        bboxscaled.geometry.coordinates[0][0][1],
        bboxscaled.geometry.coordinates[0][2][0],
        bboxscaled.geometry.coordinates[0][2][1],
    ];

    let hexdata = turf.hexGrid(bboxcoords, 0.5, {units: "kilometers"});

    let collishex = turf.collect(hexdata, collisionData, "_id", "values");

    // Aggregate collision data by hexgrid.
    let maxcollisions = 0;

    collishex.features.forEach((feature) => {
        feature.properties.COUNT = feature.properties.values.length;
        if (feature.properties.COUNT > maxcollisions) {
            maxcollisions = feature.properties.COUNT
        }
    });

    map.addSource("collishexgrid", {
        type: "geojson",
        data: collishex,
    });

    map.addLayer({
        id: "collishexfill",
        type: "fill",
        source: "collishexgrid",
        paint: {
            "fill-color": [
                "step",
                ["get", "COUNT"],
                "#ffffff",
                10, "#ffebf1",
                25, "#ffa0a6",
                maxcollisions, "#ff0000"
            ],
            "fill-opacity": 0.8
        },
        filter: ["!=", "COUNT", 0],
    });

});



/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty



// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


