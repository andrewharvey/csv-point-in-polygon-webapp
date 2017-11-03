var Papa = require('papaparse');
var whichPolygon = require('which-polygon');
var FileSaver = require('file-saver');

document.getElementById('go').addEventListener('click', function (e) {
    document.getElementById('progress').innerHTML = "1/4 Starting...";

    var polygonsFile = document.getElementById('polygons').files[0];
    var pointsFile = document.getElementById('points').files[0];
    if (polygonsFile && pointsFile) {
        var polygonsReader = new FileReader();
        polygonsReader.readAsText(polygonsFile, 'UTF-8');
        polygonsReader.onload = function (e) {
            var polygonsGeoJSON;
            try {
                polygonsGeoJSON = JSON.parse(e.target.result)
            } catch (e) {
                document.getElementById('progress').innerHTML = 'Error: error reading polygons file, is it a valid GeoJSON? See https://www.mapbox.com/geojsonhint/';
                console.log(e);
            }

            if (polygonsGeoJSON) {
                var query = whichPolygon(polygonsGeoJSON);
                var featureCount = 0;
                var hits = 0;
                var miss = 0;
                var errors = 0;
                var skipped = 0;

                var rows = [];
                Papa.parse(pointsFile, {
                    header: true,
                    worker: true,
                    step: function (row, parser) {
                        featureCount++;
                        if (featureCount % 1000 == 0) {
                            document.getElementById('progress').innerHTML = "2/4 In progress... " + (featureCount / 1000) + "K (" + hits + " hits, " + miss + " misses, " + skipped + " skipped, " + errors + " errors.)";
                        }
                        if (row && row.errors.length) {
                            // error
                            errors++;
                        } else {
                            if (row && row.data && row.data.length && row.data[0].Longitude && row.data[0].Latitude) {
                                var polygon = query([row.data[0].Longitude, row.data[0].Latitude]);
                                if (polygon) {
                                    hits++;

                                    Object.keys(polygon).forEach(function (key) {
                                        row.data[0]['polygon_' + key] = polygon[key];
                                    });
                                    rows.push(row.data[0]);
                                } else {
                                    miss++
                                }
                            } else {
                                skipped++;
                            }
                        }
                    },
                    complete: function () {
                        document.getElementById('progress').innerHTML = "3/4 Exporting...";
                        var outputCSV = Papa.unparse(rows, {
                            headers: true
                        });
                        var blob = new Blob([outputCSV], {type: "text/csv;charset=utf-8"});
                        FileSaver.saveAs(blob, "PointInPolygon.csv");
                        document.getElementById('progress').innerHTML = "4/4 Finished. " + hits + " records matched to a polygon, " + miss + " records not within any polygon, " + skipped + " records without a Longitude, Latitude field, " + errors + " records which returned an error";
                    }
                });
            }
        };
        polygonsReader.onerror = function (e) {
            document.getElementById('progress').innerHTML = 'Error: Error opening polygons file';
            console.log(e);
        };
    } else {
        document.getElementById('progress').innerHTML = 'Error: Both Polygon GeoJSON and Points CSV must be provided.';
    }
});

