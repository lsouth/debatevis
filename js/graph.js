graph = {
  "scale": {
    "speakers": d3.scaleBand(),
    "speakerSize": d3.scaleLinear().range([5,5]),
    "x": d3.scaleLinear().domain([0,1])
  },
  "axis": {
  },
  "margin":{
    "top": 100,"bottom": 20,"left": 10,"right":20,
  },
  "width" : 0,
  "height" : 0,
}

svg = null

function getSpeakerXLocation(speaker){
  graph.scale.speakers.range([0,2 * Math.PI]);
  return 200 * Math.cos(graph.scale.speakers(speaker)) + graph.width / 2
}

function getSpeakerYLocation(speaker){
  graph.scale.speakers.range([0,2 * Math.PI]);
  return 200 * Math.sin(graph.scale.speakers(speaker)) + graph.height * 0.3
}

function addSourceHighlight(source){
//  d3.selectAll(".source-speaker.speaker-" + source.id).attr("stroke","black");
  d3.selectAll(".interaction-path").attr("stroke-opacity", 0.2);
  d3.selectAll(".interaction-source-" + source.id).attr("stroke-opacity", 1);
}

function removeSourceHighlight(source){
//  d3.selectAll(".source-speaker.speaker-" + source.id).attr("stroke","gray");
  d3.selectAll(".interaction-path").attr("stroke-opacity", 1);
//  d3.selectAll(".interaction-source-" + source.id).attr("stroke","gray")
}

function addTargetHighlight(target){
//  d3.selectAll(".target-speaker.target-" + target.id).attr("stroke","black");
  d3.selectAll(".interaction-path").attr("stroke-opacity", 0.2);
  d3.selectAll(".target-topic.target-" + target.id).attr("font-weight","bold");
  d3.selectAll(".interaction-target-" + target.id).attr("stroke-opacity", 1);
}

function removeTargetHighlight(target){
  //d3.selectAll(".target-speaker.target-" + target.id).attr("stroke","gray");
  d3.selectAll(".interaction-path").attr("stroke-opacity", 1);
  d3.selectAll(".target-topic.target-" + target.id).attr("font-weight","normal");
//  d3.selectAll(".interaction-target-" + target.id).attr("stroke","gray");
}

function sankey(data){
  let nodes = data.speakers;
  let links = data.interactions_matrix
  let sankey = d3.sankey().nodes(nodes).links(links);

  // add in the links
  var link = d3.select("#speakers-g").append("g")
    .selectAll(".link")
    .data(links)
    .enter()
    .append("path")
      .attr("class", "link")
      .attr("d", sankey.link())
      .style("stroke-width", function(d) { return Math.max(1, d.dy); })
      .sort(function(a, b) { return b.dy - a.dy; });

  var node = svg.append("g")
    .selectAll(".node")
    .data(nodes)
    .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .call(d3.drag()
        .subject(function(d) { return d; })
        .on("start", function() { this.parentNode.appendChild(this); })
        .on("drag", dragmove));
}

function bipartiteGraph(data, source_type, target_type){
  speakers = data.speakers.filter(d => !d.is_moderator);
  sortedBySource = speakers.sort((a,b) => (b.total_utterances - a.total_utterances));
  // let sourceScale = d3.scaleBand().domain(sortedBySource.map(d => d.id)).range([graph.margin.top,graph.height - graph.margin.bottom]).paddingOuter(0);
  let sourceScale = d3.scaleBand().domain(sortedBySource.map(d => d.id)).range([50,graph.height]).paddingOuter(0.5);
  // let targetScale = d3.scaleBand().range([graph.margin.top,graph.height - graph.margin.bottom]).paddingOuter(0);
  let targetScale = d3.scaleBand().range([50,graph.height]).paddingOuter(0.5);
  let maxMatrixValue = 5;
  if(target_type == "speakers"){
    sortedByTarget = speakers.sort((a,b) => b.target_count - a.target_count)
    targetScale.domain(sortedByTarget.map(d => d.id));
    let maxMatrixValue = sortedByTarget[0].target_count;
  }
  else{
    sortedByTarget = data.topics.sort((a,b) => b.indices.length - a.indices.length);
    targetScale.domain(sortedByTarget.map(d => d.id));
    let maxMatrixValue = sortedByTarget[0].indices.length;
  }

  d3.select("#speakers-g").append("g").attr("id","label-g");

  defs = svg.append("defs")

  defs.append("marker")
      .attr("id","arrow")
      .attr("viewBox","0 -5 10 10")
      .attr("refX",5)
      .attr("refY",0)
      .attr("markerWidth",4)
      .attr("markerHeight",4)
      .attr("orient","auto")
      .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("class","arrowHead");

  d3.select("#label-g").append("line")
    .attr("id","directionality-arrow")
    .attr("marker-end","url(#arrow)")
    .attr("x1", graph.scale.x(0.3))
    .attr("x2", graph.scale.x(0.6))
    .attr("y1", sourceScale.range()[0])
    .attr("y2", sourceScale.range()[0])
    .attr("stroke","black")

  d3.select("#label-g").append("line")
    .attr("id","source-sorting-arrow")
    .attr("marker-end","url(#arrow)")
    .attr("x1", graph.scale.x(0))
    .attr("x2", graph.scale.x(0))
    .attr("y2", sourceScale.range()[0] + 50)
    .attr("y1", sourceScale(speakers.sort((a,b) => a.total_utterances - b.total_utterances)[0].id))
    .attr("stroke","black");

  d3.select("#label-g")
    .append("text")
    .attr("transform","translate(" + graph.scale.x(0.45) +"," + (sourceScale.range()[0] - 10) + ")")
    .style("text-anchor","middle")
    .text("Mentions");

  d3.select("#label-g")
    .append("text")
    .attr("transform","translate(7," + (targetScale.range()[1] - targetScale.range()[0]) / 2 + ") rotate(270)")
    .style("text-anchor","middle")
    .text("More total utterances");

  let rightArrowLoc = target_type == "speakers" ? 0.82 : 0.98;
  let rightTextLoc = target_type == "speakers" ? 0.84 : 1;
  console.log(rightArrowLoc);

  d3.select("#label-g")
    .append("text")
    .attr("transform","translate(" + graph.scale.x(rightArrowLoc) + "," + (targetScale.range()[1] - targetScale.range()[0]) / 2 + ") rotate(270)")
    .style("text-anchor","middle")
    .text("More frequently mentioned");

  console.log(sortedBySource);
  console.log(sortedByTarget);

  d3.select("#label-g").append("line")
    .attr("id","target-sorting-arrow")
    .attr("marker-end","url(#arrow)")
    .attr("x1", graph.scale.x(rightTextLoc))
    .attr("x2", graph.scale.x(rightTextLoc))
    .attr("y2", targetScale.range()[0] + 50)
    .attr("y1", sourceScale(speakers.sort((a,b) => a.total_utterances - b.total_utterances)[0].id))
    .attr("stroke","black");

  let matrix = (target_type == "speakers" ? data.interactions_matrix : data.topic_speaker_matrix);

  // Line generator for graph between speakers, with random jitter to avoid overlap.
  // We draw the lines first so they appear behind the speaker pictures.
  line = d3.line().x((d,i) => d.x).y((d,i) => d.y).curve(d3.curveBasis);
  d3.select("#speakers-g").append("g").attr("id","edges");

  let edgeThicknessScale = d3.scaleLinear().domain([0, maxMatrixValue]).range([0,20]);
  let targetUtteranceCounts = [];
  targetOffsets = [];
  sortedByTarget.forEach(function(t){
    targetUtteranceCounts.push(0);
    targetOffsets.push(0);
  })
  for(i in sortedBySource){
    source = sortedBySource[i];
    let source_offset = 0;
    let sourceUtteranceCount = 0;
    let withinCircleScale = d3.scaleLinear()
      .domain([0, sortedBySource[0].total_utterances])
      .range([- sourceScale.bandwidth() / 4,sourceScale.bandwidth() / 4]);
    for(j in sortedByTarget){
      target = sortedByTarget[j];
      let target_offset = 0;
      d3.select("#speakers-g").select("#edges")
        .append("path")
        .data([{"source": source, "target": target}])
        .attr("class", d => "interaction-path interaction-source-" + d.source.id + " interaction-target-" + d.target.id)
        .attr("d", function(d){
          return line([{"x": graph.scale.x(0.1), "y": sourceScale(d.source.id)},// + withinCircleScale(sourceUtteranceCount) + source_offset},
                       {"x": graph.scale.x(0.3), "y": sourceScale(d.source.id)},// + withinCircleScale(sourceUtteranceCount) + source_offset},
                       {"x": graph.scale.x(0.5), "y": targetScale(d.target.id)},// + withinCircleScale(targetUtteranceCounts[j]) + targetOffsets[j]},
                       {"x": graph.scale.x(0.7), "y": targetScale(d.target.id)}// + withinCircleScale(targetUtteranceCounts[j]) + targetOffsets[j]}
                     ]);
          // return line([{"x": graph.scale.x(0.3), "y": sourceScale(d.source.id) + previous_y},
          //              {"x": graph.scale.x(0.4), "y": sourceScale(d.source.id) + previous_y},
          //              {"x": graph.scale.x(0.6), "y": targetScale(d.target.id)},
          //              {"x": graph.scale.x(0.7), "y": targetScale(d.target.id)}
          //            ]);
        })
        .attr("stroke",d => scale.color(source.id))
        .attr("fill","none")
        .attr("stroke-width", function(d){
          sourceUtteranceCount += matrix[d.source.id][d.target.id].length;
          source_offset += edgeThicknessScale(matrix[d.source.id][d.target.id].length) / 2;

          targetUtteranceCounts[j] += matrix[d.source.id][d.target.id].length;
          targetOffsets[j] += edgeThicknessScale(matrix[d.source.id][d.target.id].length) / 2;

          return edgeThicknessScale(matrix[d.source.id][d.target.id].length);
        })
        .on("mouseover", function(d){
          let tooltip = d3.select("#edge-tooltip").style("visibility", "visible");
          // source = data.speakers.filter(sp => sp.id == d[0].source)[0];
          // target = data.topics.filter(t => t.id == d[0].target)[0];
          items = matrix[d.source.id][d.target.id];
          // items = items.filter(d => d != "");
          tooltip.select("text").text(items.length + " mention" + (items.length == 1 ? "" : "s") + " of " + (target_type == "speakers" ? d.target.last_name : d.target.label) + " from " + d.source.last_name);
          // tooltip.select("ul").selectAll("li").remove();
          // tooltip.select("ul").selectAll("li").data(items).enter().append("li").text(d => d.sentence).exit().remove();
      //    d3.select(".speaker-" + d.source.id).classed("active",true);
      //    d3.select(".target-" + d.target.id).classed("active",true);
          d3.selectAll(".interaction-path").attr("stroke-opacity", 0.2);
          d3.select(this).attr("stroke-opacity", 1);
        })
      	.on("mousemove", function(){
          return d3.select("#edge-tooltip").style("top", (event.pageY+50)+"px").style("left",(event.pageX+0)+"px");
        })
      	.on("mouseout", function(d){
          removeSourceHighlight(d.source);
          removeTargetHighlight(d.target);
    //      d3.select(this).attr("stroke","gray");
          d3.selectAll(".interaction-path").attr("stroke-opacity", 1);
          d3.select(".speaker-" + d.source.id).classed("active",false);
          d3.select(".target-" + d.target.id).classed("active",false);

          return d3.select("#edge-tooltip").style("visibility", "hidden");
        })
        .on("click", function(d){
          // jump to next mention in transcript
          foundNext = false;
          for(i in matrix[d.source.id][d.target.id]){
            next_index = matrix[d.source.id][d.target.id][i].statement_index;
            if(current_index < next_index){
              scrollToElement(next_index);
              foundNext = true;
              break;
            }
          }
          if(!foundNext){
            // Scroll back to first.
              scrollToElement(matrix[d.source.id][d.target.id][0].statement_index);
          }
        });
    }
  }

  // speakerSize = sortedBySource.length > 6 ? sourceScale.bandwidth() / 2 : sourceScale.bandwidth() / 3
  // if (sortedBySource.length < 4){
  //   speakerSize = sourceScale.bandwidth() / 6;
  // }

  speakerSize = d3.scaleLinear().domain([1,12]).range([sourceScale.bandwidth() * 0.25, sourceScale.bandwidth() * 0.7]);

  //d3.select("#speakers-g").append("text").attr("x", graph.scale.x(0.15)).attr("y", sourceScale.range()[0]).text("Speakers")
  d3.select("#speakers-g").append("g").attr("id","sources").selectAll(".source")
    .data(sortedBySource)
    .enter()
    .append("circle")
    .attr("class",d => "source-speaker speaker-" + d.id)
    .attr("cx", graph.scale.x(0.1))
    .attr("cy",d => sourceScale(d.id))
    .attr("r", speakerSize(sortedBySource.length))
    .attr("stroke", d => scale.color(d.id))//"gray")
    .attr("stroke-width", 3)
    .style("fill",d => "url(#pattern-" + d.id + ")")
    .on("mouseover", function(d){
      d3.select("#speaker-tooltip").style("visibility", "visible");
      addSourceHighlight(d);
      showSpeakerTooltip(d);
  //    d3.select(this).attr("stroke","black");
    })
  	.on("mousemove", function(d){
      return d3.select("#speaker-tooltip").style("top", (event.pageY+50)+"px").style("left",(event.pageX+0)+"px");
    })
  	.on("mouseout", function(d){
      removeSourceHighlight(d);
  //    d3.select(this).attr("stroke","gray");
      return d3.select("#speaker-tooltip").style("visibility", "hidden");
    });

  // d3.select("#speakers-g").append("text")
  //   .attr("x", graph.scale.x(0.65))
  //   .attr("y", sourceScale.range()[0])
  //   .text(target_type == "speakers" ? "Mentioned speakers" : "Topics");

  d3.select("#speakers-g").append("g").attr("id","targets").selectAll(".target")
    .data(sortedByTarget)
    .enter()
    .append(target_type == "speakers" ? "circle" : "text")
    .attr("class",d => "target target-" + d.id + (target_type == "speakers" ? " target-speaker" : " target-topic"))
    .on("mouseover", function(d){
      addTargetHighlight(d);
      if(target_type == "speakers"){
        showSpeakerTooltip(d);
      }
      else{
        showTopicTooltip(d, []);//d3.map(matrix));
      }
    })
  	.on("mousemove", function(d){
      if(target_type == "speakers"){
        d3.select("#speaker-tooltip").style("top",(event.pageY+50)+"px").style("left",(event.pageX+0)+"px");
      }
      else{
        d3.select("#topic-tooltip").style("top", (event.pageY+50)+"px").style("left",(event.pageX+0)+"px");
      }
    })
  	.on("mouseout", function(d){
      removeTargetHighlight(d);
      d3.select("#topic-tooltip").style("visibility", "hidden");
      d3.select("#speaker-tooltip").style("visibility", "hidden");
    });

  d3.selectAll(".target-topic")
    .attr("x", graph.scale.x(0.7))
    .attr("y",d => targetScale(d.id))
    .text(d => d.label);

  d3.selectAll(".target-speaker")
    .attr("cx", graph.scale.x(0.7))
    .attr("cy",d => targetScale(d.id))
    .attr("r", speakerSize(sortedBySource.length))
    .attr("stroke", d => scale.color(d.id))
    .attr("stroke-width", 3)
    .style("fill",d => "url(#pattern-" + d.id + ")");

  d3.select("#speakers-g").selectAll(".target-label")
      .data(sortedByTarget)
      .enter()
      .append("text")
      .attr("class","target-label")
      .attr("x", graph.scale.x(0.6))
      .attr("y",d => targetScale(d.id))
      .text(d => d.target_count + " times mentioned")
      .style("font-family","monospace");
}

function drawGraph(data, source_type, target_type){
  graph.width = $("#vis-container").width();
  graph.height = window.innerHeight - graph.margin.top - graph.margin.bottom;
  graph.scale.x.range([graph.margin.left,graph.width - graph.margin.right]);

  svg = d3.select("#vis-container").append("svg").attr("id","graph-svg").attr("width",graph.width).attr("height",graph.height);
  // svg.style("margin-top","50px");
  svg.attr("transform","translate(" + graph.margin.left + "," + graph.margin.top + ")");
  svg.append("g").attr("id","speakers-g")

  //let speakers = data.speakers.filter(d => !d.is_moderator)
  //graph.scale.speakers.domain(speakers.map(d => d.id)).range([graph.margin.top,graph.height - graph.margin.bottom]);
  bipartiteGraph(data, source_type, target_type);
//  sankey(data);
}

function clearGraph(){
  d3.selectAll("#vis-container > svg").remove();
}

function addSpeakerHighlight(speaker){
//  d3.selectAll(".speaker-" + speaker).attr("stroke","black");
}

function removeSpeakerHighlight(speaker){
//  d3.selectAll(".speaker-" + speaker).attr("stroke","gray");
}
