package com.c2u.pde.resource;

import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

import javax.imageio.ImageIO;
import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.codec.binary.Base64;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.util.PDFTextStripperByArea;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.c2u.pde.constant.PDEConstants;
import com.c2u.pde.exception.PDEException;
import com.c2u.pde.model.PDFFileProcessingDetail;

@Controller
@RequestMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE, value = "/pdfFile")
public class PDFFile {
	@Autowired
	private ServletContext servletContext;

	private String getAppWorkFolder() {
		return servletContext
				.getInitParameter(PDEConstants.WORK_FOLDER_VAR);
	}

	private String generateUUID() {
		return UUID.randomUUID().toString();
	}

	private void createNewSessionWorkFolder(String sessionWorkFolder)
			throws IOException {
		File file = new File(sessionWorkFolder);
		file.mkdir();
	}

	private void initializeSession(HttpSession session) throws IOException {
		// generate a UUID
		String uuid = generateUUID();
		session.setAttribute(PDEConstants.SESSION_UUID, uuid);
		// generate session's work folder
		session.setAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR,
				getAppWorkFolder() + "/" + uuid);
		// create session's work folder
		createNewSessionWorkFolder((String) session
				.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR));
	}

	private void saveFile(String directoryPath, String fileName,
			byte[] binaryContent) throws IOException {
		BufferedOutputStream bos = null;
		try {
			bos = new BufferedOutputStream(new FileOutputStream(directoryPath
					+ "/" + fileName), 2048);
			bos.write(binaryContent);
		} finally {
			if (bos != null) {
				try {
					bos.close();
				} catch (Exception ex) {

				}
			}
		}
	}

	private void saveImage(BufferedImage imageData, int pageNumber,
			String imageFolder) throws IOException {
		ImageIO.write(imageData, "png", new File(imageFolder + "/Page-"
				+ pageNumber + ".png"));
	}

	private static final int BUFFER_SIZE = 1024;

	public byte[] readFile(String filePath) throws IOException {
		BufferedInputStream bis = null;
		byte[] fileContent = null;
		try {
			bis = new BufferedInputStream(new FileInputStream(filePath),
					BUFFER_SIZE);

			ByteArrayOutputStream bos = new ByteArrayOutputStream(BUFFER_SIZE);

			byte[] tmpBuffer = new byte[BUFFER_SIZE];

			int bytesRead = -1;
			while ((bytesRead = bis.read(tmpBuffer, 0, BUFFER_SIZE)) != -1) {
				bos.write(tmpBuffer, 0, bytesRead);
			}

			fileContent = bos.toByteArray();
		} finally {
			if (bis != null) {
				try {
					bis.close();
				} catch (Exception ex) {
				}
			}
		}
		return fileContent;
	}

	@RequestMapping(value = "/process", method = RequestMethod.POST)
	public @ResponseBody
	void processPDFFile(
			@RequestBody PDFFileProcessingDetail pdfFileProcessingDetail,
			HttpServletRequest request, HttpServletResponse response,
			HttpSession session) throws IOException {
		PDDocument document = null;
		try {
			// initialize session
			initializeSession(session);

			// get pdf file binary content
			byte[] pdfFileContent = Base64.decodeBase64(pdfFileProcessingDetail
					.getFileBase64Content());

			// save pdf into working directory
			saveFile(
					(String) session
							.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR),
					pdfFileProcessingDetail.getUploadedDocName(),
					pdfFileContent);

			session.setAttribute(PDEConstants.PDF_FILE_NAME,
					pdfFileProcessingDetail.getUploadedDocName());

			document = PDDocument
					.load(new ByteArrayInputStream(pdfFileContent));
			// convert all pages to images
			int pageNumber = 1;
			for (PDPage page : (List<PDPage>) document.getDocumentCatalog()
					.getAllPages()) {
				saveImage(
						page.convertToImage(BufferedImage.TYPE_INT_RGB, 72 * 2),
						pageNumber,
						(String) session
								.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR));

				pageNumber++;
			}

			// populate few pre-computed variables in to session
			session.setAttribute(PDEConstants.PAGE_CNT_VAR, document
					.getDocumentCatalog().getAllPages().size());
			session.setAttribute(PDEConstants.RESOLUTION_VAR, 2);
		} finally {
			try {
				if (document != null) {
					document.close();
				}
			} catch (Exception ex) {
			}
		}
	}

	@RequestMapping(value = "/retriewSession/{sessionId}", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	void retriewSession(@PathVariable("sessionId") String sessionId,
			HttpSession session, HttpServletResponse response)
			throws PDEException {
		File file = new File(getAppWorkFolder() + "/" + sessionId);
		if (file.isDirectory()) {
			session.setAttribute(PDEConstants.SESSION_UUID, sessionId);
			session.setAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR,
					getAppWorkFolder() + "/" + sessionId);
			int pgCount = file.listFiles(new FilenameFilter() {
				public boolean accept(File dir, String name) {
					return name.endsWith(".png");
				}
			}).length;
			session.setAttribute(PDEConstants.PAGE_CNT_VAR, pgCount);
			File uploadedFilename = file.listFiles(new FilenameFilter() {

				public boolean accept(File dir, String name) {
					return name.endsWith(".pdf");
				}
			})[0];
			session.setAttribute(PDEConstants.PDF_FILE_NAME,
					uploadedFilename.getName());
		} else {
			throw new PDEException("Invalid Session Id");
		}
	}

	@RequestMapping(value = "/pageCount", method = RequestMethod.GET)
	public @ResponseBody
	Integer getPageCount(HttpSession session) {
		return (Integer) session
				.getAttribute(PDEConstants.PAGE_CNT_VAR);
	}

	@RequestMapping(value = "/pageImage/{pageNum}", method = RequestMethod.GET, consumes = MediaType.ALL_VALUE, produces = MediaType.IMAGE_PNG_VALUE)
	public @ResponseBody
	byte[] getPageImage(@PathVariable("pageNum") int pageNum,
			HttpSession session) throws IOException {
		return readFile((String) session
				.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR)
				+ "/Page-" + pageNum + ".png");
	}

	@RequestMapping(value = "/extractText/{pageNum}/{x}/{y}/{w}/{h}", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	String extractText(@PathVariable("pageNum") int pageNum,
			@PathVariable("x") float x, @PathVariable("y") float y,
			@PathVariable("w") float w, @PathVariable("h") float h,
			HttpSession session) throws IOException {
		PDDocument document = null;
		try {
			// read pdf
			byte[] pdfContent = readFile((String) session
					.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR)
					+ "/"
					+ (String) session
							.getAttribute(PDEConstants.PDF_FILE_NAME));
			// parse pdf
			document = PDDocument.load(new ByteArrayInputStream(pdfContent));
			// get desired page
			PDPage page = (PDPage) document.getDocumentCatalog().getAllPages()
					.get(pageNum - 1);
			// extract text from given area
			Integer resolution = (Integer) session
					.getAttribute(PDEConstants.RESOLUTION_VAR);
			PDFTextStripperByArea pdfTextStripperByArea = new PDFTextStripperByArea();
			pdfTextStripperByArea.addRegion("eval", new Rectangle((int) x
					/ resolution, (int) y / resolution, (int) w / resolution,
					(int) h / resolution));
			pdfTextStripperByArea.extractRegions(page);
			return pdfTextStripperByArea.getTextForRegion("eval");
		} finally {
			try {
				document.close();
			} catch (Exception ex) {
			}
		}
	}

	@RequestMapping(value = "/configFile", method = RequestMethod.PUT, consumes = MediaType.TEXT_PLAIN_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	void saveConfigFile(@RequestBody String configFileContent,
			HttpSession session) throws IOException {
		BufferedWriter writer = null;
		String appFolder = (String) session
				.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR)
				+ "/" + PDEConstants.DATA_EXTRACT_CONFIG_FILE;
		try {
			writer = new BufferedWriter(new FileWriter(appFolder));
			writer.write(configFileContent);
		} finally {
			try {
				writer.close();
			} catch (IOException exception) {
			}
		}
	}

	@RequestMapping(value = "/retriewUploadedFileName", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	String retriewUploadedFileName(HttpSession session) {
		return (String) session
				.getAttribute(PDEConstants.PDF_FILE_NAME);
	}

	@RequestMapping(value = "/retriewSessionInfo", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	String retriewSessionInfo(HttpSession session) {
		return (String) session.getAttribute(PDEConstants.SESSION_UUID);
	}

	@RequestMapping(value = "/retriewConfigData", method = RequestMethod.GET, consumes = MediaType.ALL_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	String retriewConfigFileData(HttpSession session) throws IOException {
		BufferedReader reader = null;
		String appFolder = (String) session
				.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR)
				+ "/" + PDEConstants.DATA_EXTRACT_CONFIG_FILE;

		if (new File(appFolder).exists()) {
			try {
				StringBuilder textString = new StringBuilder();
				reader = new BufferedReader(new FileReader(appFolder));
				String text = reader.readLine();
				while (text != null) {
					textString.append(text);
					text = reader.readLine();
				}
				return textString.toString();
			} finally {
				reader.close();
			}
		} else {
			return "";
		}
	}

	@RequestMapping(value = "/updateSessionId/{updatedSessionId}", method = RequestMethod.PUT, consumes = MediaType.TEXT_PLAIN_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
	public @ResponseBody
	void updateSessionId(
			@PathVariable("updatedSessionId") String updateSessionId,
			HttpSession session, HttpServletResponse response)
			throws PDEException {
		File updatedFile = new File(getAppWorkFolder() + "/" + updateSessionId);
		if (updatedFile.exists()) {
			throw new PDEException("Session Id already exists.");
		} else {
			File existingFile = new File(
					(String) session
							.getAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR));
			File newFile = new File(getAppWorkFolder() + "/" + updateSessionId);
			existingFile.renameTo(newFile);
			session.setAttribute(PDEConstants.SESSION_WORK_FOLDER_VAR,
					getAppWorkFolder() + "/" + updateSessionId);
		}
	}

	@ExceptionHandler
	public @ResponseBody
	String exceptionHandler(PDEException pdfException,
			HttpServletResponse response) {
		response.setStatus(500);
		return pdfException.getMessage();
	}

	@ExceptionHandler
	public @ResponseBody
	String exceptionHandler(Exception pdfException, HttpServletResponse response) {
		response.setStatus(500);
		pdfException.printStackTrace();
		return "Sorry!! Unknown Error Occured.";
	}

}
