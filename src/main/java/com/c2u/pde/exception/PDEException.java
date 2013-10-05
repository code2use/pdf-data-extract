package com.c2u.pde.exception;

public class PDEException extends Exception { // TODO: exception implementation need to be changed. This class can extend from WebApplicationException 
	private static final long serialVersionUID = 8176872279711930577L;

	public PDEException(String msg, Throwable t) {
		super(msg, t);
	}
	
	public PDEException(String msg) {
		super(msg);
	}
}
