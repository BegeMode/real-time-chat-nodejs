/* eslint-disable */
export default async () => {
    const t = {};
    return { "@nestjs/swagger/plugin": { "models": [], "controllers": [[import("./app.controller"), { "AppController": { "getHello": { type: String } } }]] } };
};