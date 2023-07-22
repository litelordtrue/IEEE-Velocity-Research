// FUNCTIONS TO READ JSON //


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

// END READ SECTION //
// FUNCTIONS TO MANIPULATE DATA //

function removeArrayItem(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
      arr.splice(index, 1);
    }
    return arr;
}

function createCountByArray(data, count_by){
        // Set does not allow duplicates, convenient for putting list together
        count_by_array = new Set();

        for (i = 0; i < data.length; i++){
            let datum = data[i];
            count_by_array.add(datum[count_by]);
        }
    
        // however, sets dont have many of the useful array methods so we return an array
        return Array.from(count_by_array);
}

function createAuthorArray(data){
    return createCountByArray(data, "author");
}

// list out the months between two Dates as strings of the format "%Y/%m"
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

// this is great and generalized but im not using it because I need the list of EVERY author, not just the authors of the array.
function countWithinArray(array, count_by){
    count_by_array = createCountByArray(array, count_by);
    let counted_dict = Object.fromEntries(count_by_array.map(x => [x, 0]));

    for (j = 0; j < array.length; j++){
        datum = array[j];
        counted_dict[datum[count_by]] += 1;
    }

    return counted_dict;
}

// count within a single "bucket", this is useful in multiple places so I split it. naming is pretty bad though
function countWithinBucket(bucket, author_array){
    let counted_dict = Object.fromEntries(author_array.map(x => [x, 0]));

    for (j = 0; j < bucket.length; j++){
        datum = bucket[j];
        counted_dict[datum.author] += 1;
    }

    return counted_dict;
}

// count instances of author per bucket
function countWithinBuckets(bucketed_data, author_array){
    let counted_data = copyObjectReplacedValues(bucketed_data, null);

    for (date in bucketed_data){
        bucket = bucketed_data[date];
        counted_data[date] = countWithinBucket(bucket, author_array);
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

    month_array.sort((a,b) => a.date - b.date);

    return month_array;

};

// helper function to get the key of maximal entry(s) in an object
function getMaxOfObject(object){
    max_value = Math.max(...Object.values(object));
    max_keys = Object.keys(object).filter(x => (object[x] == max_value));
    return [max_keys, max_value]
}

function copyObjectWithMap(object, f){
    new_object = {};
    for (key in object){
        new_object[key] = f(object[key]);
    }

    return new_object;
}

// deep copy by mapping identity
function deepCopyObject(object){
    return copyObjectWithMap(object, (x => x));
}

// helper function to take the keys of an object but create a new object with some new default value for all keys
function copyObjectReplacedValues(object, new_value){
    return copyObjectWithMap(object, x => new_value);
}

function gatherExtrema(data){
    let sub_object = {
        who: [],
        n: 0
    }
    let gathered_object = {
        by_total: deepCopyObject(sub_object),
        by_author: deepCopyObject(sub_object),
        by_bucket: deepCopyObject(sub_object)
    }

    if (data.length > 0){
        // total
        let [max_total, max_total_posts] = getMaxOfObject(countWithinArray(data, "author"));
        gathered_object.by_total.who = max_total;
        gathered_object.by_total.n = max_total_posts;


        // by author
        let [max_authors, max_authors_posts] = getMaxOfObject(countWithinArray(data, "author"));
        gathered_object.by_author.who = max_authors;
        gathered_object.by_author.n = max_authors_posts;

        // by bucket
        let [max_buckets, max_buckets_posts] = getMaxOfObject(copyObjectWithMap(bucketDataByMonth(data), (x => x.length)));
        max_buckets = max_buckets.map(date => (new Date(...date.split("/"))).toLocaleDateString('en-US', {month: 'long', year: "numeric"}));
        gathered_object.by_bucket.who = max_buckets;
        gathered_object.by_bucket.n = max_buckets_posts;
    }

    return gathered_object;
};

function createGroupedData(datas){
    // datas should look like: {type: data, type: data}
    counted_datas = {}
    for (type in datas){
        counted_datas[type] = copyObjectWithMap(bucketDataByMonth(datas[type]), x => x.length);
    }
    empty_counted_data = copyObjectReplacedValues(counted_datas, 0);
    all_dates = new Set();

    for (key in counted_datas){
        for (date in counted_datas[key]){
            all_dates.add(date);
        }
    }

    grouped_datas = Object.fromEntries(Array.from(all_dates).map(x => [x, deepCopyObject(empty_counted_data)]));

    for (key in counted_datas){
        for (date in counted_datas[key]){
            grouped_datas[date][key] = counted_datas[key][date];
        }
    }

    return grouped_datas;
};

// END DATA MANIPULATION FUNCTIONS //
// FUNCTIONS FOR DRAWING EXTREMA TABLE //
function createTextCell(text){
    let td = document.createElement("td");
    let text_cell = document.createTextNode(text);
    td.appendChild(text_cell);
    return td;
}

function initExtremaTable(){
    let empty_extrema = gatherExtrema([]);
    let table = document.createElement("table");
        table.setAttribute("id", "extremaTable");
    document.body.appendChild(table);
    let table_head = table.createTHead();
    let header_row = table_head.insertRow();
    header_row.appendChild(createTextCell("dataset"));
    for (key in empty_extrema){
        text_cell = createTextCell(key.split("_")[1]);
        text_cell.setAttribute("colspan", "2");
        header_row.appendChild(text_cell);
    }
    let sub_header_row = table_head.insertRow();
    sub_header_row.appendChild(createTextCell(""));
    for (let key of Object.values(empty_extrema)){
        for (subkey in key){
            sub_header_row.appendChild(createTextCell(subkey));
        }
    }
}

function updateExtremaTable(extrema, type){
    let table = document.getElementById("extremaTable");
    let row = table.insertRow();
    row.appendChild(createTextCell(type));
    for (key in extrema){
        let sub_extrema = extrema[key];
        for (sub_key in sub_extrema){
            row.appendChild(createTextCell(sub_extrema[sub_key]));
        }
    }
}
// END EXTREMA TABLE //



// FUNCTIONS FOR DRAWING USING D3 //

// bounds for svg. arbitrarily set for now 
const margin = {top: 10, right: 30, bottom: 50, left: 60},
width = 1000 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;
legend_width_ratio = 3;

// set up a new div with an svg element inside, given an appropriate id from the type. ie for messages pass type messages
function initStackedSvg(type){
    let stacked_div = document.createElement("div");
        stacked_div.setAttribute("id", type + "_stacked_graph");
    document.body.appendChild(stacked_div);

    // set the dimensions and margins of the graph
    
    // append the svg object to the body of the page
    let svg = d3.select("#" + type + "_stacked_graph")
    .append("svg").attr("id", type + "_stacked_main_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "whitesmoke")
    .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("id", type + "_stacked_main_g");
    
}

// stacked by author 
function fillStackedGraph(data, type, author_array){
    let extrema = gatherExtrema(data);

    let processed_data = readyForDrawing(countWithinBuckets(bucketDataByMonth(data), author_array));
    
    const svg = d3.select("#" + type + "_stacked_main_g");

    let stacked_data = d3.stack().keys(author_array)(processed_data);

    const xScale = d3.scaleBand().domain(processed_data.map(function(d) { return d.date; })).range([0, width]).padding(0.2);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickFormat(x => (x.getMonth() + 1) + "/" + x.getFullYear())).selectAll("text").attr("transform", "translate(-10,5)rotate(-30)");

    const yScale = d3.scaleLinear().domain([0, 1.2*extrema.by_bucket.n]).range([height,0]);
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

    // Titles
    svg.append("text").attr("transform", `translate(${-margin.left/2},${height/2})rotate(-90)`).text(type);
    svg.append("text").attr("transform", `translate(${width/2},${height+(margin.bottom)/1.25})`).text("month");

    // Filling in appropriate data in table
    updateExtremaTable(extrema, type);
}

function drawStackedGraph(data, type){
    let author_array = createAuthorArray(data);
    initStackedSvg(type);
    fillStackedGraph(data, type, author_array);
};

function initGroupedSvg(){
    let grouped_div = document.createElement("div");
        grouped_div.setAttribute("id", "grouped_graph");
    document.body.appendChild(grouped_div);

    // set the dimensions and margins of the graph
    
    // append the svg object to the body of the page
    let svg = d3.select("#grouped_graph")
    .append("svg").attr("id", "grouped_main_svg")
                                            // giving extra space for the legend
        .attr("width", width + margin.left + legend_width_ratio*margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "whitesmoke")
    .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("id", "grouped_main_g");

}

function fillGroupedGraph(datas){
    let processed_data = readyForDrawing(createGroupedData(datas));
    console.log(processed_data);

    const svg = d3.select('#grouped_main_g');

    var subgroups = removeArrayItem(Object.keys(processed_data[0]), "date");

    const xScale = d3.scaleBand().domain(processed_data.map(function(d) { return d.date; })).range([0, width]).padding(0.2);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickFormat(x => (x.getMonth() + 1) + "/" + x.getFullYear())).selectAll("text").attr("transform", "translate(-10,5)rotate(-30)");
    
    const yScale = d3.scaleLinear().domain([0, 200]).range([height,0]);
    svg.append("g").call(d3.axisLeft(yScale));

    const xSubscale = d3.scaleBand().domain(subgroups).range([0, xScale.bandwidth()]).padding(.25*xScale.padding());

    let n_subgroups = subgroups.length;
    let color_range = Array(n_subgroups);
    for (i = 0; i < n_subgroups; i++){color_range[i] = d3.interpolatePuOr(i/n_subgroups)};
    const colorScale = d3.scaleOrdinal().domain(subgroups).range(color_range); 

    svg.append("g")
        .selectAll("g")
        // Enter in data = loop group per group
        .data(processed_data)
        .enter()
        .append("g")
        .attr("transform", function(d) { return "translate(" + xScale(d.date) + ",0)"; })
        .selectAll("rect")
        .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
        .enter().append("rect")
        .attr("x", function(d) { return xSubscale(d.key); })
        .attr("y", function(d) { return yScale(d.value); })
        .attr("width", xSubscale.bandwidth())
        .attr("height", function(d) { return height - yScale(d.value); })
        .attr("fill", function(d) { return colorScale(d.key); });
    
    // Legend and Title
    svg.append("text").attr("transform", `translate(${width/2},${height+(margin.bottom)/1.25})`).text("month");

    let l_margin = {width: 10, space: 5}

    let legend = svg.append("g")
        .attr("id", "grouped_legend")
        .attr("transform", `translate(${width},${margin.top})`);
    
    legend.append("rect").attr("width", legend_width_ratio*margin.right)
        .attr("height", subgroups.length*(l_margin.width + l_margin.space) + l_margin.space)
        .style("fill", "whitesmoke").style("stroke", "black");


    for (i = 0; i < subgroups.length; i++){
        let subgroup = subgroups[i];

        legend.append("rect")
            .attr("transform", `translate(${l_margin.space}, ${l_margin.space*(i+1)+i*l_margin.width})`)
            .attr("width", l_margin.width).attr("height", l_margin.width)
            .style("fill", colorScale(subgroup));
        
        legend.append("text")
            .attr("transform", `translate(${2*l_margin.space + l_margin.width}, ${l_margin.space*(i+3)+i*l_margin.width})`)
            .text(subgroup)
            //.style("font-size", `${l_margin.width}px`);

    }
}
// END DRAWING FUNCTIONS