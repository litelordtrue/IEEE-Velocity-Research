const margin = {top: 10, right: 30, bottom: 30, left: 60},
width = 1000 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;


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
function countWithinBuckets(bucketed_data, author_array){
    let counted_data = replaceValuesFromObject(bucketed_data, null);

    for (date in bucketed_data){
        let counted_author_dict = Object.fromEntries(author_array.map(x => [x, 0]));

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
function drawStackedGraph(data, type, author_array){
    let processed_data = readyForDrawing(countWithinBuckets(bucketDataByMonth(data), author_array));
    
    const svg = d3.select("#" + type + "_stacked_main_g");

    let stacked_data = d3.stack().keys(author_array)(processed_data);

    const xScale = d3.scaleBand().domain(processed_data.map(function(d) { return d.date; })).range([0, width]).padding(0.2);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickFormat(x => (x.getMonth() + 1) + "/" + x.getFullYear())).selectAll("text").attr("transform", "translate(-10,5)rotate(-30)");

    // FIX DOMAIN
    const yScale = d3.scaleLinear().domain([0, 200]).range([height,0]);
    svg.append("g").call(d3.axisLeft(yScale));

    let n_authors = author_array.length;
    let color_range = Array(n_authors);
    for (i = 0; i < n_authors; i++){color_range[i] = d3.interpolateTurbo(i/n_authors)};
    const colorScale = d3.scaleOrdinal().domain(author_array).range(color_range);

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

    // Title

    svg.append("text").attr("y", margin.top).attr("x", width/2).text(type);
}

function readIssues(){
    var issues_promise = d3.json("/drupal_issues.json").then(function(data){
        for (i = 0; i < data.length; i++){
            let issue = data[i];

            // convert text date to javascript Date object
            issue.date = new Date(issue.date);
        }

        return data;
    })

    return issues_promise;
}

function createAuthorArray(data){
    author_array = new Set();

    for (i = 0; i < data.length; i++){
        let datum = data[i];
        author_array.add(datum.author);
    }

    return Array.from(author_array);
}

function readCommits(){
    var commits_promise = d3.json("/gitlab_commits.json").then(function(data){
        refactored_commits = [];

        for (i = 0; i < data.length; i++){
            let commit = data[i];

            // rename attributes to date and author
            delete Object.assign(commit, {["date"]: commit["authored_date"] })["authored_date"];
            delete Object.assign(commit, {["author"]: commit["author_name"] })["author_name"];

            // convert text date to javascript Date object
            commit.date = new Date(commit.date);
            
        }

        return data;
    })

    return commits_promise;
}