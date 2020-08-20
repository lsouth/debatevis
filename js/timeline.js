timeline = {
  "scale": {
    "topics": d3.scaleBand(),
    "y": d3.scaleLinear(),
  },
  "axis": {
    "topics": d3.axisTop()
  },
  "margin":{
    "top": 120,"bottom": 100,"left": 0,"right":0
  },
  "width" : 0
}

function drawTimeline(data){
  timeline.width = $("#timeline-container").width();
  timeline.height = window.innerHeight;
  timeline.scale.y.domain([0,data.lines.length]);
  timeline.scale.y.range([timeline.margin.top, timeline.height - timeline.margin.bottom]);
  let topics = data.topics.map(d => d.label);
  topics.unshift("interactions");
  for(i in data.audience){
    topics.unshift(data.audience[i])
  }
  // Add interactions to topic list.
  timeline.scale.topics.domain(topics).range([timeline.margin.left,timeline.width - timeline.margin.right]).paddingOuter(0.5)

  timeline.axis.topics.scale(timeline.scale.topics)
  let svg = d3.select("#timeline-container").append("svg").attr("easypz",'{"applyTransformTo": "svg > *","options": { "minScale": 1, "maxScale": 10, "bounds": { "top": 0, "right": 0, "bottom": 0, "left": 0 }, "friction": 0.5}}').attr("id","timeline-svg").attr("width",timeline.width).attr("height",timeline.height);

//  svg.append("g").attr("id","topic-axis").attr("transform","translate(" + timeline.margin.left + "," + timeline.margin.top + ")").call(timeline.axis.topics);
//  d3.select("#topic-axis").selectAll("text").attr("transform","rotate(-70)").style("text-anchor","start");
svg.append("g").attr("id","topic-backgrounds")
  .selectAll(".topic-background")
  .data(data.topics)
  .enter()
  .append("rect")
  .attr("class",topic => "topic-background topic-background-" + topic.label)
  .attr("x",topic => timeline.scale.topics(topic.label))
  .attr("y", topic => timeline.scale.y(topic.indices[0]))
  .attr("width", timeline.scale.topics.bandwidth())
  .attr("height", function(topic){
    first = timeline.scale.y(topic.indices[0]);
    last = timeline.scale.y(topic.indices[topic.indices.length - 1]);
    return last-first;
  })
  .attr("fill","none")
  .style("opacity","0.5")

  svg.append("g").attr("id","statements");
  let encountered_topics = [];
  d3.select("#statements").selectAll(".statement")
    .data(data.lines)
    .enter()
    .append("g")
    .attr("transform",d => "translate(0," + timeline.scale.y(d.index) + ")")
    .attr("id", d => "statement-" + d.index)
    .append("rect")
    // .attr("x", timeline.scale.topics("interactions"))
    .attr("x", timeline.scale.topics(data.topics[0].label))
    .attr("width", function(d){
      for(topic in d.topics){
        if(!encountered_topics.includes(topic)){
          encountered_topics.unshift(topic);
        }
      }
      return timeline.scale.topics.bandwidth() * encountered_topics.length;
    })
    .attr("height", timeline.scale.y(2) - timeline.scale.y(0))
    .attr("fill","none")
    .style("opacity","0.3");

  svg.append("g").attr("id","topic-labels");
  d3.select("#topic-labels")
    .selectAll(".audience-action-label")
    .data(data.audience)
    .enter()
    .append("g")
    .attr("transform",function(audience_action){
      x = timeline.scale.topics(audience_action) + 0.75 * timeline.scale.topics.bandwidth() ;
      y = timeline.scale.y.range()[0];
      return "translate(" + x + "," + y + ")";
    })
    .append("text")
    .attr("class", audience_action =>"audience-action-label audience-action-label-" + audience_action)
    .text(audience_action => audience_action)
    .attr("transform","rotate(-90)")

  d3.select("#topic-labels")
    .selectAll(".topic-label")
    .data(data.topics)
    .enter()
    .append("g")
    .attr("transform",function(topic){
      x = timeline.scale.topics(topic.label) + 0.75 * timeline.scale.topics.bandwidth() ;
      y = timeline.scale.y(topic.indices[0]);
      return "translate(" + x + "," + y + ")";
    })
    .append("text")
    .attr("class", topic =>"topic-label topic-label-" + topic.label)
    .text(topic => topic.label)
    .attr("transform","rotate(-90)")
    .on("click", function(topic){
      if(current_index >= topic.indices[topic.indices.length-1]){
  //      updateScroll(current_index, topic.indices[0]);
        current_index = topic.indices[0];
        scrollToElement(topic.indices[0]);
      }
      else{
        for(i in topic.indices){
          topic_index = topic.indices[i];
          if(topic_index > current_index){
    //        updateScroll(current_index, topic_index);
            current_index = topic_index;
            scrollToElement(topic_index);
            break;
          }
        }
     }
    });

  drawInteractions(data.interactions);
  for(i in data.lines){
    drawStatement(data.lines[i]);
  }
}

function drawInteractions(interactions){
  let interactions_g = d3.select("#timeline-svg").append("g").attr("id","timeline-interactions");
  let offset = 0;
  let jitterWidth = 10;
  interactions_g.selectAll(".timeline-interaction")
    .data(interactions)
    .enter()
    .append("g")
    .attr("id",d => "statement-mentions-" + d.statement_index)
    .attr("transform", function(d){
      x = timeline.scale.topics("interactions") + timeline.scale.topics.bandwidth() / 4 - Math.random() * 0;
      y = timeline.scale.y(d.statement_index) - Math.random() * jitterWidth;
      return "translate(" + x + "," + y + ")";
    })
    .on("mouseover", function (d) {

    })
    .on("click", function (d) {
  //    updateScroll(current_index, d.statement_index);
      scrollToElement(d.statement_index);
    });

    interactions.forEach(function(mention){
      let connection_length = timeline.scale.topics.bandwidth() / 3
      let jitter = Math.random() * 1;
      if(mention.classification == "agree"){
        d3.select("#statement-mentions-" + mention.statement_index)
          .append("text")
          .style("font-size","10pt")
          .text("+")
          .attr("x", -5)
          .attr("y", jitter)
      }
      d3.select("#statement-mentions-" + mention.statement_index)
        .append("circle")
        .attr("r","3")
        .attr("y", jitter)
        .attr("fill", d => scale.color(mention.source));

      d3.select("#statement-mentions-" + mention.statement_index)
        .append("line")
        .attr("x1",0)
        .attr("x2",connection_length)
        .attr("y1",jitter)
        .attr("y2", jitter + (0 * mention.sentence_polarity))
        .attr("stroke", "black");

      d3.select("#statement-mentions-" + mention.statement_index)
        .append("circle")
        .attr("cx", connection_length)
        .attr("cy", jitter + (0 * mention.sentence_polarity))
        .attr("r","3")
        .attr("fill", d => scale.color(mention.target));
    });
}

function drawStatement(statement){
  g = d3.select("#statement-" + statement.index);
  topics = Object.keys(statement.topics)
  let jitterWidth = 10;

  for(i in topics){
    topic = topics[i];
    g.selectAll(".statement-" + topic).data([{"index": statement.index, "topic": topic}])
      .enter()
      .append("rect")
      .attr("x", d => timeline.scale.topics(d.topic))
      .attr("width", timeline.scale.topics.bandwidth())
      .attr("height","2")
      .attr("class",d => "statement-" + d.index + " statement-" + d.topic)
      .attr("fill", d => scale.color(statement.speaker.id))//"gray")
      .on("mouseover", function(d){
        d3.selectAll(".statement-" + d.index).attr("stroke","#93c68d")
      })
      .on("mouseout", function(d){
        d3.selectAll(".statement-" + d.index).attr("stroke","none")
      })
      .on("click", function(d){
  //      updateScroll(current_index, d.index);
    //    current_index = d.index;
        scrollToElement(d.index);
      });
  }

  statement.audience_actions.forEach(function(aud){
    g.append("image")
      .attr("class", "interaction-" + aud)
      .attr('width', timeline.scale.topics.bandwidth() * 0.6)
      .attr("x", timeline.scale.topics(aud) + timeline.scale.topics.bandwidth() * 0.2)
      .attr("href", "icons/" + aud + ".svg")
      .on("click", function(){
        scrollToElement(statement.index);
      })
      .append("svg:title","Audience reaction: " + aud);
  })


}

function clearTimeline(){
  $("#timeline-svg").remove();
}
