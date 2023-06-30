class SuperGraphType {
    constructor(date, value){
        this.date = date;
        this.value = value;
    }
}

function sortGraphType(data){
    data.sort((a,b) => {return (a.date > b.date ? 1 : -1);});
}

function nDaysForward(date, n){
    let year = date.getFullYear();
    let month = date.getMonth();
    let day = date.getDate() + n;
    return new Date(year, month, day);
}

// this function ASSUMES SORTED INPUT
function addMissingValues(data, value = 0){
    let new_values = [];
    for (i = 0; i < data.length - 1; i++){
        let date1 = data[i].date;
        let date2 = data[i+1].date;
        let second_dif = date2 - date1;
        // check if there is a full day between the two days
        //         second * minute * hour * millisecond
        if (second_dif < 60*60*24*1000){}
        else {
            let date1plus = new SuperGraphType(nDaysForward(date1, 1), value);
            new_values.push(date1plus);
            if (second_dif >= 2*60*60*24*1000){
                let date2minus = new SuperGraphType(nDaysForward(date2, -1), value);
                new_values.push(date2minus);
            }
        }
    }
    new_values = new_values.concat(data);
    sortGraphType(new_values);

    return new_values;
}


const margin = {top: 10, right: 30, bottom: 30, left: 60},
width = 760 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

function svgInit(){
    // set the dimensions and margins of the graph

    // append the svg object to the body of the page
    const svg = d3.select("#line_graph")
    .append("svg").attr("id", "line_main_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
}

function readCommits(){
    var date_dict_promise = d3.json("/date_dict.json")

    let processed_promise = date_dict_promise.then(function(data){
        pts = []
        for (date in data){
            pts.push(new SuperGraphType(new Date(date), data[date]));
        }

        sortGraphType(pts);

        return pts;
    })

    return processed_promise;
}

function drawCommitsGraph(pts){
    const svg = d3.select("#line_main_svg")

    const tScale = d3.scaleTime().domain(d3.extent(pts, function(d){return d.date})).range([0, width]);
    svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(tScale));

    const commitScale = d3.scaleLinear().domain([0, d3.max(pts, function(d){return d.value})]).range([height,0]);
    svg.append("g").call(d3.axisLeft(commitScale));

    svg.append("path")
        .datum(pts)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function(d) { return tScale(d.date) })
            .y(function(d) { return commitScale(d.value) })
        )
}

function redrawCommitsGraph(){
    d3.select('#line_main_svg').remove();
    svgInit();
    //console.log(pts);
    pts = addMissingValues(pts);
    //console.log(pts);
    drawCommitsGraph(pts);
}