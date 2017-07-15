
import urlParser from "./url";
import * as dns from "dns";
import * as querystring from "querystring";

import staticTabData from "../constants/static-tab-data";

import { IGameRecord, IUserRecord, ICollectionRecord,
  IInstallLocation, ITabData, ITabDataSet } from "../types";

const ITCH_HOST_RE = /^([^.]+)\.(itch\.io|localhost\.com:8080)$/;
const ID_RE = /^[^\/]+\/([^\?]*)/;

export async function transformUrl(original: string): Promise<string> {
  if (/^about:/.test(original)) {
    return original;
  }

  let req = original;
  let parsed = urlParser.parse(req);
  const searchUrl = () => {
    const q = original;
    return "https://duckduckgo.com/?" + querystring.stringify({ q, kae: "d" });
  };

  if (!parsed.hostname) {
    req = "http://" + original;
    parsed = urlParser.parse(req);
    if (!parsed.hostname) {
      return searchUrl();
    }
  }

  return await new Promise<string>((resolve, reject) => {
    dns.lookup(parsed.hostname, (err) => {
      if (err) {
        console.log(`dns error: ${err.code} / ${err.message}`); // tslint:disable-line:no-console
        resolve(searchUrl());
      }
      resolve(req);
    });
  });
}

export function pathToId(path: string): string {
  const matches = ID_RE.exec(path);
  if (!matches) {
    throw new Error(`Could not extract id from path: ${JSON.stringify(path)}`);
  }
  return matches[1];
}

export function pathToIcon(path: string) {
  if (path === "featured") {
    return "itchio";
  }
  if (path === "dashboard") {
    return "rocket";
  }
  if (path === "library") {
    return "heart-filled";
  }
  if (path === "preferences") {
    return "cog";
  }
  if (path === "history") {
    return "history";
  }
  if (path === "downloads") {
    return "download";
  }
  if (/^collections/.test(path)) {
    return "video_collection";
  }
  if (/^games/.test(path)) {
    return "star";
  }
  if (/^users/.test(path)) {
    return "t-shirt";
  }
  if (/^search/.test(path)) {
    return "search";
  }
  if (/^locations/.test(path)) {
    return "folder";
  }
  if (/^new/.test(path)) {
    return "star2";
  }
  return "earth";
}

export function gameToTabData(game: IGameRecord): ITabData {
  return {
    games: {
      [game.id]: game,
    },
    label: game.title,
    subtitle: game.shortText,
    image: game.stillCoverUrl || game.coverUrl,
    imageClass: "game",
    iconImage: game.stillCoverUrl || game.coverUrl,
  };
}

export function userToTabData(user: IUserRecord) {
  return {
    users: {
      [user.id]: user,
    },
    label: user.displayName || user.username,
    subtitle: "",
    image: user.stillCoverUrl || user.coverUrl,
    imageClass: "user",
    iconImage: user.stillCoverUrl || user.coverUrl,
  };
}

export function collectionToTabData(collection: ICollectionRecord) {
  return {
    collections: {
      [collection.id]: collection,
    },
    label: collection.title,
    subtitle: ["sidebar.collection.subtitle", { itemCount: collection.gamesCount }],
  };
}

export function locationToTabData(location: IInstallLocation) {
  return {
    label: location.path,
  };
}

export function makeLabel(id: string, tabData: ITabDataSet) {
  const staticData = staticTabData[id];
  if (staticData) {
    return staticData.label;
  }

  if (!tabData) {
    tabData = {} as ITabDataSet;
  }

  const data = tabData[id];
  if (data) {
    const {path} = data;
    if (path && /^url/.test(path)) {
      if (data.webTitle) {
        return data.webTitle;
      }
    } else {
      if (data.label) {
        return data.label;
      }
    }
  }

  return ["sidebar.loading"];
}

export function isAppSupported(url: string) {
  const {host, pathname} = urlParser.parse(url);

  if (ITCH_HOST_RE.test(host)) {
    const pathItems = pathname.split("/");
    if (pathItems.length === 2) {
      if (pathItems[1].length > 0) {
        // xxx.itch.io/yyy
        return "game";
      } else {
        // xxx.itch.io
        return "user";
      }
    }
  }

  return null;
}

export default { transformUrl, pathToId, pathToIcon, gameToTabData, collectionToTabData, isAppSupported };
