import { createClient } from "redis";
import Utils from "./Utils";

export default class Server extends Utils {
    readonly pub = createClient({ url: process.env.REDIS_URL });
    readonly sub = createClient({ url: process.env.REDIS_URL });

    constructor() {
        super(true);
    }

    async initialize() { }
}