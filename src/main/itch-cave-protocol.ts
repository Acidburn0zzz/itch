import * as url from "url";
import { Session } from "electron";
import { createReadStream, statSync } from "original-fs";
import { mainLogger } from "main/logger";
import mime from "mime-types";
import { join } from "path";
import { asReadable } from "main/itch-protocol";

const registeredSessions = new Set<Session>();
const WEBGAME_PROTOCOL = "itch-cave";

const logger = mainLogger.child(__filename);

export async function registerItchCaveProtocol(
  gameSession: Session,
  fileRoot: string
) {
  if (registeredSessions.has(gameSession)) {
    return;
  }
  registeredSessions.add(gameSession);

  await new Promise((resolve, reject) => {
    gameSession.protocol.registerStreamProtocol(
      WEBGAME_PROTOCOL,
      (request, callback) => {
        const urlPath = url.parse(request.url).pathname;
        if (!urlPath) {
          callback({
            statusCode: 404,
            data: asReadable("Not found"),
          });
          return;
        }
        const decodedPath = decodeURI(urlPath);
        const rootlessPath = decodedPath.replace(/^\//, "");
        const filePath = join(fileRoot, rootlessPath);

        try {
          var stats = statSync(filePath);
          let headers: Record<string, string> = {
            server: "itch",
            "content-length": `${stats.size}`,
            "access-control-allow-origin": "*",
          };
          let contentType = mime.lookup(filePath);
          if (contentType) {
            headers["content-type"] = contentType;
          }
          var stream = createReadStream(filePath);
          callback({
            headers,
            statusCode: 200,
            data: stream,
          });
          return;
        } catch (e) {
          logger.warn(`while serving ${request.url}, got ${e.stack}`);
          let statusCode = 400;
          switch (e.code) {
            case "ENOENT":
              statusCode = 404;
              break;
            case "EPERM":
              statusCode = 401;
              break;
          }

          callback({
            headers: {},
            statusCode,
            data: null,
          });
          return;
        }
      },
      error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });

  const handled = await gameSession.protocol.isProtocolHandled(
    WEBGAME_PROTOCOL
  );
  if (!handled) {
    throw new Error(`could not register custom protocol ${WEBGAME_PROTOCOL}`);
  }
}
