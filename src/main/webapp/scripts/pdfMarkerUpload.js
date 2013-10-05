var uploadedFileName;
var existingSessionId;
$(document).ready(function() {
	initializeUI();
	registerEventHandlers();
});

function initializeUI() {
	$("#messageBox").hide();
}

function registerEventHandlers() {
	$("#fileUploadInputReal").on("change", populateTextField);
	$("#uploadButton").on("click", validateInputData);
	$("#proceedButton").on("click", retriewSession);
	$("#sessionIdInput").on("keyup", retriewSessionInfoOnEnter).on("focus",
			validateSessionIdInput);
}

function populateTextField() {
	$("#fileUploadInputFake").removeClass("has-error");
	$("#pdfTypeValidationDiv").css("display", "none");
	uploadedFileName = $("#fileUploadInputReal").val();
	$("#inputUploadedFile").val(uploadedFileName);
}

function showLogin() {
	$("#toggleRow").slideToggle();
	validateSessionIdInput();
	$("#sessionIdInput").val("");
	$("#sessionIdInput").focus();
}

function validateInputData() {
	// validate for empty file
	if ($("#fileUploadInputReal").val() == "") {
		$("#fileUploadInputFake").addClass('has-error');
	} else {
		processFile(null);
	}
}

function retriewSessionInfoOnEnter(event) {
	if (event.which == 13) {
		existingSessionId = $("#sessionIdInput").val();
		processFile($("#sessionIdInput").val());
	}
}

function validateSessionIdInput() {
	$("#sessionIdInputDiv").removeClass('has-error');
	$("#sessionIdValidation").css("display", "none");
	$("#sessionIdValidation p").empty();
}

//resumes saved session 
function retriewSession() {
	if ($("#sessionIdInput").val() == "") {
		$("#sessionIdInputDiv").addClass('has-error');
	} else {
		existingSessionId = $("#sessionIdInput").val();
		processFile($("#sessionIdInput").val());
	}
}
// uploads the document and makes an ajax call to generate images from document
//sessionId is null when  document is uploaded for first time
//valid sessionId is entered to resume saved session
function processFile(sessionId) {
	var reader = new FileReader();
	reader.onload = function(evt) {
		// check whether the file uploaded is pdf by matching first 8 char to
		// %PDF-1[0-7]
		var data = evt.target.result.substr(0, 8);
		var regEx = new RegExp("%PDF-1.[0-7]");
		if (data.match(regEx)) {
			// upon reading image file successfully, draw the image on canvas
			$("#uploadButton").css("display", "none");
			$("#uploadProgressImage").css("display", "block")
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function(readyState) {
				// todo : handle exception when upload
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						displayCanvasPage();
					} else {
						$("#alertError p").empty();
						$("#alertDiv").css("display", "block");
						$("#alertError p").append(xhr.responseText);
						$("#uploadButton").css("display", "block");
						$("#uploadProgressImage").css("display", "none");
					}
				}
			};
			xhr.open("POST", "/pde/pdfFile/process", true);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.setRequestHeader("Accept", "application/json");
			xhr.send(JSON.stringify({
				fileBase64Content : btoa(evt.target.result),
				uploadedDocName : uploadedFileName
			}));
		} else {
			$("#fileUploadInputFake").addClass('has-error');
			$("#pdfTypeValidationDiv").css("display", "block");
		}
	};
	// read pdf file
	if (sessionId == null) {
		reader.readAsBinaryString($("#fileUploadInputReal")[0].files[0]);
	} else {
		// resume user session
		$.ajax({
			url : "/pde/pdfFile/retriewSession/" + sessionId,
			type : "get",
			contentType : "application/json",
			accept : "application/json",
			success : function(data) {
				displayCanvasPage();
			},
			error : function(data) {
				$("#sessionIdInputDiv").addClass('has-error');
				$("#sessionIdValidation").css("display", "block");
				$("#sessionIdValidation p").append(data.responseText);
			}
		});
	}
}

//navigate to next page once valid session is entered or when document is uploaded successfully
function displayCanvasPage() {
	$("#mainBox").load("PDFCanvasContent.html");
}
