transcript = {
  "scale": {
    "color": d3.scaleOrdinal(d3.schemeCategory10),
  },
  "axis": {
  },
  "margin":{
    "top": 20,"bottom": 10,"left": 20,"right":20
  },
  "width": 0,
}

function addTranscript(data){
  transcript.width = $("#transcript-container").width()
//  let svg = d3.select("#transcript-container").append("svg", transcript.width);
  d3.select("#transcript-container").selectAll(".statement")
    .data(data.lines)
    .enter()
    .append("div")
    .attr("class","statement")
    .attr("id",d => "transcript-" + d.index);

    addStatementDetails(data);
  d3.graphScroll()
            .sections(d3.selectAll(".statement"))
            .on('active', function(i){
              sessionStorage.setItem("index",i);
              updateScroll(current_index, i);
              current_index = i;
            });
}

function addTopicTags(statement){
  let div = d3.select("#transcript-" + statement.index).append("div");
  let topics = Object.keys(statement.topics);
  for (i in topics){
    topic = topics[i]
    div.datum(topic).append("text")
        .attr("class","topic-tag topic-tag-" + topic)
        .text(topic.replace("-"," "))
        .on("mouseover", function(topic){
          if(!selectedTopics.includes(topic)){
            selectedTopics.push(topic);
            addTopicHighlight(topic);
            selectedTopics.pop();
          }
        })
        .on("mouseout", function(topic){
          if(!selectedTopics.includes(topic)){
            removeTopicHighlight(topic);
          }
        })
        .on("click", function(topic){
          if(selectedTopics.includes(topic)){
            selectedTopics.splice(selectedTopics.indexOf(topic));
            removeTopicHighlight(topic);
          }
          else{
            selectedTopics.push(topic);
            addTopicHighlight(topic);
          }
        });
  }
}

function addSpeakerImage(statement){
  let div = d3.select("#transcript-" + statement.index);
  div.append("img")
    .attr("src","headshots/"+ (statement.speaker.is_moderator ? "moderator" : statement.speaker.id) + ".png")
    .attr("class","headshot");
}

function addStatementText(data,statement){
  let div = d3.select("#transcript-" + statement.index)//.append("div");
  div.append("text")
    .attr("class","transcript-text")
    .text(statement.speaker.last_name.toUpperCase() + ":" + statement.text);

  let text = document.getElementById("transcript-" + statement.index).innerHTML;
  let topics = Object.keys(statement.topics);
  if(!statement.speaker.is_moderator){
    for(i in data.speakers){
      speaker = data.speakers[i];
      if(!speaker.is_moderator){
        text = text.replace(speaker.first_name, "<span style=\"text-shadow: 0px 0px 2px " + scale.color(speaker.id) + "\">" + speaker.first_name + "</span>")
        text = text.replace(speaker.last_name, "<span style=\"text-shadow: 0px 0px 2px " + scale.color(speaker.id) + "\">" + speaker.last_name + "</span>")
      }
    }
  }
  for(i in topics){
    topic = topics[i];
    for(j in statement.topics[topic]){
      keyword = statement.topics[topic][j];
      let re = new RegExp(keyword, "g");
      text = text.replace(re, "<span style=\"background-color: white;\" class=\"keyword-" + topic + "\">" + keyword + "</span>");
    }
  }
  document.getElementById("transcript-" + statement.index).innerHTML = text;
}

function addSpeakerInteractions(statement){
  let div = d3.select("#transcript-" + statement.index)
  for(i in statement.mentions){
    mention = statement.mentions[i];
    mention_div = div.append("div").attr("class","interaction-container");

    mention_div.append("img")
      .attr("src","headshots/"+ mention.source + ".png")
      .attr("class","headshot")
      .style("box-shadow", "0 0 0 2px" + scale.color(mention.source));

    mention_div.append("img")
      .attr("src","icons/" + mention.classification + ".png")
      .attr("class","interaction-icon")

    mention_div.append("img")
      .attr("src","headshots/"+ mention.target + ".png")
      .attr("class","headshot")
      .style("box-shadow", "0 0 0 2px" + scale.color(mention.target));
    statement_type = mention_div.append("div").append("text").attr("class","statement-type");
    if(mention.classification == "attack"){
      statement_type.text("We think this is an attack.")
    }
    if(mention.classification == "agree"){
      statement_type.text("We think this is an agreement.")
    }
    if(mention.classification == "neutral"){
      statement_type.text("We could not classify this interaction as an attack or an agreement.")
    }
  }
}

function addStatementDetails(data){
  for(i in data.lines){
    let statement = data.lines[i];
    addSpeakerImage(statement);
    addStatementText(data,statement);
    addTopicTags(statement);
    addSpeakerInteractions(statement);
  }
}

function addTopicHighlight(topic){
  color = scale.topic_colors(selectedTopics.length);
  d3.selectAll(".topic-background-" + topic).attr("fill",color);
  d3.selectAll(".topic-tag-" + topic).style("border","2px solid").style("background-color",color);
  d3.selectAll(".keyword-" + topic).style("background-color",color);
}

function removeTopicHighlight(topic){
  d3.selectAll(".topic-background-" + topic).attr("fill","none");
  d3.selectAll(".topic-tag-" + topic).style("border","1px solid").style("background-color","white");
  d3.selectAll(".keyword-" + topic).style("background-color","white");
}

function clearTranscript(){
  $(".statement").remove();
}
