# IEEE Velocity Research

This code is used to generate graphs on a webpage using graphing.js script based on  d3.js v7. (https://d3js.org/d3.v7.min.js)

See index.html for commented example of how to implement. 

Extras folder contains various files used in development but are not required. 

Data for our research project is stored in json files (drupal_issues, gitlab_commits, slack_messages) but you can specify your own path to the files in your index file. You can export svg files to png/jpg using browser extension

Worth noting however that the read functions are not generalized and as of now work specfically on these files. 