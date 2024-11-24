export default class AesCtrConcurrentError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = `AesCtrConcurrentError`;
    }
}