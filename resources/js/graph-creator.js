document.onload = (function(d3, saveAs, Blob, undefined) {
    "use strict";

    // TODO add user settings
    var consts = {
        defaultTitle: "random variable"
    };

    var settings = {
        appendElSpec: "#graph-editor-body",
        defaultGraphType: $("#default-graph-type li.selected").attr("data-value"),
        defaultNodeColor: $("#default-node-color").val(),
        defaultNodeSize: $("#default-node-size").val(),
        defaultNodeLabel: $("#default-node-label").val(),
        defaultNodeFontSize: $("#default-font-size").val(),
        defaultNodeFontColor: $("#default-font-color").val(),
        defaultEdgeColor: $("#default-edge-color").val()
    };
    // define graphcreator object
    var GraphCreator = function(svg, nodes, edges) {
        var thisGraph = this;
        thisGraph.idct = 0;

        thisGraph.nodes = nodes || [];
        thisGraph.edges = edges || [];

        thisGraph.state = {
            selectedNode: null,
            selectedEdge: null,
            mouseDownNode: null,
            mouseDownLink: null,
            justDragged: false,
            justScaleTransGraph: false,
            lastKeyDown: -1,
            shiftNodeDrag: false,
            selectedText: null,
            selectedNodes: [],
            selectedEdges: [],
        };

        // Create a map to track the keys pressed
        thisGraph.keyMap = {};

        // define arrow markers for graph links
        var defs = svg.append('svg:defs');
        defs.append('svg:marker')
            .attr('id', 'end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', "32")
            .attr('markerWidth', 3.5)
            .attr('markerHeight', 3.5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        // define arrow markers for leading arrow (dragging)
        defs.append('svg:marker')
            .attr('id', 'mark-end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 7)
            .attr('markerWidth', 3.5)
            .attr('markerHeight', 3.5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        thisGraph.svg = svg;
        thisGraph.svgG = svg.append("g").classed(thisGraph.consts.graphClass, true);
        var svgG = thisGraph.svgG;

        // displayed when dragging between nodes
        thisGraph.dragLine = svgG.append('svg:path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0')

        // Set the correct dragging edge
        thisGraph.setDraggingEdge(settings.defaultGraphType);

        // svg nodes and edges
        thisGraph.paths = svgG.append("g").selectAll("g");
        thisGraph.circles = svgG.append("g").selectAll("g");

        thisGraph.drag = d3.behavior.drag()
            .origin(function(d) {
                return { x: d.x, y: d.y };
            })
            .on("drag", function(args) {
                thisGraph.state.justDragged = true;
                thisGraph.dragmove.call(thisGraph, args);
            })
            .on("dragend", function() {
                // todo check if edge-mode is selected
            });

        // listen for key events
        d3.select(window).on("keydown", function() {
                thisGraph.svgKeyDown.call(thisGraph);
            })
            .on("keyup", function() {
                thisGraph.svgKeyUp.call(thisGraph);
            });
        svg.on("mousedown", function(d) { thisGraph.svgMouseDown.call(thisGraph, d); });
        svg.on("mouseup", function(d) { thisGraph.svgMouseUp.call(thisGraph, d); });

        // listen for dragging
        var dragSvg = d3.behavior.zoom()
            .on("zoom", function() {
                if (d3.event.sourceEvent.shiftKey) {
                    // TODO  the internal d3 state is still changing
                    return false;
                } else {
                    thisGraph.zoomed.call(thisGraph);
                }
                return true;
            })
            .on("zoomstart", function() {
                var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
                if (ael) {
                    ael.blur();
                }
                if (!d3.event.sourceEvent.shiftKey) d3.select('body').style("cursor", "move");
            })
            .on("zoomend", function() {
                d3.select('body').style("cursor", "auto");
            });

        svg.call(dragSvg).on("dblclick.zoom", null);

        // listen for resize
        window.onresize = function() { thisGraph.updateWindow(svg); };

        // handle download data
        // d3.select("#download-input").on("click", function() {
        //     var saveEdges = [];
        //     thisGraph.edges.forEach(function(val, i) {
        //         saveEdges.push({ source: val.source.id, target: val.target.id });
        //     });
        //     var blob = new Blob([window.JSON.stringify({ "nodes": thisGraph.nodes, "edges": saveEdges })], { type: "text/plain;charset=utf-8" });
        //     saveAs(blob, "mydag.json");
        // });


        // handle uploaded data
        // d3.select("#upload-input").on("click", function() {
        //     document.getElementById("hidden-file-upload").click();
        // });
        d3.select("#hidden-file-upload").on("change", function() {
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                var uploadFile = this.files[0];
                var filereader = new window.FileReader();

                filereader.onload = function() {
                    var txtRes = filereader.result;
                    // TODO better error handling
                    try {
                        var jsonObj = JSON.parse(txtRes);
                        thisGraph.deleteGraph(true);
                        thisGraph.nodes = jsonObj.nodes;
                        thisGraph.setIdCt(jsonObj.nodes.length + 1);
                        var newEdges = jsonObj.edges;
                        newEdges.forEach(function(e, i) {
                            newEdges[i] = {
                                source: thisGraph.nodes.filter(function(n) {
                                    return n.id == e.source;
                                })[0],
                                target: thisGraph.nodes.filter(function(n) {
                                    return n.id == e.target;
                                })[0]
                            };
                        });
                        thisGraph.edges = newEdges;
                        thisGraph.updateGraph();
                    } catch (err) {
                        window.alert("Error parsing uploaded file\nerror message: " + err.message);
                        return;
                    }
                };
                filereader.readAsText(uploadFile);

            } else {
                alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
            }


            // Reset the value of the file
            $("#hidden-file-upload").val("");
        });

        // handle delete graph
        d3.select("#delete-graph").on("click", function() {
            thisGraph.deleteGraph(false);
        });
    };

    GraphCreator.prototype.setIdCt = function(idct) {
        this.idct = idct;
    };

    GraphCreator.prototype.consts = {
        selectedClass: "selected",
        connectClass: "connect-node",
        circleGClass: "conceptG",
        graphClass: "graph",
        activeEditId: "active-editing",
        BACKSPACE_KEY: 8,
        DELETE_KEY: 46,
        ENTER_KEY: 13,
        SHIFT_KEY: 16,
        CONTROL_KEY: 17,
        A_KEY: 65,
        E_KEY: 69,
        F_KEY: 70,
        N_KEY: 78,
        S_KEY: 83,
        X_KEY: 88
            // nodeRadius: 50
    };

    /* PROTOTYPE FUNCTIONS */

    // Define the arrow when dragging
    GraphCreator.prototype.setDraggingEdge = function(graphType) {
        var thisGraph = this;

        // Set the color
        thisGraph.dragLine.style("stroke", settings.defaultEdgeColor);

        if (graphType === "directed") {
            thisGraph.dragLine.style('marker-end', 'url(#mark-end-arrow)');
        } else if (graphType === "undirected") {
            thisGraph.dragLine.style('marker-end', null);
        }
    }

    GraphCreator.prototype.dragmove = function(d) {
        var thisGraph = this;
        if (thisGraph.state.shiftNodeDrag) {
            thisGraph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(thisGraph.svgG.node())[0] + ',' + d3.mouse(this.svgG.node())[1]);
        } else {
            d.x += d3.event.dx;
            d.y += d3.event.dy;
            thisGraph.updateGraph();
        }
    };

    GraphCreator.prototype.deleteGraph = function(skipPrompt) {
        var thisGraph = this;
        thisGraph.nodes = [];
        thisGraph.edges = [];
        thisGraph.updateGraph();
    };

    /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
    GraphCreator.prototype.selectElementContents = function(el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    };


    /* insert svg line breaks: taken from http://stackoverflow.com/questions/13241475/how-do-i-include-newlines-in-labels-in-d3-charts */
    GraphCreator.prototype.insertTitleLinebreaks = function(gEl, title) {
        var words = title.split(/\s+/g),
            nwords = words.length;
        var el = gEl.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-" + (nwords - 1) * 7.5)
            .style("font-size", settings.defaultNodeFontSize + "px")
            .style("fill", settings.defaultNodeFontColor);

        for (var i = 0; i < words.length; i++) {
            var tspan = el.append('tspan').text(words[i]);
            if (i > 0)
                tspan.attr('x', 0).attr('dy', '15');
        }
    };


    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function(node) {
        var thisGraph = this,
            toSplice = thisGraph.edges.filter(function(l) {
                return (l.source === node || l.target === node);
            });
        toSplice.map(function(l) {
            thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
        });
    };

    GraphCreator.prototype.replaceSelectEdge = function(d3Path, edgeData) {
        var thisGraph = this;

        // Unselect any previously selected element
        thisGraph.unSelectAllEdges();
        thisGraph.unSelectAllNodes();

        d3Path.classed(thisGraph.consts.selectedClass, true);
        if (thisGraph.state.selectedEdge) {
            thisGraph.removeSelectFromEdge();
        }
        thisGraph.state.selectedEdge = edgeData;

        // Clear the selected edge array
        thisGraph.state.selectedEdges = [edgeData];
    };

    GraphCreator.prototype.replaceSelectNode = function(d3Node, nodeData) {
        var thisGraph = this;

        // Unselect any previously selected element
        thisGraph.unSelectAllEdges();
        thisGraph.unSelectAllNodes();

        d3Node.classed(this.consts.selectedClass, true);
        if (thisGraph.state.selectedNode) {
            thisGraph.removeSelectFromNode();
        }
        thisGraph.state.selectedNode = nodeData;

        // Clear the selected nodes array
        thisGraph.state.selectedNodes = [nodeData];
    };

    GraphCreator.prototype.removeSelectFromNode = function() {
        var thisGraph = this;
        thisGraph.circles.filter(function(cd) {
            return cd.id === thisGraph.state.selectedNode.id;
        }).classed(thisGraph.consts.selectedClass, false);
        thisGraph.state.selectedNode = null;
        thisGraph.state.selectedNodes = [];
        thisGraph.unSelectAllEdges();
        thisGraph.unSelectAllNodes();
    };

    GraphCreator.prototype.removeSelectFromEdge = function() {
        var thisGraph = this;
        thisGraph.paths.filter(function(cd) {
            return cd === thisGraph.state.selectedEdge;
        }).classed(thisGraph.consts.selectedClass, false);
        thisGraph.state.selectedEdge = null;
        thisGraph.state.selectedEdges = [];
        thisGraph.unSelectAllEdges();
        thisGraph.unSelectAllNodes();
    };

    GraphCreator.prototype.pathMouseDown = function(d3path, d) {
        var thisGraph = this,
            state = thisGraph.state;
        d3.event.stopPropagation();
        state.mouseDownLink = d;

        if (state.selectedNode) {
            thisGraph.removeSelectFromNode();
        }

        if (d3.event.shiftKey) {
            if (!d3path.classed(this.consts.selectedClass)) {
                // Mark the edge as selected
                d3path.classed(this.consts.selectedClass, true);

                // Add the edge to the selected edge array
                state.selectedEdges.push(d);
            } else {
                // Mark the edge as unselected
                d3path.classed(this.consts.selectedClass, false);

                // Remove the edge from the selected edge array
                state.selectedEdges.splice(state.selectedEdges.indexOf(d), 1);
            }
        } else {
            var prevEdge = state.selectedEdge;
            if (!prevEdge || prevEdge !== d) {
                thisGraph.replaceSelectEdge(d3path, d);
            } else {
                thisGraph.removeSelectFromEdge();
            }
        }
    };

    // mousedown on node
    GraphCreator.prototype.circleMouseDown = function(d3node, d) {
        var thisGraph = this,
            state = thisGraph.state;
        d3.event.stopPropagation();
        state.mouseDownNode = d;
        if (d3.event.ctrlKey) {
            state.shiftNodeDrag = d3.event.ctrlKey;
            // reposition dragged directed edge
            thisGraph.dragLine.classed('hidden', false)
                .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
            return;
        }
    };

    /* place editable text on node in place of svg text */
    GraphCreator.prototype.changeTextOfNode = function(d3node, d) {
        var thisGraph = this,
            consts = thisGraph.consts,
            htmlEl = d3node.node();
        d3node.selectAll("text").remove();
        var nodeBCR = htmlEl.getBoundingClientRect(),
            curScale = nodeBCR.width / settings.defaultNodeSize,
            placePad = 5 * curScale,
            useHW = curScale > 1 ? nodeBCR.width * 0.71 : settings.defaultNodeSize * 1.42;
        // replace with editableconent text
        var d3txt = thisGraph.svg.selectAll("foreignObject")
            .data([d])
            .enter()
            .append("foreignObject")
            .attr("x", nodeBCR.left + placePad)
            .attr("y", nodeBCR.top + placePad)
            .attr("height", 2 * useHW)
            .attr("width", useHW)
            .append("xhtml:p")
            .attr("id", consts.activeEditId)
            .attr("contentEditable", "true")
            .text(d.title)
            .style("font-size", "15px")
            .on("mousedown", function(d) {
                d3.event.stopPropagation();
            })
            .on("keydown", function(d) {
                d3.event.stopPropagation();
                if (d3.event.keyCode == consts.ENTER_KEY && !d3.event.ctrlKey) {
                    this.blur();
                }
            })
            .on("blur", function(d) {
                d.title = this.textContent;
                thisGraph.insertTitleLinebreaks(d3node, d.title);
                d3.select(this.parentElement).remove();
            });
        return d3txt;
    };

    // mouseup on nodes
    GraphCreator.prototype.circleMouseUp = function(d3node, d) {
        var thisGraph = this,
            state = thisGraph.state,
            consts = thisGraph.consts;
        // reset the states
        state.shiftNodeDrag = false;
        d3node.classed(consts.connectClass, false);

        var mouseDownNode = state.mouseDownNode;

        if (!mouseDownNode) return;

        thisGraph.dragLine.classed("hidden", true);

        if (mouseDownNode !== d) {
            // we're in a different node: create new edge for mousedown edge and add to graph
            var newEdge = { source: mouseDownNode, target: d, weight: 1 };
            var filtRes = thisGraph.paths.filter(function(d) {
                if (d.source === newEdge.target && d.target === newEdge.source) {
                    thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
                }
                return d.source === newEdge.source && d.target === newEdge.target;
            });
            if (!filtRes[0].length) {
                thisGraph.edges.push(newEdge);
                thisGraph.updateGraph();
            }
        } else {
            // we're in the same node
            if (state.justDragged) {
                // dragged, not clicked
                state.justDragged = false;
            } else {
                // clicked, not dragged
                if (d3.event.shiftKey) {
                    if (!d3node.classed(this.consts.selectedClass)) {
                        // Mark the node as selected
                        d3node.classed(this.consts.selectedClass, true);

                        // Add the node to the selected nodes array
                        state.selectedNodes.push(d);
                    } else {
                        // Mark the node as unselected
                        d3node.classed(this.consts.selectedClass, false);

                        // Remove the node from the selected nodes array
                        state.selectedNodes.splice(state.selectedNodes.indexOf(d), 1);
                    }
                } else if (d3.event.ctrlKey) {
                    // control-clicked node: edit text content
                    thisGraph.editNode(d3node, d);
                } else {
                    if (state.selectedEdge) {
                        thisGraph.removeSelectFromEdge();
                    }
                    var prevNode = state.selectedNode;

                    if (!prevNode || prevNode.id !== d.id) {
                        thisGraph.replaceSelectNode(d3node, d);
                    } else {
                        thisGraph.removeSelectFromNode();
                    }
                }
            }
        }
        state.mouseDownNode = null;
        return;
    }; // end of circles mouseup

    // Edit the text in a node
    GraphCreator.prototype.editNode = function(d3node, d) {
        var thisGraph = this;
        var d3txt = thisGraph.changeTextOfNode(d3node, d);
        var txtNode = d3txt.node();
        thisGraph.selectElementContents(txtNode);
        txtNode.focus();
    };

    // mousedown on main svg
    GraphCreator.prototype.svgMouseDown = function() {
        this.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function() {
        var thisGraph = this,
            state = thisGraph.state;
        if (state.justScaleTransGraph) {
            // dragged not clicked
            state.justScaleTransGraph = false;
        }
        // else if (state.graphMouseDown && d3.event.ctrlKey){ EDIT: Only click is enough to add a node
        else if (state.graphMouseDown) {
            // clicked not dragged from svg
            var xycoords = d3.mouse(thisGraph.svgG.node()),
                d = { id: thisGraph.idct++, title: settings.defaultNodeLabel, x: xycoords[0], y: xycoords[1] };
            thisGraph.nodes.push(d);
            thisGraph.updateGraph();
            // make title of text immediently editable
            var d3txt = thisGraph.changeTextOfNode(thisGraph.circles.filter(function(dval) {
                    return dval.id === d.id;
                }), d),
                txtNode = d3txt.node();
            thisGraph.selectElementContents(txtNode);
            txtNode.focus();
        } else if (state.shiftNodeDrag) {
            // dragged from node
            state.shiftNodeDrag = false;
            thisGraph.dragLine.classed("hidden", true);
        }
        state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function() {
        var thisGraph = this,
            consts = thisGraph.consts,
            keyMap = thisGraph.keyMap;

        // Update the map of keys
        keyMap[d3.event.keyCode] = true;

        // If Delete or Backspace key is pressed
        if (keyMap[consts.BACKSPACE_KEY] || keyMap[consts.DELETE_KEY]) {
            // d3.event.preventDefault();
            thisGraph.deleteElements();
        }
        // If Control + Shift and A keys are pressed
        else if (keyMap[consts.CONTROL_KEY] && keyMap[consts.SHIFT_KEY] && keyMap[consts.A_KEY]) {
            thisGraph.selectAllNodes();
        }
        // If Control + Shift and E keys are pressed
        else if (keyMap[consts.CONTROL_KEY] && keyMap[consts.SHIFT_KEY] && keyMap[consts.E_KEY]) {
            thisGraph.selectAllEdges();
        }
        // If Control + Shift and F keys are pressed then show the search window
        else if (keyMap[consts.CONTROL_KEY] && keyMap[consts.SHIFT_KEY] && keyMap[consts.F_KEY]) {
            $("#find-nodes-modal").modal("show");
        }
        // If Control + Shift and X keys are pressed then unselect everything
        else if (keyMap[consts.CONTROL_KEY] && keyMap[consts.SHIFT_KEY] && keyMap[consts.X_KEY]) {
            thisGraph.unSelectAllEdges();
            thisGraph.unSelectAllNodes();
        }
        // If Control + Shift and S keys are pressed then find the shortest path
        else if (keyMap[consts.CONTROL_KEY] && keyMap[consts.SHIFT_KEY] && keyMap[consts.S_KEY]) {
            thisGraph.findShortestPath();
        }
    }

    // Delete elements in the graph
    GraphCreator.prototype.deleteElements = function() {
        var thisGraph = this,
            state = thisGraph.state;

        if (state.selectedNodes.length > 0) {
            // Remove the previously selected nodes
            state.selectedNodes.forEach(n => {
                var index = thisGraph.nodes.indexOf(n);
                if (index >= 0) {
                    thisGraph.nodes.splice(index, 1);
                    thisGraph.spliceLinksForNode(n);
                }
            });
            state.selectedNodes = [];

            thisGraph.updateGraph();
        } else if (state.selectedEdges.length > 0) {
            // thisGraph.edges.splice(thisGraph.edges.indexOf(selectedEdge), 1);
            // state.selectedEdge = null;
            // Remove the previously selected nodes
            state.selectedEdges.forEach(e => {
                var index = thisGraph.edges.indexOf(e);
                if (index >= 0) {
                    thisGraph.edges.splice(index, 1);
                }
            });
            state.selectedEdges = [];
            thisGraph.updateGraph();
        }
    }

    // Mark all nodes as selected
    GraphCreator.prototype.selectAllNodes = function() {
        var thisGraph = this;

        // Get the circles
        var circles = thisGraph.getCircles(thisGraph.nodes);

        // Mark the nodes as selected
        circles.classed(thisGraph.consts.selectedClass, true);

        // Add all node data to the selected nodes
        thisGraph.state.selectedNodes = thisGraph.nodes.slice();

        // Unselect all edges
        thisGraph.unSelectAllEdges();
    }

    // Mark all nodes as unselected
    GraphCreator.prototype.unSelectAllNodes = function() {
        var thisGraph = this;

        // Get the circles
        var circles = thisGraph.getCircles(thisGraph.nodes);

        // UnMark the nodes as selected
        circles.classed(thisGraph.consts.selectedClass, false);

        // Add all node data to the selected nodes
        thisGraph.state.selectedNodes = [];

        thisGraph.state.selectedNode = null;
    }

    // Mark all edges as selected
    GraphCreator.prototype.selectAllEdges = function() {
        var thisGraph = this;

        // Get the paths
        var paths = thisGraph.getPaths(thisGraph.edges);

        // Mark the paths as selected
        paths.classed(thisGraph.consts.selectedClass, true);

        // Add all edges data to the selected edges
        thisGraph.state.selectedEdges = thisGraph.edges.slice();

        // Unselect all nodes
        thisGraph.unSelectAllNodes();
    }

    // Mark all edges as selected
    GraphCreator.prototype.unSelectAllEdges = function() {
        var thisGraph = this;

        // Get the paths
        var paths = thisGraph.getPaths(thisGraph.edges);

        // UnMark the paths as selected
        paths.classed(thisGraph.consts.selectedClass, false);

        // Add all edges data to the selected edges
        thisGraph.state.selectedEdges = [];

        thisGraph.state.selectedEdge = null;
    }

    GraphCreator.prototype.svgKeyUp = function() {
        this.state.lastKeyDown = -1;

        // Update the map of Keys
        this.keyMap[d3.event.keyCode] = false;
    };

    // Get the circles associated to the given nodes
    GraphCreator.prototype.getCircles = function(nodes) {
        var thisGraph = this;
        // Get the circles
        var circles = thisGraph.circles.data(nodes, function(d) {
            return d.id;
        });
        return circles;
    }

    // Get the paths associated to the given edges
    GraphCreator.prototype.getPaths = function(edges) {
        var thisGraph = this;
        var paths = thisGraph.paths.data(edges, function(d) {
            return String(d.source.id) + "+" + String(d.target.id);
        });
        return paths;
    }

    // call to propagate changes to graph
    GraphCreator.prototype.updateGraph = function() {

        var thisGraph = this,
            consts = thisGraph.consts,
            state = thisGraph.state;

        thisGraph.paths = thisGraph.paths.data(thisGraph.edges, function(d) {
            return String(d.source.id) + "+" + String(d.target.id);
        });
        var paths = thisGraph.paths;
        var markerEnd = null;
        if (settings.defaultGraphType === "directed") {
            markerEnd = 'url(#end-arrow)';
        }

        d3.selectAll('marker')
            .style("stroke", settings.defaultEdgeColor)
            .style("fill", settings.defaultEdgeColor);

        // update existing paths
        paths.style("stroke", settings.defaultEdgeColor)
            .style("marker-end", markerEnd)
            .classed(consts.selectedClass, function(d) {
                return d === state.selectedEdge;
            })
            .attr("d", function(d) {
                return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
            });

        // add new paths
        paths.enter()
            .append("path")
            .style("stroke", settings.defaultEdgeColor)
            .style("marker-end", markerEnd)
            .classed("link", true)
            .attr("d", function(d) {
                return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
            })
            .on("mousedown", function(d) {
                thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function(d) {
                state.mouseDownLink = null;
            });

        // remove old links
        paths.exit().remove();

        // update existing nodes
        thisGraph.circles = thisGraph.circles.data(thisGraph.nodes, function(d) {
            return d.id;
        });
        thisGraph.circles
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        // Update existing nodes with current settings
        thisGraph.circles.selectAll("circle")
            .attr("r", String(settings.defaultNodeSize))
            .style("fill", settings.defaultNodeColor);

        thisGraph.circles.selectAll("text")
            .style("font-size", settings.defaultNodeFontSize + "px")
            .style("fill", settings.defaultNodeFontColor);

        // add new nodes
        var newGs = thisGraph.circles.enter().append("g");

        newGs.classed(consts.circleGClass, true)
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", function(d) {
                if (state.shiftNodeDrag) {
                    d3.select(this).classed(consts.connectClass, true);
                }
            })
            .on("mouseout", function(d) {
                d3.select(this).classed(consts.connectClass, false);
            })
            .on("mousedown", function(d) {
                thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function(d) {
                thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
            })
            .call(thisGraph.drag);

        newGs.append("circle")
            .attr("r", String(settings.defaultNodeSize))
            .style("fill", settings.defaultNodeColor);

        newGs.each(function(d) {
            thisGraph.insertTitleLinebreaks(d3.select(this), d.title);
        });

        // remove old nodes
        thisGraph.circles.exit().remove();
    };

    GraphCreator.prototype.zoomed = function() {
        this.state.justScaleTransGraph = true;
        d3.select("." + this.consts.graphClass)
            .attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
    };

    GraphCreator.prototype.updateWindow = function(svg) {
        // var docEl = document.documentElement,
        //     bodyEl = document.getElementsByTagName('body')[0];
        // var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
        // var y = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;
        // svg.attr("width", x).attr("height", y);

        // Get the width of the grid
        var width = $(settings.appendElSpec)[0].clientWidth;

        // Get the height of the grid
        var height = $(settings.appendElSpec)[0].clientHeight;

        svg.attr("width", width).attr("height", height);
    };

    GraphCreator.prototype.findShortestPath = function() {
        var thisGraph = this;
        // Check that two nodes were selected
        if (thisGraph.state.selectedNodes.length !== 2) {
            swal("Invalid Operation", "You need to select only two nodes in order to execute this operation", "error");
            return;
        }

        var sourceNode = thisGraph.state.selectedNodes[0];
        var targetNode = thisGraph.state.selectedNodes[1];

        // Use disktra to find the distance from the source node to the target node
        var previous = dijkstra(thisGraph, settings.defaultGraphType, sourceNode);

        thisGraph.unSelectAllNodes();
        thisGraph.unSelectAllEdges();

        var shortesPath = [];
        var id = targetNode.id;

        if (previous[id] === undefined) {
            swal("Not Found", "There is no possible shortest path between the selected nodes", "error");
            return;
        }

        while (previous[id] !== undefined) {
            shortesPath.push(id);
            id = previous[id];
        }
        shortesPath.push(id);

        thisGraph.state.selectedNodes = shortesPath.map(id => {
            return thisGraph.nodes.find(n => n.id === id);
        });

        // Get the circles
        var circles = thisGraph.getCircles(thisGraph.state.selectedNodes);

        // Mark the nodes as selected
        circles.classed(thisGraph.consts.selectedClass, true);
    }

    // Find nodes by name
    GraphCreator.prototype.findNodes = function(name, findOption) {
        var thisGraph = this;

        // Unselect all nodes and edges
        thisGraph.unSelectAllNodes();
        thisGraph.unSelectAllEdges();

        var foundNodes = [];

        thisGraph.nodes.forEach(n => {
            var found = false;
            if (findOption === "exact") {
                found = n.title.toLowerCase() === name.toLowerCase();
            } else if (findOption === "contains") {
                found = n.title.toLowerCase().includes(name.toLowerCase());
            }

            if (found) {
                foundNodes.push(n);
            }
        });

        if (foundNodes.length === 0) {
            var message = "";
            if (findOption === "exact") {
                message = "No nodes found that match the text '" + name + "'";
            } else if (findOption === "contains") {
                message = "No nodes found that contain the text '" + name + "'";
            }
            swal("No Matches Found", message, "error")
        } else {
            // Get the circles
            var circles = thisGraph.circles.data(foundNodes, function(d) {
                return d.id;
            });

            // Mark the nodes as selected
            circles.classed(thisGraph.consts.selectedClass, true);

            // Set the selected nodes as the one currently found
            thisGraph.state.selectedNodes = foundNodes.slice();
        }
    }

    /**** MAIN ****/

    // warn the user when leaving
    window.onbeforeunload = null;

    // var docEl = document.documentElement,
    //     bodyEl = document.getElementsByTagName('body')[0];

    // var width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth,
    //     height =  window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;

    // var xLoc = width/2 - 25,
    //     yLoc = 100;

    // Get the width of the grid
    var width = $(settings.appendElSpec)[0].clientWidth;

    // Get the height of the grid
    var height = $(settings.appendElSpec)[0].clientHeight;

    // initial node data
    var nodes = [];
    var edges = [];


    /** MAIN SVG **/
    var svg = d3.select(settings.appendElSpec).append("svg")
        .attr("width", width)
        .attr("height", height);
    var graph = new GraphCreator(svg, nodes, edges);
    graph.setIdCt(2);
    graph.updateGraph();

    // Event for creating a new graph
    $("#new-graph, #welcome-new-graph").on("click", function(event) {
        if (graph.nodes.length > 0 || graph.edges.length > 0) {
            swal({
                    title: "Are you sure you want to start a new graph?",
                    text: "You will not be able to recover the current graph",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Yes, create a new graph!",
                    closeOnConfirm: true
                },
                function() {
                    $("#welcome-body").css({ display: "none" });
                    $("#graph-editor-body").css({ display: "" });
                    graph.deleteGraph(false);
                });
        } else {
            $("#welcome-body").css({ display: "none" });
            $("#graph-editor-body").css({ display: "" });
            graph.deleteGraph(false);
        }
    });

    // Event for opening a graph
    $("#open-graph").on("click", function(event) {
        if (graph.nodes.length > 0 || graph.edges.length > 0) {
            swal({
                    title: "Are you sure you want to start a new graph?",
                    text: "You will not be able to recover the current graph",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Yes, open a new graph!",
                    closeOnConfirm: true
                },
                function() {
                    $("#welcome-body").css({ display: "none" });
                    $("#graph-editor-body").css({ display: "" });
                    document.getElementById("hidden-file-upload").click();
                });
        } else {
            $("#welcome-body").css({ display: "none" });
            $("#graph-editor-body").css({ display: "" });
            document.getElementById("hidden-file-upload").click();
        }
    });

    // Events for saving a graph
    $("#save-graph").on("click", function(event) {
        $("#save-graph-modal").modal("show");
    });
    $("#save-graph-button").on("click", function(event) {
        var saveEdges = [];
        graph.edges.forEach(function(val, i) {
            saveEdges.push({ source: val.source.id, target: val.target.id });
        });
        var blob = new Blob([window.JSON.stringify({ "nodes": graph.nodes, "edges": saveEdges })], { type: "text/plain;charset=utf-8" });

        // Get the name of the file
        var filename = $("#graph-filename").val() + ".json";

        // Download the file
        saveAs(blob, filename);

        // Close the modal
        $("#save-graph-modal").modal("hide");
    });

    // Events for printing a graph
    $("#print-graph").on("click", function(event) {
        $("#graph-editor-body").print();
    });

    // Events for printing a graph
    $("#preferences").on("click", function(event) {
        $("#preferences-modal").modal("show");
    });

    // Events for saving preferences
    $("#save-preferences-button").on("click", function(event) {
        settings.defaultNodeColor = $("#default-node-color").val();
        settings.defaultNodeSize = $("#default-node-size").val();
        settings.defaultNodeLabel = $("#default-node-label").val();
        settings.defaultNodeFontSize = $("#default-font-size").val();
        settings.defaultNodeFontColor = $("#default-font-color").val();
        settings.defaultEdgeColor = $("#default-edge-color").val();
        settings.defaultGraphType = $("#default-graph-type li.selected").attr("data-value");

        graph.setDraggingEdge(settings.defaultGraphType);
        graph.updateGraph();

        // Close the modal
        $("#preferences-modal").modal("hide");
    });

    // Events for selecting graph type
    $("#default-graph-type li").on("click", function(event) {
        // Get the selected value
        var selectedItem = $(event.target);

        // Update the button label
        $("#selected-default-graph-type").text(selectedItem.text());

        // Remove Selected class to all options
        $("#default-graph-type li").removeClass("selected");

        // Get the value associated to the selected option
        var value = selectedItem.parent().attr("data-value");

        // Add Selected class to selected option
        $("#default-graph-type li[data-value='" + value + "']").addClass("selected");
    });

    // Events for selecting all the nodes
    $("#select-all-nodes").on("click", function(event) {
        graph.selectAllNodes();
    });

    // Events for selecting all the edges
    $("#select-all-edges").on("click", function(event) {
        graph.selectAllEdges();
    });

    // Events for modal window to find nodes by name
    $("#find-nodes-by-name").on("click", function(event) {
        $("#find-nodes-modal").modal("show");
    });

    // Event when the find node dialog is shown
    $("#find-nodes-modal").on("shown.bs.modal", function(e) {
        $("#find-text").focus();
    })

    // Events for finding nodes by name
    $("#find-nodes").on("click", function(event) {
        var name = $("#find-text").val();
        var findOption = $("#find-nodes-modal input:checked").val();
        graph.findNodes(name, findOption);
        $("#find-nodes-modal").modal("hide");
    });

    // Events for modal window to find nodes by name
    $("#find-shortest-path").on("click", function(event) {
        graph.findShortestPath();
    });

    // Events for deleting elements
    $("#delete").on("click", function(event) {
        graph.deleteElements();
    });

    // Events for editing a node
    $("#edit-node").on("click", function(event) {
        if (graph.state.selectedNodes.length !== 1) {
            swal("Invalid Operation", "You must select only a node in order to edit it", "error");
            return;
        }
        var d = graph.state.selectedNodes[0];
        var d3node = graph.getCircles([d]);
        graph.editNode(d3node, d);
    });

    // Events for unselecting
    $("#unselect").on("click", function(event) {
        graph.unSelectAllNodes();
        graph.unSelectAllEdges();
    });

    // Hides the editing window
    $("#graph-editor-body").css({ display: "none" });


})(window.d3, window.saveAs, window.Blob);
