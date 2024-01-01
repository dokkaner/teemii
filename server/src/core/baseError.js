const httpStatusCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER: 500
}

class BaseError extends Error {
  constructor (name, statusCode, isOperational, description) {
    super(description)

    Object.setPrototypeOf(this, new.target.prototype)
    this.name = name
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this)
  }
}

module.exports = { httpStatusCodes, BaseError }
