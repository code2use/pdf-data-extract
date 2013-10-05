var newSession;
var imgObj = new Image();
var regExPattern2 = new RegExp("\\w+(?=\.pdf)", "g");
var pageCount;
var markedTextArray;
var saveTextAreaCount; // used to generate a unique id for the div section
var updateDataId;
var saveOrUpdate;

$(document).ready(function() {
	initCanvasPage();
});

function initCanvasPage() {
	saveOrUpdate = "save";
	if (uploadedFileName === undefined) {
		newSession = 0;
	} else {
		newSession = 1;
	}
	initializeDataSave();
	populateLeftNav();
	populateMainContent();
	$("#documentInfo").css("display", 'inline');
	$("#editSessionId").css("display", 'none');
	$("#editSessionInfoSign").on('click', editSessionId);
	$('#tempCanvas').on('mousedown', canvasMouseDown);
	$('#tempCanvas').on('mouseup', canvasMouseUp);
	$('#tempCanvas').on('mousemove', canvasMouseMove);
	$('#tempCanvas').on('click', onClickOfCanvas);
	$("#updateSessionButton button").on('click', updateSessionId);
	$("#sessionIdToEdit input").on('focus', removeValidationMsg);
	$("#sessionIdToEdit input").on('keyup', proceedToEditSessionId);
	$(".modal").on('shown.bs.modal', function() {
		$(this).find("#labelText").focus();
	});
	$(".modal").on('hidden.bs.modal', function() {
		clearCanvas("#tempCanvas");
	});
	$("#saveLabelButton").on('click', function() {
		if (saveOrUpdate == "save") {
			saveText();
		} else {
			updateText();
		}
	});
	$("#labelText").on("keyup", function(event) {
		$("#labelTextDiv").removeClass("has-error");
		if (event.which == 13) {
			if (saveOrUpdate == "save") {
				saveText();
			} else {
				updateText();
			}
		}
	});

}

//initialize array to save all marked text area
function initializeDataSave() {
	markedTextArray = new Array();
}

//populates left nav
function populateLeftNav() {
	$.ajax({
		url : "/pde/pdfFile/pageCount",
		type : "get",
		contentType : "application/json",
		accept : "application/json",
		success : function(data) {
			pageCount = JSON.parse(data);
			for ( var x = 1; x <= pageCount; x++) {
				$("#leftDiv").append(
						"<div class='thumbnail'> "
								+ " <img onclick='selectImageToDisplay(" + x
								+ ")' src='/pde/pdfFile/pageImage/" + x
								+ "'/> " + "<div class='caption'><p>Page-" + x
								+ "</p> " + "</div></div>");
				$("#leftDiv div:first").css('border', 'solid 1px red');
				$("div.thumbnail").click(function() {
					$("div.thumbnail").css('border', 'solid 1px black');
					$(this).css('border', 'solid 1px red');
				});
			}
			populateHeaderInfo();
		}
	});
	
}

//populate header section with pdf name, number of pages and session id
function populateHeaderInfo() {
	if (newSession == 0) {
		// existing session
		$.ajax({
			url : "/pde/pdfFile/retriewUploadedFileName/",
			type : "GET",
			contentType : "application/json",
			accept : "application/json",
			success : function(data) {
				if (data != "") {
					$("#pdfFileName").append(
							" " + data + " ( " + pageCount + " Pages )");
					// uploadedFileName = markedArea[0].split(".")[0];
					uploadedFileName = data;

				}
			}
		});
		//$("#clickToEdit").append(existingSessionId);
		$("#clickToEdit").text(existingSessionId);
	} else if (newSession == 1) {
		// new session
		$.ajax({
			url : "/pde/pdfFile/retriewSessionInfo/",
			type : "GET",
			contentType : "application/json",
			accept : "application/json",
			success : function(data) {
				if (data != "") {
					$("#clickToEdit").text(data);

				}
			}
		});
		$("#pdfFileName").append(
				" " + uploadedFileName.match(regExPattern2) + ".pdf ( "
						+ pageCount + " Pages )");
	}
}

function populateMainContent() {
	// display first page by default
	currentPage = 1;
	selectImageToDisplay(1);
}

//image(thumb nail) selected on the left container will be displayed on the canvas (large container in the middle)
function selectImageToDisplay(pageNumberSelected) {
	// clear all drawings on the 'rectangleCanvas'
	$("#rectangleCanvas").clearCanvas();
	// clear all drawings on the 'tempCanvas'
	$("#tempCanvas").clearCanvas();
	currentPage = pageNumberSelected;
	// set image URL
	imgObj.src = "/pde/pdfFile/pageImage/" + pageNumberSelected;
	imgObj.onload = function() {
		// upon successful fetch of image, paint the image on the canvas
		$("#imgCanvas").drawImage({
			source : imgObj,
			x : 0,
			y : 0,
			fromCenter : false
		});
	};
	// get marked text areas pertaining to selected page (stored on the server) --- TODO: avoid repeatedly fetching config file from server
	getConfigData(pageNumberSelected);
}

// get marked text areas for the selected page. marked text area info is stored on the server.
function getConfigData(pageNum) {
	// fetch config file containing marked text area info
	$.ajax({
		type : "GET",
		url : "/pde/pdfFile/retriewConfigData/",
		contentType : "application/json",
		accept : "application/json",
		success : function(data) {
			if (data != "") {
				// parse JSON response and assign to a global variable
				markedTextArray = JSON.parse(data); // NOTE: markedTextArray is a global variable. --- TODO: avoid global variables
				// when successful, fetch the markup (snippet) to render marked text area info boxes on the right container
				$.ajax({
					type : "GET",
					url : "MarkedTextInfo.html",
					success : function(responseText) {
						// create marked text area info boxes on the right container 
						processSavedConfigData(new String(responseText),
								pageNum);
					}
				});
			}
		}
	});
}

// iterate through markedTextArray and for each marked text area belonging to the selected page, create a box on the right container, using the markup text in markedTextDetailHtmlString variable
function processSavedConfigData(markedTextDetailHtmlString, pageNum) {
	// remove all existing marked text area info boxes
	$(".panel").remove();
	// iterate through each marked text area info object
	for ( var index = 0; index < markedTextArray.length; index++) {
		if (!(markedTextArray[index] == null)) {
			if (pageNum == markedTextArray[index].pageNumber) {
				drawRectangle({
					canvasID : "#rectangleCanvas",
					x : markedTextArray[index].x,
					y : markedTextArray[index].y,
					width : markedTextArray[index].w,
					height : markedTextArray[index].h,
					strokeColor : "black"
				});
				var replacedString = markedTextDetailHtmlString.replace(
						"{getCoordinates}",
						"(" + Math.floor(markedTextArray[index].x) + ","
								+ Math.floor(markedTextArray[index].y) + ","
								+ Math.floor(markedTextArray[index].w) + ","
								+ Math.floor(markedTextArray[index].h) + ")")
						.replace("{getLabel}", markedTextArray[index].label)
						.replace("{getText}",
								markedTextArray[index].extractedText).replace(
								"{uniqueId}", index);
				$($.parseHTML(replacedString)).insertAfter(
						'#headingOfMarkedArea');
				$("#" + (index)).click(markedTextAreaSelectHandler);
				$("#" + (index) + " button").click(
						deleteMarkedTextAreaContainer);
			}
		}
	}
}

function canvasMouseDown(event) {
	drawingSession.startSession(event.offsetX, event.offsetY);
}

function canvasMouseUp(event) {
	drawingSession.endSession(event.offsetX, event.offsetY);
	var areaCoordinates = drawingSession.getCoordinates();
	drawRectangle({
		canvasID : "#tempCanvas",
		x : areaCoordinates[0],
		y : areaCoordinates[1],
		width : areaCoordinates[2],
		height : areaCoordinates[3],
		strokeColor : "red"
	});
	// extract text from selected area
	if (areaCoordinates[2] * areaCoordinates[3] > 100) {
		$.ajax({
			url : "/pde/pdfFile/extractText/" + currentPage + "/"
					+ areaCoordinates[0] + "/" + areaCoordinates[1] + "/"
					+ areaCoordinates[2] + "/" + areaCoordinates[3],
			type : "get",
			contentType : "application/json",
			accept : "text/plain",
			success : function(data) {
				extractedText = data;
				$("#coordinate").text(
						"(" + Math.floor(areaCoordinates[0]) + ","
								+ Math.floor(areaCoordinates[1]) + ","
								+ Math.floor(areaCoordinates[2]) + ","
								+ Math.floor(areaCoordinates[3]) + ")");
				$("#markedText").val(extractedText);
				$("#labelText").val("");
				$("#labelTextDiv").removeClass("has-error");
				saveOrUpdate = "save";
				$("#labelMarkedTextModal").modal('show');
				$('button.ui-button:contains("Update")').css({
					"background-color" : "#9fb5d1"
				});
			},
			error : function(data) {
				$("#alertError p").empty();
				$("#alertDiv").css("display","block");
				$("#alertError p").append(data.responseText);
				clearCanvas("#tempCanvas");
			}
		});
		// $("#markedTextContainer").show();
	}
}

function clearCanvas(canvasID) {
	$(canvasID).clearCanvas();
}

function canvasMouseMove(event) {
	if (drawingSession.inSession) {
		var areaCoordinates = drawingSession.getCurrentCoordinates(
				event.offsetX, event.offsetY);
		clearCanvas("#tempCanvas");
		drawRectangle({
			canvasID : "#tempCanvas",
			x : areaCoordinates[0],
			y : areaCoordinates[1],
			width : areaCoordinates[2],
			height : areaCoordinates[3],
			strokeColor : "red"
		});
	}
}

var drawingSession = {
	// data/attributes
	inSession : false,
	startX : -1,
	startY : -1,
	endX : -1,
	endY : -1,

	// methods/behavior
	startSession : function(x, y) {
		this.inSession = true;
		this.startX = x;
		this.startY = y;
		this.endX = -1;
		this.endY = -1;
	},
	endSession : function(x, y) {
		this.inSession = false;
		this.endX = x;
		this.endY = y;
	},
	clearSession : function() {
		this.inSession = false;
		this.startX = -1;
		this.startY = -1;
		this.endX = -1;
		this.endY = -1;
	},
	getCoordinates : function() {
		return [ Math.min(this.startX, this.endX),
				Math.min(this.startY, this.endY),
				Math.abs(this.endX - this.startX),
				Math.abs(this.endY - this.startY) ];
	},
	getCurrentCoordinates : function(currX, currY) {
		return [ Math.min(this.startX, currX), Math.min(this.startY, currY),
				Math.abs(currX - this.startX), Math.abs(currY - this.startY) ];
	},
	isInSession : function() {
		return this.inSession;
	}
};

function drawRectangle(rectData) {
	$(rectData.canvasID).drawRect({
		strokeStyle : rectData.strokeColor,
		strokeWidth : 2,
		x : rectData.x,
		y : rectData.y,
		width : rectData.width,
		height : rectData.height,
		fromCenter : false
	});
}

function saveText() {
	if (!$("#labelText").val() || ($("#labelText").val() == "")) {
		$("#labelTextDiv").addClass("has-error");
	} else {
		saveTextAreaCount = markedTextArray.length;
		var areaCoordinates = drawingSession.getCoordinates();
		drawRectangle({
			canvasID : "#rectangleCanvas",
			strokeColor : "#000",
			x : areaCoordinates[0],
			y : areaCoordinates[1],
			width : areaCoordinates[2],
			height : areaCoordinates[3]
		});
		console.log("in save text " + saveTextAreaCount);
		markedTextArray[saveTextAreaCount] = {
			x : areaCoordinates[0],
			y : areaCoordinates[1],
			w : areaCoordinates[2],
			h : areaCoordinates[3],
			label : $("#labelText").val(),
			extractedText : $("#markedText").val(),
			pageNumber : currentPage
		};
		saveConfigData();
		clearCanvas("#tempCanvas");
		$.ajax({
			type : "GET",
			url : "MarkedTextInfo.html",
			success : function(responseText) {
				var responseString = new String(responseText);
				var replacedString = responseString.replace("{getLabel}",
						$("#labelText").val()).replace("{getText}",
						$("#markedText").val()).replace("{uniqueId}",
						saveTextAreaCount);
				$($.parseHTML(replacedString)).insertAfter(
						'#headingOfMarkedArea');
				$("#" + saveTextAreaCount).click(markedTextAreaSelectHandler);
				$("#" + saveTextAreaCount + " button").click(
						deleteMarkedTextAreaContainer);
			}
		});
		$("#labelMarkedTextModal").modal('hide');
	}
}

function saveConfigData() {
	$.ajax({
		url : "/pde/pdfFile/configFile/",
		data : JSON.stringify(markedTextArray, null, '\t'),
		type : "PUT",
		contentType : "text/plain",
		accept : "text/plain",
		success : function(data) {
			// var saveMarkedTextArray = JSON.parse(data);
		}
	});
}

function markedTextAreaSelectHandler() {
	$("#labelMarkedTextModal").modal('hide');
	var containerRef = this;
	var selectedTextArea = markedTextArray[$(containerRef).attr("id")];
	clearCanvas("#tempCanvas");
	updateDataId = $(containerRef).attr("id");
	saveOrUpdate = "update";
	drawRectangle({
		canvasID : "#tempCanvas",
		strokeColor : "red",
		x : selectedTextArea.x,
		y : selectedTextArea.y,
		width : selectedTextArea.w,
		height : selectedTextArea.h
	});
	// scroll to be edited text position
	$("#centerDiv").scrollTop(selectedTextArea.y);
	$("#centerDiv").scrollLeft(selectedTextArea.x);
	$("#labelMarkedTextModal").modal('show');
	$("#coordinate").text(
			"(" + Math.floor(selectedTextArea.x) + ","
					+ Math.floor(selectedTextArea.y) + ","
					+ Math.floor(selectedTextArea.w) + ","
					+ Math.floor(selectedTextArea.h) + ")");
	$("#markedText").val(selectedTextArea.extractedText);
	$("#labelText").val(selectedTextArea.label);
}

function deleteMarkedTextAreaContainer(event) {
	$(event.stopPropagation());
	var markedTextIdToDel = $(this).parents(".panel").attr("id");
	// var selectedTextArea = savedMarkedTextAreas[markedTextIdToDel];
	var selectedTextArea = markedTextArray[markedTextIdToDel];
	$("#rectangleCanvas").clearCanvas({
		x : selectedTextArea.x - 10,
		y : selectedTextArea.y - 10,
		width : selectedTextArea.w + 15,
		height : selectedTextArea.h + 15,
		fromCenter : false
	});
	// savedMarkedTextAreas[markedTextIdToDel] = " ";
	// delete savedMarkedTextAreas[markedTextIdToDel];
	delete markedTextArray[markedTextIdToDel];
	saveConfigData();
	$(this).parents(".panel").remove();
}

function updateText() {
	if (!$("#labelText").val() || ($("#labelText").val() == "")) {
		$("#labelTextDiv").addClass("has-error");
	} else {
		var updateData = markedTextArray[updateDataId];
		updateData.label = $("#labelText").val();
		console.log("#" + updateDataId + ".panel-heading p");
		$("#" + updateDataId + " .panel-heading p").replaceWith(
				"<p class='labelContent'>" + updateData.label + "</p>");
		markedTextArray[updateDataId] = updateData;
		saveConfigData();
		$("#labelMarkedTextModal").modal('hide');
	}
}

function onClickOfCanvas(event) {
	for ( var index = 0; index < markedTextArray.length; index++) {
		if (!(markedTextArray[index] == null)) {
			if (currentPage == markedTextArray[index].pageNumber) {
				if ((event.offsetX > markedTextArray[index].x || event.offsetX < (markedTextArray[index].width + markedTextArray[index].x))
						&& (event.offsetY > markedTextArray[index].y || event.offsetY < (markedTextArray[index].height + markedTextArray[index].y))) {
					$("#labelMarkedTextModal").modal('show');
					$("#coordinate").text(
							"(" + Math.floor(markedTextArray[index].x) + ","
									+ Math.floor(markedTextArray[index].y)
									+ ","
									+ Math.floor(markedTextArray[index].w)
									+ ","
									+ Math.floor(markedTextArray[index].h)
									+ ")");
					$("#markedText").val(markedTextArray[index].extractedText);
					$("#labelText").val(markedTextArray[index].label);
					updateDataId = index;
					saveOrUpdate = "update";
				}
			}
		}
	}
}

/*
 * function showSessionEdit() { $("#sessionIdEdit").slideToggle(); }
 */

function editSessionId() {
	$("#editSessionId").slideToggle();
	$("#sessionIdToEdit input").focus();
	$("#sessionIdToEdit input").val("");
}

function updateSessionId() {
	$.ajax({
		url : "/pde/pdfFile/updateSessionId/"
				+ $("#sessionIdToEdit input").val(),
		type : "PUT",
		contentType : "text/plain",
		success : function() {
			$("#editSessionId").css("display", "none");
			$("#clickToEdit").text($("#sessionIdToEdit input").val());
		},
		error : function(data) {
			$("#sessionIdUpdateValidation").css("display", "block");
			$("#sessionIdUpdateValidation p").append(data.responseText);
		}
	});
}

function removeValidationMsg() {
	$("#sessionIdUpdateValidation").css("display", "none");
	$("#sessionIdUpdateValidation p").empty();
}

function proceedToEditSessionId(event) {
	if(event.which == 13) {
		updateSessionId();
	}
}