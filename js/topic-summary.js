topic_summary = {
  "scale": {
    "color": d3.scaleOrdinal(d3.schemeCategory10),
    "x": d3.scaleLinear().domain([0,1]),
    "y": d3.scaleLinear().domain([0,1]),
    "speakers": d3.scaleBand(),
    "count": d3.scaleLinear(),
    "topics": d3.scaleBand()
  },
  "axis": {
    "speakers": d3.axisLeft(),
    "topics": d3.axisLeft(),
  },
  "margin":{
    "top": 20,"bottom": 40,"left": 30,"right":20
  },
  "width" : 0,
  "height" : 0,
}

svg = null;

function drawTopicSummary(data){
  topic_summary.width = $("#vis-container").width();
  topic_summary.height = window.innerHeight;
  topic_summary.scale.x.range([topic_summary.margin.left,topic_summary.width - topic_summary.margin.right]);
  topic_summary.scale.y.range([topic_summary.margin.top,topic_summary.height - topic_summary.margin.bottom]);

  svg = d3.select("#vis-container").append("svg").attr("id","topics-svg").attr("width",topic_summary.width).attr("height",topic_summary.height);

  svg.append("g").attr("id","topics-g").attr("transform","translate(" + topic_summary.margin.left + "," + topic_summary.margin.top + ")");
  // addSpeakerChart(data);
  // addTopicChart(data);
  bipartiteGraph(data);
}

function addSpeakerChart(data){
    let speakers = data.speakers.filter(d => !d.is_moderator);
    topic_counts = data.topic_speaker_matrix;
    // First sort speakers by their total number of utterances.
    speakers.sort((a,b) => topic_counts[b.id]["total"] - topic_counts[a.id]["total"]);

    // create g to hold topic detail bar chart.
    let speakerChart = d3.select("#topics-g");

    let minBandwidth = 20;

    // we don't want to include the moderator because they speak disproportionately more than the rest of the speakers.
    topic_summary.scale.speakers.domain(speakers.map(function(d){return d.id}));
    topic_summary.scale.speakers.range([topic_summary.scale.y(0),topic_summary.scale.y(0.3)]);

    topic_summary.axis.speakers.scale(topic_summary.scale.speakers);

    // calculate maximum count out of all speakers. List is sorted so first entry has the most utterances.
    let max = topic_counts[speakers[0].id]["total"];
    topic_summary.scale.count.domain([0, max]);
    topic_summary.scale.count.range([topic_summary.scale.x(0.1),topic_summary.scale.x(0.5)]);
    // create header text.
    speakerChart.append("text")
      .attr("id", "speaker-chart-label")
      .style("font-size","7pt")
  //    .text("Who spoke the most?");

    // create left speaker axis for bar chart.
    speakerChart.append("g").attr("transform","translate(" + topic_summary.scale.count.range()[0] + ",0)").attr("id","speaker-chart-axis").call(topic_summary.axis.speakers);

    speakerChart.append("text")
      .attr("transform","translate(" + topic_summary.scale.count.range()[0] + ",-5)")
      .style("font-size","8pt")
      .style("fill","black")
  //    .text("Count");

    // speaker images next to bars.
    speakerChart.selectAll(".speaker-chart-image")
      .data(speakers)
      .enter()
      .append("circle")
      .attr("class",d => "speaker-chart-image")
      .attr("cx", topic_summary.scale.x(0))
      .attr("cy",d => topic_summary.scale.speakers(d.id))
      .attr("r",topic_summary.scale.speakers.bandwidth()/2)
      .attr("stroke", d => scale.color(d.id))
      .attr("stroke-width", 2)
      .style("fill",d => "url(#pattern-" + d.id + ")")
      .style("box-shadow", d => "0px 0px 2px" + scale.color(d.id));

    // create bars in bar chart.
    speakerChart.selectAll(".speaker-chart-bar")
      .data(speakers)
      .enter()
      .append("rect")
      .attr("class","speaker-chart-bar")
      .attr("x", topic_summary.scale.x(0.1))
      .attr("width", d => topic_summary.scale.count(topic_counts[d.id]["total"]))
      .attr("y", d => topic_summary.scale.speakers(d.id))
      .attr("height", topic_summary.scale.speakers.bandwidth() * 0.75)
      .attr("fill", d => topic_counts[d.id]["total"] == undefined ? "gray" : "#35ad61")
      .on("mouseover", function(d){
        d3.select(this).attr("fill","#f17474");
      })
      .on("mouseout", function(d){
        let selected = d3.select(this).classed("selected");
        if(!selected){
          d3.select(this).attr("fill", "#35ad61");
        }
      })
      .on("click", function(d){
      });


    // create text labels for value of each bar in bar chart.
    speakerChart.selectAll(".speaker-chart-count")
      .data(speakers)
      .enter()
      .append("text")
      .attr("class","detail-label speaker-chart-count")
      .attr("x", d => topic_summary.scale.count.range()[0] + topic_summary.scale.count(topic_counts[d.id]["total"]))
      .attr("y", d => topic_summary.scale.speakers(d.id) + (topic_summary.scale.speakers.bandwidth() * 0.5))
      .text(d => topic_counts[d.id]["total"]);
}

function bipartiteGraph(data){
  let speakers = data.speakers.filter(d => !d.is_moderator).sort((a,b) => b.total_utterances - a.total_utterances);
  console.log(speakers);
  let speakersScale = d3.scaleBand().domain(speakers.map(d => d.id)).range([topic_summary.margin.top,topic_summary.height - topic_summary.margin.bottom]).paddingOuter(0.4);
  let sizeScale = d3.scaleLinear().domain([1,10]).range([speakersScale.bandwidth() / 6,speakersScale.bandwidth() / 2]);
  let speakerSize = sizeScale(speakers.length);
  //speakers.length > 6 ? speakersScale.bandwidth() / 2 : speakersScale.bandwidth() / 3

  let topics = data.topics.sort((a,b) => b.indices.length - a.indices.length);
  let topicsScale = d3.scaleBand().domain(topics.map(d => d.id)).range([topic_summary.margin.top + 50,topic_summary.height - topic_summary.margin.bottom - 50]).paddingOuter(1.0);

  let line = d3.line().x((d,i) => d.x + (2 * i) + Math.random() * 2).y((d,i) => d.y + (2 * i) + Math.random() * 2);

  for(i in speakers){
    speaker = speakers[i];
    for(j in topics){
      topic = topics[j];
      d3.select("#topics-g")
        .append("path")
        .data([{"speaker": speaker, "topic": topic, "mentions": data.topic_speaker_matrix[speaker.id][topic.id]}])//data.topic_speaker_matrix[speaker.id][topic.id]])
        .attr("class", d => "interaction-path interaction-source-" + d.speaker.id + " interaction-target-" + d.topic.id)
        .attr("d", function(d){
          return line([{"x": topic_summary.scale.x(0.2), "y": speakersScale(d.speaker.id)},{"x": topic_summary.scale.x(0.7), "y": topicsScale(d.topic.id)}]);
        })
        .attr("stroke","gray")
        .attr("stroke-width", function(d){
          return 2 * d.mentions.length;
        })
        .on("mouseover", function(d){
          let tooltip = d3.select("#edge-tooltip").style("visibility", "visible");
          tooltip.select("text").text(d.mentions.length + " mentions of " + d.topic.label + " from " + d.speaker.last_name);
          tooltip.select("ul").selectAll("li").remove();
          tooltip.select("ul").selectAll("li").data(d.mentions).enter().append("li").text(d => d.statement).exit().remove();
          d3.selectAll(".source-speaker.speaker-" + d.speaker.id).attr("stroke","black");
          d3.selectAll(".target-speaker.speaker-" + d.topic.ic).attr("stroke","black");
          d3.select(this).attr("stroke","black");
        })
        .on("mousemove", function(){
          return d3.select("#edge-tooltip").style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
        })
        .on("mouseout", function(){
          // d3.selectAll(".source-speaker.speaker-" + source.id).attr("stroke","gray");
          // d3.selectAll(".target-speaker.speaker-" + target.id).attr("stroke","gray");
          d3.select(this).attr("stroke","gray");
          return d3.select("#edge-tooltip").style("visibility", "hidden");
        });
    }
  }

  d3.select("#topics-g").selectAll(".source-speaker")
    .data(speakers)
    .enter()
    .append("circle")
    .attr("class",d => "source-speaker speaker-" + d.id)
    .attr("cx", topic_summary.scale.x(0.2))
    .attr("cy",d => speakersScale(d.id))
    .attr("r", speakerSize)
    .attr("stroke", "gray")//d => scale.color(d.id))
    .attr("stroke-width", 3)
    .style("fill",d => "url(#pattern-" + d.id + ")")
    .on("mouseover", function(d){
      d3.select(this).attr("stroke","black");
      d3.selectAll(".interaction-source-" + d.id).attr("stroke","black");
      showSpeakerTooltip(d);
    })
  	.on("mousemove", function(d){
      return d3.select("#speaker-tooltip").style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
    })
  	.on("mouseout", function(d){
      d3.select(this).attr("stroke","gray");
      d3.selectAll(".interaction-source-" + d.id).attr("stroke","gray");
      return d3.select("#speaker-tooltip").style("visibility", "hidden");
    });
  //  .style("box-shadow", d => "0px 0px 2px" + scale.color(d.id));

  d3.select("#topics-g").selectAll(".topic")
    .data(topics)
    .enter()
    .append("text")
    .attr("class",d => "topic topic-" + d.id)
    .attr("x", topic_summary.scale.x(0.7))
    .attr("y",d => topicsScale(d.id))
    .text(d => d.label)
    .on("mouseover", function(d){
      d3.select(this).style("font-weight","bold");
      d3.selectAll(".interaction-target-" + d.id).attr("stroke","black");
      showTopicTooltip(d);
    })
  	.on("mousemove", function(d){
      return d3.select("#topic-tooltip").style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
    })
  	.on("mouseout", function(d){
      d3.select(this).style("font-weight","normal");
      d3.selectAll(".interaction-target-" + d.id).attr("stroke","gray");
      return d3.select("#topic-tooltip").style("visibility", "hidden");
    });
}

function addTopicChart(data){
    let topics = data.topics.slice().map(d => d.id);
    counts = data.topic_speaker_matrix;
    // First sort speakers by their total number of utterances.

    topics.sort((a,b) => counts["total"][b] - counts["total"][a]);

    // create g to hold topic detail bar chart.
    let topicChart = d3.select("#topics-g");

    let minBandwidth = 20;

    // we don't want to include the moderator because they speak disproportionately more than the rest of the speakers.
    topic_summary.scale.topics.domain(topics);
    topic_summary.scale.topics.range([topic_summary.scale.y(0.5),topic_summary.scale.y(0.8)]);

    topic_summary.axis.topics.scale(topic_summary.scale.topics);

    // calculate maximum count out of all speakers. List is sorted so first entry has the most utterances.
    let max = counts["total"][topics[0]];
    topic_summary.scale.count.domain([0, max]);
    topic_summary.scale.count.range([topic_summary.scale.x(0.1),topic_summary.scale.x(0.5)]);
    // create header text.
    topicChart.append("text")
      .attr("id", "topic-detail-label")
      .style("font-size","7pt")
  //    .text("Who spoke the most?");

    // create left speaker axis for bar chart.
    topicChart.append("g").attr("transform","translate(" + topic_summary.scale.count.range()[0] + ",0)").attr("id","topic-chart-axis").call(topic_summary.axis.topics);

    topicChart.append("text")
      .attr("transform","translate(" + topic_summary.scale.count.range()[0] + ",-5)")
      .style("font-size","8pt")
      .style("fill","black")
  //    .text("Count");

    // create bars in bar chart.
    topicChart.append("g").attr("id","topic-chart").selectAll(".topic-chart-bar")
      .data(topics)
      .enter()
      .append("rect")
      .attr("class","topic-chart-bar")
      .attr("x", topic_summary.scale.count(0))
      .attr("width", d => topic_summary.scale.count(counts["total"][d]))
      .attr("y", d => topic_summary.scale.topics(d))
      .attr("height", topic_summary.scale.topics.bandwidth() * 0.75)
      .attr("fill", d => counts["total"][d] == undefined ? "gray" : "#35ad61")
      .on("mouseover", function(d){
        d3.select(this).attr("fill","#f17474");
      })
      .on("mouseout", function(d){
        let selected = d3.select(this).classed("selected");
        if(!selected){
          d3.select(this).attr("fill", "#35ad61");
        }
      })
      .on("click", function(d){
      });


    // create text labels for value of each bar in bar chart.
    topicChart.selectAll(".topic-count")
      .data(topics)
      .enter()
      .append("text")
      .attr("class","detail-label topic-count")
      .attr("x", d => topic_summary.scale.count.range()[0] + topic_summary.scale.count(counts["total"][d]))
      .attr("y", d => topic_summary.scale.topics(d) + (topic_summary.scale.topics.bandwidth() * 0.5))
      .text(d => counts["total"][d]);
  }


function clearTopicSummary(){
  d3.selectAll("#vis-container > svg").remove();
}
