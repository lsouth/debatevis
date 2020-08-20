interactions = {
  "scale": {
    "speakers": d3.scaleBand(),
    "speakerSize": d3.scaleLinear().range([5,5]),
    "x": d3.scaleLinear().domain([0,1])
  },
  "axis": {
  },
  "margin":{
    "top": 20,"bottom": 80,"left": 30,"right":20,
  },
  "width" : 0,
  "height" : 0,
}

svg = null

function getSpeakerXLocation(speaker){
  interactions.scale.speakers.range([0,2 * Math.PI]);
  return 200 * Math.cos(interactions.scale.speakers(speaker)) + interactions.width / 2
}

function getSpeakerYLocation(speaker){
  interactions.scale.speakers.range([0,2 * Math.PI]);
  return 200 * Math.sin(interactions.scale.speakers(speaker)) + interactions.height * 0.3
}

function drawSourceTargetConnections(data){
  speakers = data.speakers.filter(d => !d.is_moderator)
  sortedBySource = speakers.sort((a,b) => (b.source_count - a.source_count))
  let sourceScale = d3.scaleBand().domain(sortedBySource.map(d => d.id)).range([interactions.margin.top,interactions.height - interactions.margin.bottom]).paddingOuter(0.4);
  sortedByTarget = speakers.sort((a,b) => (b.target_count - a.target_count))
  let targetScale = d3.scaleBand().domain(sortedByTarget.map(d => d.id)).range([interactions.margin.top,interactions.height - interactions.margin.bottom]).paddingOuter(0.4);
  // Line generator for interactions between speakers, with random jitter to avoid overlap.
  // We draw the lines first so they appear behind the speaker pictures.
  line = d3.line().x((d,i) => d.x + (2 * i) + Math.random() * 2).y((d,i) => d.y + (2 * i) + Math.random() * 2);

  for(i in sortedBySource){
    source = sortedBySource[i];
    for(j in sortedByTarget){
      target = sortedByTarget[j];
      d3.select("#speakers-g")
        .append("path")
        .data([data.interactions_matrix[source.id][target.id]])
        .attr("class", "interaction-path interaction-source-" + source.id + " interaction-target-" + target.id)
        .attr("d", function(){
          return line([{"x": interactions.scale.x(0.2), "y": sourceScale(source.id)},{"x": interactions.scale.x(0.7), "y": targetScale(target.id)}]);
        })
        .attr("stroke","gray")
        .attr("stroke-width", function(d){
          return 2 * d.length;
        })
        .on("mouseover", function(d){
          let tooltip = d3.select("#edge-tooltip").style("visibility", "visible");
          source = data.speakers.filter(sp => sp.id == d[0].source)[0];
          target = data.speakers.filter(sp => sp.id == d[0].target)[0];
          interaction_list = data.interactions_matrix[source.id][target.id];
          tooltip.select("text").text(interaction_list.length + " mentions of " + target.last_name + " from " + source.last_name);
          tooltip.select("ul").selectAll("li").remove();
          tooltip.select("ul").selectAll("li").data(interaction_list).enter().append("li").text(d => d.sentence).exit().remove();
          d3.selectAll(".source-speaker.speaker-" + d.source).attr("stroke","black");
          d3.selectAll(".target-speaker.speaker-" + d.target).attr("stroke","black");
          d3.select(this).attr("stroke","black");
        })
      	.on("mousemove", function(){
          return d3.select("#edge-tooltip").style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
        })
      	.on("mouseout", function(d){
          console.log(d);
          d3.selectAll(".source-speaker.speaker-" + d.source).attr("stroke","gray");
          d3.selectAll(".target-speaker.speaker-" + d.target).attr("stroke","gray");
          d3.select(this).attr("stroke","gray");
          return d3.select("#edge-tooltip").style("visibility", "hidden");
        });
    }
  }

  // d3.select("#speakers-g").selectAll(".interaction-path")
  //   .data(data.interactions)
  //   .enter()
  //   .append("path")
  //   .attr("class",d => "interaction-path interaction-source-" + d.source + " interaction-target-" + d.target)
  //   .attr("d", function(d){
  //     return line([{"x": interactions.scale.x(0.2), "y": sourceScale(d.source)},{"x": interactions.scale.x(0.7), "y": targetScale(d.target)}]);
  //   })
  //   // .attr("stroke-width", function(d){
  //   //   return 2 * data.interactions_matrix[d.source][d.target].length;
  //   // })
  //   .attr("stroke","gray")//d => scale.color(d.source));
  //   .on("mouseover", function(d){
  //     let tooltip = d3.select("#interactions-tooltip").style("visibility", "visible");
  //     source = data.speakers.filter(sp => sp.id == d.source)[0];
  //     target = data.speakers.filter(sp => sp.id == d.target)[0];
  //     interaction_list = data.interactions_matrix[d.source][d.target];
  //     tooltip.select("text").text(interaction_list.length + " mentions of " + target.last_name + " from " + source.last_name);
  //     tooltip.select("ul").selectAll("li").remove();
  //     tooltip.select("ul").selectAll("li").data(interaction_list).enter().append("li").text(d => d.sentence).exit().remove();
  //     d3.selectAll(".source-speaker.speaker-" + d.source).attr("stroke","black");
  //     d3.selectAll(".target-speaker.speaker-" + d.target).attr("stroke","black");
  //     d3.select(this).attr("stroke","black");
  //   })
  // 	.on("mousemove", function(d){
  //     return d3.select("#interactions-tooltip").style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
  //   })
  // 	.on("mouseout", function(d){
  //     d3.selectAll(".source-speaker.speaker-" + d.source).attr("stroke","gray");
  //     d3.selectAll(".target-speaker.speaker-" + d.target).attr("stroke","gray");
  //     d3.select(this).attr("stroke","gray");
  //     return d3.select("#interactions-tooltip").style("visibility", "hidden");
  //   });

  speakerSize = sortedBySource.length > 6 ? sourceScale.bandwidth() / 2 : sourceScale.bandwidth() / 3

  d3.select("#speakers-g").selectAll(".source-speaker")
    .data(sortedBySource)
    .enter()
    .append("circle")
    .attr("class",d => "source-speaker speaker-" + d.id)
    .attr("cx", interactions.scale.x(0.2))
    .attr("cy",d => sourceScale(d.id))
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

  d3.select("#speakers-g").selectAll(".source-label")
      .data(sortedBySource)
      .enter()
      .append("text")
      .attr("class","source-label")
      .attr("x", interactions.scale.x(0.3))
      .attr("y",d => sourceScale(d.id))
      .text(d => d.source_count + " mentions of other candidates")
      .style("font-family","monospace");

  d3.select("#speakers-g").selectAll(".target-speaker")
    .data(sortedByTarget)
    .enter()
    .append("circle")
    .attr("class",d => "target-speaker speaker-" + d.id)
    .attr("cx", interactions.scale.x(0.7))
    .attr("cy",d => targetScale(d.id))
    .attr("r", speakerSize)
    .attr("stroke", "gray") // d => scale.color(d.id))
    .attr("stroke-width", 3)
    .style("fill",d => "url(#pattern-" + d.id + ")")
    .on("mouseover", function(d){
      d3.select(this).attr("stroke","black");
      d3.selectAll(".interaction-target-" + d.id).attr("stroke","black");
      showSpeakerTooltip(d);
    })
  	.on("mousemove", function(d){
      return d3.select("#speaker-tooltip").style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
    })
  	.on("mouseout", function(d){
      d3.select(this).attr("stroke","gray");
      d3.selectAll(".interaction-target-" + d.id).attr("stroke","gray");
      return d3.select("#speaker-tooltip").style("visibility", "hidden");
    });

  d3.select("#speakers-g").selectAll(".target-label")
      .data(sortedByTarget)
      .enter()
      .append("text")
      .attr("class","target-label")
      .attr("x", interactions.scale.x(0.6))
      .attr("y",d => targetScale(d.id))
      .text(d => d.target_count + " times mentioned")
      .style("font-family","monospace");
}

function drawInteractions(data){
  interactions.width = $("#vis-container").width();
  interactions.height = window.innerHeight;
  interactions.scale.x.range([interactions.margin.left,interactions.width - interactions.margin.right]);

  svg = d3.select("#vis-container").append("svg").attr("id","interactions-svg").attr("width",interactions.width).attr("height",interactions.height);
  svg.append("g").attr("id","speakers-g").attr("transform","translate(" + interactions.margin.left + "," + interactions.margin.top + ")")

  //let speakers = data.speakers.filter(d => !d.is_moderator)
  //interactions.scale.speakers.domain(speakers.map(d => d.id)).range([interactions.margin.top,interactions.height - interactions.margin.bottom]);
  drawSourceTargetConnections(data);
}

function clearInteractions(){
  d3.selectAll("#vis-container > svg").remove();
}

function addSpeakerHighlight(speaker){
  d3.selectAll(".speaker-" + speaker).attr("stroke","black");
}

function removeSpeakerHighlight(speaker){
  d3.selectAll(".speaker-" + speaker).attr("stroke","gray");
}
