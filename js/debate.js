let width = window.innerWidth / 2
let height = 70
let scale = {
  x: d3.scaleLinear().domain([0,100]).range([10,width - 230]),
  y: d3.scaleLinear().domain([0,100]).range([20,height]),
  speaker_x: d3.scaleBand().domain([1,2,3,4,5,6,7,8,9,10]).range([10,width]),
  color: d3.scaleOrdinal(d3.schemeCategory10),
  topic_colors: d3.scaleOrdinal().domain([1,2,3,4,5]).range(["#d6e09c","#d5a1aa","#98b59c","#7eb5b6","#cb8c7e","#bcddb8"])
}
let current_debate = []
let current_data = null
let current_index = 0;

let selectedTopics = []

d3.json("data/debates.json")
  .then(function(debates){
    populateDebateDropdown(debates);
    initial_debate = debates.years["2020"].dem[debates.years["2020"].dem.length-1];
    recentlyViewed = sessionStorage.getItem("recentlyViewed")
    if(recentlyViewed != undefined){
      let year = sessionStorage.getItem("year")
      let category = sessionStorage.getItem("category")
      let debate_id = sessionStorage.getItem("debate_id")
      initial_debate = debates.years[year][category].filter(d => d.id == debate_id)[0];
    }

    loadDebate(initial_debate);
    let urlParams = getUrlVars();

    if(urlParams['debate'] != undefined){
      // if a debate was stored in URL parameters, jump to the stored index of that debate.
      storedIndex = urlParams['index'];
      scrollToElement(storedIndex);
    }

});

function drawDebateDots(svg, data){
  y_offset = 0;
  svg.append("text").text(data.id).style("font-family","monospace").attr("y",10)
  svg.selectAll("circle")
    .data(data.lines)
    .enter()
    .append("circle")
    .attr("cx",(d,i) => scale.x(i % 120))
    .attr("cy",function(d,i){
      if(i % 120 == 0){
        y_offset += 10
      }
      polarity_offset = 0// d.polarity * -4
      return scale.y(y_offset) + polarity_offset;
    })
    .attr("r",2)
  //    .attr("stroke", d => d.topics.length > 0 ? "#ff2562" ,"none")
    .attr("fill",d => d.topics.length > 0 ? "#5bd168" : "#d6dad7")
    .on("mouseover", function(d){
      d3.select("body").append("text").attr("id","text-focus").text(d.text).style("font-family","monospace")
    })
    .on("mouseout", function(d){
      d3.select("#text-focus").remove()
    });
}

function drawSpeakers(svg,data){
  filtered_speakers = data.speakers.filter(d => !d.is_moderator)
//  scale.speaker_x.domain(filtered_speakers.map(d => d.id));
  svg.append("text").text(data.id).style("font-family","monospace").attr("y",10)
  svg.selectAll(".speaker")
    .data(filtered_speakers)
    .enter()
    .append("image")
    .attr("x", (d,i) => scale.speaker_x(i))
    .attr("y", scale.y(10))
    .attr("width",30)
    .attr("href",d => "headshots/" + d.id + ".png")
    .style("border-radius","50%");
}

function scrollToElement(index){
  console.log("Scrolling to element ", index );
    let element = d3.select("#transcript-" + index);
    let offsetTop = window.pageYOffset || document.documentElement.scrollTop;
    let elementBottom = element.node().getBoundingClientRect().bottom + window.scrollY;
    let elementTop = element.node().getBoundingClientRect().top + window.scrollY;
    let elementHeight = (elementBottom - elementTop);
    let windowHeight = window.innerHeight;
    d3.transition()
      .tween("scroll", (offset => () => {
        var i = d3.interpolateNumber(offsetTop, offset);
        return t => scrollTo(0, i(t))
      })(elementTop - (windowHeight * 0.4)));
    updateScroll(current_index, index);
    current_index = index;
    sessionStorage.setItem("index",current_index);
}

function updateScroll(from, to){
  if(to > from){
    // Moving forwards in timeline, so add highlights.
    let j = 0;
    while(j <= to){
      d3.select("#statement-" + j).select("rect").attr("fill","#dddddd")
  //    d3.selectAll(".statement-" + j).attr("fill","black");
      j++;
    }
  }
  else if(to < from){
    // Moving backwards in timeline, so remove rect highlights.
    let j = current_data.lines.length;
    while(j > to){
      d3.select("#statement-" + j).select("rect").attr("fill","none");
  //    d3.selectAll(".statement-" + j).attr("fill","gray");
      j--;
    }
  }
}

function loadDebate(debate){
  clear();
  d3.select("#currently-viewing-label").text(debate.label);
  d3.json(debate.filename).then(function(data){
    for(i in data.lines){
      data.lines[i].speaker = data.speakers.filter(sp => sp.id == data.lines[i].speaker)[0];
    }
    console.log(data);
    current_data = data;
    render(current_data);
    sessionStorage.setItem("recentlyViewed",true)
    sessionStorage.setItem("year", data.year)
    sessionStorage.setItem("category", data.category)
    sessionStorage.setItem("debate_id", data.id);
  });
}

function render(data){
  console.log(data);
    scale.color.domain(data.speakers.map(d => d.id));
    createPatterns(data.speakers.filter(d => !d.is_moderator));
    drawTimeline(data);
    addTranscript(data);
  //  let displayTopics = d3.select("#topic-interactions-toggle").attr("showingtopics") == "true";
  //  drawGraph(data, "speakers", displayTopics ? "topics" , "speakers");
    initializeGraph();
    addTitle(data);
    addTooltips();
    if(sessionStorage.getItem("index") != undefined){
      scrollToElement(sessionStorage.getItem("index"))
    }
}

function clear(){
  clearTimeline();
  clearTranscript();
  clearGraph();
}

function addTitle(data){
  d3.select(".title").text(data.id)
}

function addTooltips(){
  let edgeTooltip = d3.select("body")
	.append("div")
  .attr("id", "edge-tooltip")
  .attr("class","debate-tooltip");

  edgeTooltip.append("text").text("");
  edgeTooltip.append("ul");

  let speakerTooltip = d3.select("body")
	.append("div")
  .attr("id", "speaker-tooltip")
  .attr("class","debate-tooltip");

  speakerTooltip.append("text").attr("class","speaker-tooltip-name").text("");
  speakerTooltip.append("div").attr("class","speaker-tooltip-details").text("");

  let topicTooltip = d3.select("body")
    .append("div")
    .attr("id", "topic-tooltip")
    .attr("class","debate-tooltip");

  topicTooltip.append("text").attr("class","topic-tooltip-name").text("");
  topicTooltip.append("div").attr("class","topic-tooltip-details").text("");
}

function initializeGraph(){
  drawGraph(current_data, "speakers", "speakers");
  d3.select("#topic-interactions-toggle").text("Show topics");
  d3.select("#topic-interactions-toggle").attr("showingTopics",false);
}

function switchTopicAndInteractionViews(){
  console.log("Switching visualizations.");
  let showingTopics = d3.select("#topic-interactions-toggle").attr("showingTopics") == "true";
  clearGraph();
  showingTopics = !showingTopics;
  drawGraph(current_data, "speakers", showingTopics ? "topics" : "speakers")
  if(showingTopics){
    d3.select("#topic-interactions-toggle").text("Show speaker interactions");
  }
  else{
    d3.select("#topic-interactions-toggle").text("Show topics");
  }
  d3.select("#topic-interactions-toggle").attr("showingTopics",showingTopics)
}

d3.select("#topic-interactions-toggle").on("click", e => switchTopicAndInteractionViews(false));

function resized(){
  clear();
  render(current_data);
}

let resizeTimeout;

window.addEventListener("resize", function(){
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function(){
    resized();
  }, 500);
});

// window.addEventListener("scroll", function(){
//   sessionStorage.setItem("index",1);
// });

function createPatterns(speakers){

  d3.select("body").append("svg")
    .attr("id","speaker-patterns")
    .selectAll(".speaker-pattern")
    .data(speakers)
    .enter()
    .append("pattern")
    .attr("height", 1)
    .attr("width", 1)
    .attr("id",d => "pattern-" + d.id)
    .append("image")
    .attr("width",d => "25%")
//    .attr("x", d => interactions.scale.speakerSize(d.total_utterances) + "%")
    .attr("href",d => "headshots/" + d.id + ".png")
}

function populateDebateDropdown(debates){
  let years = Object.keys(debates.years)
  // Create hierarchical dropdown of debate transcripts.
  for(i in years){
    let year = years[i];
    let year_debates = debates.years[year]
    let categories = Object.keys(year_debates)
    let li = d3.select("#debate-selection")
        .append("li")
        .attr("class","dropdown-submenu");

      li.append("a")
        .attr("class","submenu btn btn-default dropdown-toggle")
        .text(year);

      li.append("ul")
        .attr("class","dropdown-menu")
        .attr("id","submenu-year-" + year)

    for(j in categories){
      let category = categories[j];
      let cat_li = d3.select("#submenu-year-" + year)
        .append("li")
        .attr("class","dropdown-submenu");

      cat_li.append("a")
        .attr("class","submenu btn btn-default dropdown-toggle")
        .text(category);

      cat_li.append("ul")
        .attr("class","dropdown-menu")
        .attr("id","submenu-category-" + category);

      category_debates = debates.years[year][category];
      for(k in category_debates){
        debate = category_debates[k];
        d3.select("#submenu-year-" + year)
          .select("#submenu-category-" + category).selectAll(".dropdown-item-" + debate.id)
          .data([debate])
          .enter()
          .append("li")
          .attr("class",function(d){
            return "dropdown-item dropdown-item-" + d.id;
          })
          .text(d => d.id)
          .on("click", function(debate){
            loadDebate(debate);
          });
      }
    }
  }
  //
  // for(i in debates){
  //   debate = debates[i]
  //   d3.select("#submenu-year-" + debate.year)
  //     .select("#submenu-category-" + debate.category)
  //     .selectAll(".dropdown-item-" + debate.id)
  //     .data([debate])
  //     .enter()
  //     .append("li")
  //     .attr("class",function(d){
  //       return "dropdown-item dropdown-item-" + d.id;
  //     })
  //     .text(d => d.id)
  //     .on("click", function(d){
  //       loadDebate(d.id);
  //       sessionStorage.setItem("debate",d.id);
  //     });
  // }

  $(document).ready(function(){
    $('.dropdown-submenu a.submenu').on("click", function(e){
      $(this).next('ul').toggle();
      e.stopPropagation();
      e.preventDefault();
    });
  });
}


function showSpeakerTooltip(speaker){
  let tooltip = d3.select("#speaker-tooltip").style("visibility","visible");
  tooltip.select(".speaker-tooltip-name").text(speaker.first_name + " " + speaker.last_name);
  tooltip.selectAll(".speaker-tooltip-details > div").remove();
  tooltip.select(".speaker-tooltip-details").append("div").text("Total utterances: " + speaker.total_utterances);
  tooltip.select(".speaker-tooltip-details").append("div").text("Mentions of other speakers: " + speaker.source_count);
  tooltip.select(".speaker-tooltip-details").append("div").text("Mentions from other speakers: " + speaker.target_count);
}

function showTopicTooltip(topic, mentions){
  let tooltip = d3.select("#topic-tooltip").style("visibility","visible");
  tooltip.select(".topic-tooltip-name").text(topic.label);
  tooltip.selectAll(".topic-tooltip-details > div").remove();
//  tooltip.select(".topic-tooltip-details").append("div").text("Total mentions, " + topic.indices.length);
  tooltip.select(".topic-tooltip-details").append("div").text("Mentioned most frequently by ")
  let list = tooltip.select(".topic-tooltip-details > div").append("ul");
  for(i in mentions){
    list.append("li").text(mentions[i].speaker)
  }
}

function getUrlVars() {
  // read URL parameters and put them into a data structure.
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
  });
  return vars;
}

function setUrlVars(url, key, value) {
  let baseUrl = url.split('?')[0],
      urlQueryString = url.split('?')[1],
      newParam = key + '=' + value,
      params = '?' + newParam;
  // If the "search" string exists, then build params from it
  if (urlQueryString) {
    urlQueryString = '?' + url.split('?')[1];
      var updateRegex = new RegExp('([\?&])' + key + '[^&]*');
      var removeRegex = new RegExp('([\?&])' + key + '=[^&;]+[&;]?');

      if (typeof value === 'undefined' || value === null || value === '') { // Remove param if value is empty
          params = urlQueryString.replace(removeRegex, "$1");
          params = params.replace(/[&;]$/, "");

      } else if (urlQueryString.match(updateRegex) !== null) { // If param exists already, update it
          params = urlQueryString.replace(updateRegex, "$1" + newParam);

      } else { // Otherwise, add it to end of query string
          params = urlQueryString + '&' + newParam;
      }
  }

  // no parameter was set so we don't need the question mark
  params = params === '?' ? '' : params;
  return baseUrl + params;
}

function createShareableLink(){
  let baseUrl = window.location.href;
  let current_debate_id = sessionStorage.getItem("debate_id");
  let current_index = sessionStorage.getItem("index");
  let link = setUrlVars(baseUrl,"debate", current_debate_id);
  link = setUrlVars(link, "index", current_index);
  $('#shareable-link').attr("value",link);
}

function copyLink(){
  var copyText = document.getElementById("shareable-link");
  copyText.select();
  document.execCommand("copy");
}
