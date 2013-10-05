package com.c2u.pde.model;

/**
 * Captures details required to process a pdf file
 */
public class PDFFileProcessingDetail {
	private String fileBase64Content;
	private Integer resolution;
	private String pdfType;
	private String uploadedDocName;

	public String getPdfType() {
		return pdfType;
	}

	public void setPdfType(String pdfType) {
		this.pdfType = pdfType;
	}

	public String getFileBase64Content() {
		return fileBase64Content;
	}

	public void setFileBase64Content(String fileBase64Content) {
		this.fileBase64Content = fileBase64Content;
	}

	public Integer getResolution() {
		return resolution;
	}

	public void setResolution(Integer resolution) {
		this.resolution = resolution;
	}

	public String getUploadedDocName() {
		return uploadedDocName;
	}
	
	public void setUploadedDocName(String uploadedDocName) {
		this.uploadedDocName = uploadedDocName;
	}
}
