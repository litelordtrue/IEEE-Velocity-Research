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
width = 1000 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

function lineSvgInit(){
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
    lineSvgInit();
    //console.log(pts);
    pts = addMissingValues(pts);
    //console.log(pts);
    drawCommitsGraph(pts);
}

function readMessages(){
    var messages_promise = d3.json("/slack_messages.json").then(function(data){
        for (i = 0; i < data.length; i++){
            let msg = data[i];

            // convert text date to javascript Date object
            msg.date = new Date(msg.date);
        }

        return data;
    })

    return messages_promise;
}

// set up a new div with an svg element inside, given an appropriate id from the type. ie for messages pass type messages
function stackedSvgInit(type){
    let stacked_div = document.createElement("div");
        stacked_div.setAttribute("id", type + "_stacked_graph");
    document.body.appendChild(stacked_div);

    // set the dimensions and margins of the graph
    
    // append the svg object to the body of the page
    let svg = d3.select("#" + type + "_stacked_graph")
    .append("svg").attr("id", type + "_stacked_main_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("id", type + "_stacked_main_g");
    
}

// random helper function for bucketing data
function listMonthsBetween(start, end){
    list_of_months = [];
    let month = start.getMonth();
    let year = start.getFullYear();
    while (!(month == end.getMonth() && year == end.getFullYear())){
        list_of_months.push(year + "/" + month);
        if (month == 11){
            month = 0;
            year += 1;
        }
        else{
            month += 1;
        }
    }

    list_of_months.push(end.getFullYear() + "/" + end.getMonth());
    return list_of_months;
}

// comb through data and sort it into buckets by month
function bucketDataByMonth(data){

    let [beginningdate, enddate] = d3.extent(data, function(d){return d.date});
    let bucketed_data = Object.fromEntries(listMonthsBetween(beginningdate, enddate).map(x => [x, []]));

    for (i = 0; i < data.length; i++){
        let datum = data[i];
        let date_string = datum.date.getFullYear() + "/" + datum.date.getMonth();
        bucketed_data[date_string].push(datum);
    }

    return bucketed_data;
}

// helper function to take the keys of an object but create a new object with some new default value for all keys
function replaceValuesFromObject(object, new_value){
    return Object.fromEntries(Object.keys(object).map(x => [x, new_value]));
}

// count instances of author per bucket
function countWithinBuckets(bucketed_data){
    let counted_data = replaceValuesFromObject(bucketed_data, null);

    for (date in bucketed_data){
        let counted_author_dict = replaceValuesFromObject(author_dict, 0);

        bucket = bucketed_data[date];
        for (j = 0; j < bucket.length; j++){
            datum = bucket[j];
            counted_author_dict[datum.author] += 1;
        }

        counted_data[date] = counted_author_dict;
    }

    return counted_data;
}

// convert previous structure to d3 recognizable
function readyForDrawing(counted_data){
    month_array = []
    for (date in counted_data){
        bucket = counted_data[date];
        month_object = {};
        month_object["date"] = new Date(...date.split("/"));
        Object.assign(month_object, bucket);
        month_array.push(month_object);
    }

    return month_array;
}

// stacked by author 
function drawStackedGraph(data, type){
    let processed_data = readyForDrawing(countWithinBuckets(bucketDataByMonth(data)));
    
    const svg = d3.select("#" + type + "_stacked_main_g");

    let stacked_data = d3.stack().keys(Object.keys(author_dict))(processed_data);

    const xScale = d3.scaleBand().domain(processed_data.map(function(d) { return d.date; })).range([0, width]).padding(0.2);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickFormat(x => (x.getMonth() + 1) + "/" + x.getFullYear())).selectAll("text").attr("transform", "translate(-10,5)rotate(-30)");

    // FIX DOMAIN
    const yScale = d3.scaleLinear().domain([0, 200]).range([height,0]);
    svg.append("g").call(d3.axisLeft(yScale));

    let n_authors = Object.keys(author_dict).length;
    let color_range = Array(n_authors);
    for (i = 0; i < n_authors; i++){color_range[i] = d3.interpolateTurbo(i/n_authors)};
    const colorScale = d3.scaleOrdinal().domain(Object.keys(author_dict)).range(color_range);

    // Bars
    svg.append("g")
    .selectAll("g")
    .data(stacked_data)
    .enter().append("g")
        .attr("fill", function(d) { return colorScale(d.key); })
        .selectAll("rect")
        .data(function(d) { return d; })
        .enter().append("rect")
        .attr("x", function(d) { return xScale(d.data.date); })
        .attr("y", function(d) { return yScale(d[1]); })
        .attr("height", function(d) { return yScale(d[0]) - yScale(d[1]); })
        .attr("width",xScale.bandwidth())

    
}

function readAuthorDict(){
    return d3.json("/author_dictionary.json");
}

author_dict = {
    "U4PT7ES0M": "Abhishek Lal",
    "U06NAEYSF": "Tim Lehnen",
    "U4KAE8Q91": "Irina Zaks",
    "U2T8M7PA4": "Mohit Aghera",
    "U1ET7192M": "Cristina Chumillas",
    "U01RG97SUNL": "Akshay Adhav",
    "U1A7P6GTZ": "G\u00e1bor Hojtsy (he/him)",
    "UKDHF4BU7": "Matias Miranda",
    "U3U1SD32R": "Neil Drumm",
    "U015ETZ1Z1P": "asmita wagh",
    "U06HDFAP5": "Lauri Eskola",
    "U03H4RUS1QS": "Juraj Nemec",
    "U21M96DQU": "Th\u00e9odore Biadala",
    "U6K08UK96": "Fran Garcia-Linares",
    "U374BLPJR": "Alex Pott",
    "U1ASJU340": "larowlan",
    "U6XHB78BV": "AaronMcHale",
    "U1CREGN04": "Mike Herchel",
    "U3A2ZDSE4": "Sascha Eggenberger",
    "U47JYK2DT": "Ofer Shaal",
    "U7G1P7P6Z": "Drew Webber",
    "U4LU589C0": "V Spagnolo",
    "U1AL60FHC": "Nathaniel Catchpole",
    "U04CS93RH1C": "Alphons Jaimon",
    "U49HYCETX": "Ben Mullins",
    "U03951VJN48": "Libbna Mathew",
    "U4B423ANR": "xjm",
    "UCV2S889L": "Andy Blum",
    "U1CV1TM1D": "Ted Bowman",
    "U02EJBNEUQM": "Abhishek Lal B",
    "U1AA5D42H": "webchick"
}