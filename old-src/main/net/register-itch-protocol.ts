import { actions } from "common/actions";
import { messages } from "common/butlerd";
import { Store } from "common/types";
import { Session } from "electron";
import { mcall } from "main/butlerd/mcall";
import { mainLogger } from "main/logger";
import { handleItchioUrl } from "main/reactors/url";
import { doAsync } from "renderer/helpers/doAsync";
import urlParser from "url";

const logger = mainLogger.child(__filename);

let registered = new Set<Session>();

export function registerItchProtocol(store: Store, ses: Session) {
  if (!registered.has(ses)) {
    registered.add(ses);

    logger.debug(
      `Registering itch: protocol for session with user agent ${ses.getUserAgent()}`
    );
    ses.protocol.registerStringProtocol(
      "itch",
      (req, cb) => {
        cb("");
      },
      e => {
        if (e) {
          logger.error(`While registering itch protocol: ${e.stack || e}`);
        }
      }
    );

    ses.webRequest.onBeforeRequest((details, callback) => {
      const { url } = details;
      let handled = false;
      try {
        const parsedURL = urlParser.parse(url);
        if (parsedURL.protocol === "itch:") {
          handled = handleItchioUrl(store, url);
        }
      } catch (e) {
        logger.warn(`In beforeRequest handler: ${e.stack}`);
      }
      callback({ cancel: handled });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
      callback({});
      doAsync(async () => {
        try {
          const dkIdString = details.responseHeaders["X-Itch-Download-Key-Id"];
          const pIdString =
            details.responseHeaders["X-Itch-Download-Key-Owner-Id"];
          if (dkIdString && pIdString) {
            const downloadKeyId = parseInt(dkIdString, 10);
            const profileId = parseInt(pIdString, 10);
            const { downloadKeys } = store.getState().commons;

            logger.info(
              `Visiting download key page, has key ${downloadKeyId} (owner ${profileId})`
            );

            if (!downloadKeys[downloadKeyId]) {
              logger.info(`That's a new key, fetching...`);
              await mcall(messages.FetchDownloadKey, {
                downloadKeyId,
                profileId,
              });
              store.dispatch(actions.ownedKeysFetched({}));
            }
          }
        } catch (e) {
          logger.warn(`While sniffing headers: ${e.stack}`);
        }
      });
    });
  }
}
