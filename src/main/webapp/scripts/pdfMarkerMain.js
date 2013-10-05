$(document).ready(function(){
	$("#mainBox").load('PDFFileUpload.html');
});

//on close of error alert
$("#alertError button").on("click",function(){
	$("#alertDiv").css("display","none");
});