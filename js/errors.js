export class HttpError extends Error {
    status;
    constructor(status) {
        super(`HTTP ${status}`);
        this.name = 'HttpError';
        this.status = status;
    }
}
