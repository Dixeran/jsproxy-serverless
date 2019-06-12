const Express = require("express");
const request = require("request");
const bodyParser = require("body-parser");

if (process.env.TARGET === "production") {
  console.log = function() {}; // omit console.log in production
}

let app = Express();
// pre-flight request
app.options("*", (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "TRACE",
    "DELETE",
    "HEAD",
    "OPTIONS"
  ]);
  res.setHeader(
    "access-control-allow-headers",
    "--raw-info,--level,--url,--referer,--cookie,--origin,--ext,--aceh,--ver,--type,--mode,accept,accept-charset,accept-encoding,accept-language,accept-datetime,authorization,cache-control,content-length,content-type,date,if-match,if-modified-since,if-none-match,if-range,if-unmodified-since,max-forwards,pragma,range,te,upgrade,upgrade-insecure-requests,x-requested-with,chrome-proxy,purpose"
  );
  res.setHeader("access-control-max-age", 1728000);
  res.status(204).end();
});

app.use(
  bodyParser.raw({
    inflate: false,
    type: "*/*"
  })
);

// decode http request
app.use((req, res, next) => {
  // construct proxy request
  delete req.headers.host;
  res.locals.proxy_info = {
    method: req.method,
    headers: req.headers
  };
  if (Buffer.isBuffer(req.body)) {
    res.locals.proxy_info.body = req.body;
  }

  for (let key in req.headers) {
    _key = key.substring(2);
    if (key.substr(0, 2) !== "--") continue;
    else if (_key === "url") {
      res.locals.proxy_info.url = req.headers[key];
    } else if (key === "ext") {
      //extra headers put into request header
      ext_hdrs = JSON.parse(req.headers[key]);
      for (let exth in ext_hdrs) {
        res.locals.proxy_info.headers[exth] = ext_hdrs[exth];
      }
    } else {
      //TODO: custom headers filter
      res.locals.proxy_info.headers[_key] = req.headers[key];
    }
  }

  next();
});

// request reconstruct
app.use((req, res) => {
  let req_obj = {
    ...res.locals.proxy_info,
    followRedirect: false
  };
  console.log("\n#-----# Send request.");
  console.log(req_obj);

  request(req_obj)
    .on("response", response => {
      let vary = "--url";

      for (let res_hdr in response.headers) {
        console.log("parse header: " + res_hdr);
        let v = response.headers[res_hdr];
        if (
          res_hdr === "access-control-allow-origin" ||
          res_hdr === "access-control-expose-headers" ||
          res_hdr === "location" ||
          res_hdr === "set-cookie"
        ) {
          if (Array.isArray(v)) {
            for (let i = 1; i <= v.length; i++) {
              response.headers[`${i}-${res_hdr}`] = v[i - 1];
              console.log("add array header " + res_hdr);
            }
          } else {
            response.headers[`--${res_hdr}`] = v;
          }
          delete response.headers[res_hdr];
        } else if (res_hdr === "vary") {
          // add vary
          if (Array.isArray(v)) {
            vary = vary + "," + v.join(",");
          } else {
            vary = vary + "," + v;
          }
        }
      }

      response.headers["access-control-expose-headers"] = "*";
      response.headers["access-control-allow-origin"] = "*";
      response.headers["--vary"] = vary;
      response.headers["--s"] = response.statusCode;
      delete response.headers["cache-control"]; // avoid being cached by cdn

      // more set headers
      response.headers["content-security-policy"] = "";
      response.headers["content-security-policy-report-only"] = "";
      response.headers["x-frame-options"] = "";
    })
    .on("error", e => {
      console.log(e.message);
      res.status(502).send(e.message);
    })
    .pipe(res);
});

module.exports = app;
