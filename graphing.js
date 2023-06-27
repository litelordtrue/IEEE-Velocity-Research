class SuperGraphType {
    constructor(date){
        this.date = date;
    }
}

class CommitsType extends SuperGraphType {
    constructor(date, commits){
        super(date);
        this.commits = commits;
    }
}

function sortGraphType(data){
    data.sort((a,b) => {return (a.date > b.date ? 1 : -1);});
}

// this function ASSUMES SORTED INPUT
function addMissingValues(data, [,value]){
    updated_data = data;
    for (i = 0; i < length(data) - 1; i++){
        date1 = data[i].date;
        date2 = data[i+1].date;
        second_dif = date2 - date1;
        // check if there is a full day between the two days
        //         second * minute * hour * millisecond
        if (second_dif >= 60*60*24*1000){
            date1plus = new Date(date1.getYear(), date1.getMonth())
        }
    }

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


function drawCommitsGraph(){
    const svg = d3.select("#line_main_svg")
    var date_dict_promise = d3.json("/date_dict.json")

    date_dict_promise.then(function(data){
        pts = []
        for (date in data){
            pts.push( new CommitsType(new Date(date), data[date]));
        }

        sortGraphType(pts);

        const tScale = d3.scaleTime().domain(d3.extent(pts, function(d){return d.date})).range([0, width]);
        svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(tScale));

        const commitScale = d3.scaleLinear().domain([0, d3.max(pts, function(d){return d.commits})]).range([height,0]);
        svg.append("g").call(d3.axisLeft(commitScale));

        svg.append("path")
            .datum(pts)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function(d) { return tScale(d.date) })
                .y(function(d) { return commitScale(d.commits) })
            )

    })
}
