import { createServer } from "node:http";
import handler from "../api/index.js";

const server = createServer((req, res) => {
  handler(req, res).catch((err) => {
    console.error("handler threw:", err);
    res.statusCode = 500;
    res.end("error");
  });
});

server.listen(4001, () => {
  console.log("smoke test server on :4001");
});
