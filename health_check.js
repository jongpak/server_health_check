const http = require("http");
const process = require("process");

let serverListString = "";

function getServerListFromString(str) {
    return str
        .split("\n")
        .map((line) => line.replace(/#.*/g, ""))
        .filter((line) => line.trim().toString() !== "")
        .map((line) => line.replace(/\s+/g, ","))
        .map((line) => line.split(","))
        .map((item) => {
            return {
                host:    item[0],
                ip:      item[1],
                port:    Number.parseInt(item[2]),
                path:    item[3],
                timeout: Number.parseInt(item[4])
            }
        });
}

function main() {
    const serverList = getServerListFromString(serverListString);
    let requestQueue = [];

    serverList.forEach((server) => {
        const option = {
            hostname: server.ip,
            port: server.port,
            path: server.path,
            method: "GET",
            timeout: server.timeout
        }

        let ret = {
            status: "NONE",
            message: "",
            server: server,
            response: null
        }

        const start = new Date().getTime();

        requestQueue.push(
            new Promise((resolve, reject) => {
                var req = http.request(option, (res) => {
                    ret.response = res;

                    if (res.statusCode === 200) {
                        ret.status = "OK";
                        resolve(ret);
                    } else {
                        ret.status = "FAIL";
                        ret.message = "status_code=" + res.statusCode + "";
                        resolve(ret);
                    }
                });

                req.on("timeout", () => {
                    ret.status = "FAIL";
                    ret.message = "timeout=" + (new Date().getTime() - start) + "ms";
                    resolve(ret);
                });

                req.on("socket", (socket) => {
                    socket.setTimeout(server.timeout);
                    socket.on('timeout', function() {
                        req.abort();
                    });
                });

                req.on('error', (err) => {
                    ret.status = "FAIL";
                    ret.message = ret.message || "err_code=" + err.code;
                    resolve(ret);
                });

                req.end();
            })
        );
    })

    Promise.all(requestQueue)
        .then((resultList) => {
            resultList.forEach(result => {
                console.log(result.server.host + "    " + result.status + "    " + result.message);
            })
        });
}

process.stdin.on("readable", () => {
    const chunk = process.stdin.read();

    if (chunk !== null) {
        serverListString += chunk;
    }
});

process.stdin.on("end", () => {
    main();
});
