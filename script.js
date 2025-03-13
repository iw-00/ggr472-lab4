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
    style: 'mapbox://styles/iw00/cm7v0wnd701tl01qohx5y9nop',  // ****ADD MAP STYLE HERE *****
    // style: "mapbox://styles/iw00/cm87oo607000p01qr2nbl6kn3",
    center: [-79.372, 43.736],  // starting point, longitude/latitude
    zoom: 10 // starting zoom level
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
        // console.log(response); //Check response in console
        collisiongeojson = response; // Store geojson as variable using URL from fetch response
    });

map.on('load', () => {

    // Add collision datasource using GeoJSON variable
    map.addSource('toronto-collision', {
        type: 'geojson',
        data: collisiongeojson
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
    let envresult = turf.envelope(collisiongeojson);
    // console.log(envresult);

    // Increase size of bounding box.
    let bboxscaled = turf.transformScale(envresult, 1.1);
    // console.log(bboxscaled);

    // Get min and max coords of bounding box axes.
    let bboxcoords = [
        bboxscaled.geometry.coordinates[0][0][0],
        bboxscaled.geometry.coordinates[0][0][1],
        bboxscaled.geometry.coordinates[0][2][0],
        bboxscaled.geometry.coordinates[0][2][1],
    ];

    let hexdata = turf.hexGrid(bboxcoords, 0.5, {units: "kilometers"});
    // console.log(hexdata); // check in console
 
    /*--------------------------------------------------------------------
    Step 4: AGGREGATE COLLISIONS BY HEXGRID
    --------------------------------------------------------------------*/
    //HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
    //      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    // Aggregate collision data by hexgrid.
    let collishex = turf.collect(hexdata, collisiongeojson, "_id", "values");
    console.log(collishex.features); // check in console

    // Add point count and identify max number of collisions in a polygon
    let maxcollisions = 0; // initialize max collisions as 0

    collishex.features.forEach((feature) => {
        feature.properties.COUNT = feature.properties.values.length; // set COUNT to number of points in polygon
        if (feature.properties.COUNT > maxcollisions) {
            maxcollisions = feature.properties.COUNT // if polygon COUNT is greater than current max, set COUNT to max.
        }
    });

    // Add hexgrid source.
    map.addSource("hexdata", {
        type: "geojson",
        data: hexdata,
    });

    // Add aggregated collision hexgrid source.
    map.addSource("collishexgrid", {
        type: "geojson",
        data: collishex,
    });

    // Check hexgrid by adding to map
    // map.addLayer({
    //     id: "hexgrid",
    //     type: "fill",
    //     source: "hexdata",
    //     paint: {
    //         "fill-color": "blue",
    //         "fill-opacity": 0.5
    //     }
    // });

    // Add collision hexgrid to map.
    map.addLayer({
        id: "collishexfill",
        type: "fill",
        source: "collishexgrid",
        paint: {
            "fill-color": [
                "step",
                ["get", "COUNT"],
                "#fef0d9",
                10, "#fdcc8a",
                25, "#fc8d59",
                maxcollisions, "#d7301f"
            ],
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.8
            ],
        },
        filter: ["!=", "COUNT", 0], // filter out hexagons with 0 collisions
    });

    // Check points
    map.addLayer({
        'id': 'toronto-collision-pts',
        'type': 'circle',
        'source': 'toronto-collision',
        "layout": {
            "visibility": "none"
        },
        'paint': {
            'circle-radius': 3,
            'circle-color': '#a62c14',
            "circle-opacity": 0.8,
            "circle-color": [
                "match",
                ["get", "INVTYPE"],
                "Pedestrian", // Right-of-Way
                "#1b9e77",
                "Cyclist", // Open Space Site (Park)
                "#e7298a",
                "#7570b3" // Other
            ],
        }
    });
});

// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows

document.getElementById('ptlayercheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'toronto-collision-pts',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

document.getElementById('hexlayercheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'collishexfill',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

/*--------------------------------------------------------------------
ADD POP-UP ON CLICK EVENT
--------------------------------------------------------------------*/
map.on('mouseenter', 'collishexfill', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switch cursor to pointer when mouse is over provterr-fill layer
});

map.on('mouseleave', 'collishexfill', () => {
    map.getCanvas().style.cursor = ''; //Switch cursor back when mouse leaves provterr-fill layer
});

map.on('click', 'collishexfill', (e) => {
    new mapboxgl.Popup() //Declare new popup object on each click
        .setLngLat(e.lngLat) //Use method to set coordinates of popup based on mouse click location
        .setHTML("<b>Number of collisions:</b> " + e.features[0].properties.COUNT + "<br>" +
            "Population: " + e.features[0].properties.POP2021) //Use click event properties to write text for popup
        .addTo(map); //Show popup on map
})

/*--------------------------------------------------------------------
HOVER EVENT
// --------------------------------------------------------------------*/
let hexID = null; //Declare initial province ID as null

map.on('mousemove', 'collishexfill', (e) => {
    if (e.features.length > 0) { //If there are features in array enter conditional

        if (hexID !== null) { //If hexID IS NOT NULL set hover feature state back to false to remove opacity from previous highlighted polygon
            map.setFeatureState(
                { source: 'collishexgrid', id: hexID },
                { hover: false }
            );
        }

        hexID = e.features[0].id; //Update hexID to featureID
        map.setFeatureState(
            { source: 'collishexgrid', id: hexID },
            { hover: true } //Update hover feature state to TRUE to change opacity of layer to 1
        );
    }
});

map.on('mouseleave', 'collishexfill', () => { //If mouse leaves the geojson layer, set all hover states to false and hexID variable back to null
    if (hexID !== null) {
        map.setFeatureState(
            { source: 'collishexgrid', id: hexID },
            { hover: false }
        );
    }
    hexID = null;
});