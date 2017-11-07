
import {Watcher} from "./watcher";
import * as actions from "../actions";

import client from "../util/api";
import partitionForUser from "../util/partition-for-user";

import {sortBy} from "underscore";

import {MODAL_RESPONSE} from "../constants/action-types";
import urls from "../constants/urls";
import {promisedModal} from "./modals";

import {ITwoFactorInputParams} from "../components/modal-widgets/two-factor-input";
import { IRecaptchaInputParams } from "../components/modal-widgets/recaptcha-input";
import { ILoginExtras, ISuccessfulLoginResult } from "../types/api";

const YEAR_IN_SECONDS = 365.25 /* days */ * 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */;

export default function (watcher: Watcher) {
  watcher.on(actions.loginWithPassword, async (store, action) => {
    const {username, password} = action.payload;

    store.dispatch(actions.attemptLogin({}));
    let extras: ILoginExtras = {};

    try {
      let res: ISuccessfulLoginResult;
      let passwordRes = await client.loginWithPassword(username, password, extras);
      res = passwordRes;

      if (passwordRes.recaptchaNeeded) {
        const modalRes = await promisedModal(store, {
          title: "Captcha",
          message: "",
          buttons: [
            {
              label: ["login.action.login"],
              action: actions.modalResponse({}),
              actionSource: "widget",
            }
          ],
          widget: "recaptcha-input",
          widgetParams: {
            url: passwordRes.recaptchaUrl,
          } as IRecaptchaInputParams
        });

        if (modalRes.type === MODAL_RESPONSE) {
          extras.recaptchaResponse = modalRes.payload.recaptchaResponse;
          passwordRes = await client.loginWithPassword(username, password, extras);
          res = passwordRes;
        } else {
          store.dispatch(actions.loginCancelled({}));
          return;
        }
      }

      if (passwordRes.totpNeeded) {
        const modalRes = await promisedModal(store, {
          title: ["login.two_factor.title"],
          message: "",
          buttons: [
            {
              label: ["login.action.login"],
              action: actions.modalResponse({}),
              actionSource: "widget",
            },
            {
              label: ["login.two_factor.learn_more"],
              action: actions.openUrl({
                url: urls.twoFactorHelp,
              }),
              className: "secondary",
            },
          ],
          widget: "two-factor-input",
          widgetParams: {
            username,
          } as ITwoFactorInputParams,
        });

        if (modalRes.type === MODAL_RESPONSE) {
          const totpRes = await client.totpVerify(passwordRes.token, modalRes.payload.totpCode);
          res = totpRes;
        } else {
          store.dispatch(actions.loginCancelled({}));
          return;
        }
      }

      const key = res.key.key;
      const keyClient = client.withKey(key);

      if (res.cookie) {
        const partition = partitionForUser(String(res.key.userId));
        const session = require("electron").session.fromPartition(partition, {cache: true});
        
        for (const name of Object.keys(res.cookie)) {
          const value = res.cookie[name];
          await new Promise((resolve, reject) => {
            session.cookies.set({
              name,
              value: encodeURIComponent(value),
              url: "https://itch.io/",
              domain: ".itch.io",
              secure: true,
              httpOnly: true,
              expirationDate: (Date.now() * 0.001) + YEAR_IN_SECONDS,
            }, (error: Error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          });
        }
      }

      // validate API key and get user profile in one fell swoop
      const me = (await keyClient.me()).user;
      store.dispatch(actions.loginSucceeded({key, me}));
    } catch (e) {
      store.dispatch(actions.loginFailed({username, errors: e.errors || e.stack || e}));
    }
  });

  watcher.on(actions.loginWithToken, async (store, action) => {
    const {username, key} = action.payload;

    store.dispatch(actions.attemptLogin({}));

    try {
      const keyClient = client.withKey(key);

      // validate API key and get user profile in one fell swoop
      const me = (await keyClient.me()).user;
      store.dispatch(actions.loginSucceeded({key, me}));
    } catch (e) {
      const {me} = action.payload;
      if (me && client.isNetworkError(e)) {
        // log in anyway
        store.dispatch(actions.loginSucceeded({key, me}));
      } else {
        store.dispatch(actions.loginFailed({username, errors: e.errors || e.stack || e}));
      }
    }
  });

  watcher.on(actions.sessionsRemembered, async (store, action) => {
    const rememberedSessions = action.payload;
    const mostRecentSession = sortBy(rememberedSessions, (x) => -x.lastConnected)[0];
    if (mostRecentSession) {
      const {me, key} = mostRecentSession;
      const {username} = me;
      store.dispatch(actions.loginWithToken({username, key, me}));
    }
  });
}
