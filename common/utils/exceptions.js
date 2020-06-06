class CustomException extends Error{
    constructor(message, statusCode) {
        super();
        this.message = message;
        this.statusCode = statusCode || 500;
    };
}

module.exports = CustomException;
