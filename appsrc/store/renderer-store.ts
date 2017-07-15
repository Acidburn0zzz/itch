
import { createStore, applyMiddleware, compose, GenericStoreEnhancer, Middleware } from "redux";
import { electronEnhancer } from "redux-electron-store";
const createLogger = require("redux-logger");

import route from "../reactors/route";
import reducer from "../reducers";
import {Watcher} from "../reactors/watcher";

const watcher = new Watcher();

import {IRendererStore} from "../types";

const filter = true;
const middleware: Middleware[] = [];

const REDUX_DEVTOOLS_ENABLED = process.env.REDUX_DEVTOOLS === "1";

if (REDUX_DEVTOOLS_ENABLED) {
  const logger = createLogger({
    predicate: (getState: () => any, action: any) => !action.MONITOR_ACTION,
  });
  middleware.push(logger);
}

const allAction = Object.freeze({ type: "__ALL", payload: null });
const ee = electronEnhancer({
  filter,
  synchronous: false,
  postDispatchCallback: (action: any) => {
    route(watcher, store, action);
    route(watcher, store, allAction);
  },
}) as GenericStoreEnhancer;

const em = applyMiddleware(...middleware);

let enhancer: GenericStoreEnhancer;

if (REDUX_DEVTOOLS_ENABLED) {
  const DevTools = require("../components/dev-tools").default;
  enhancer = compose(ee, em, DevTools.instrument());
} else {
  enhancer = compose(ee, em) as GenericStoreEnhancer;
}

const initialState = {};
const store = createStore(reducer, initialState, enhancer) as IRendererStore;
route(watcher, store, { type: "__MOUNT", payload: null });

store.watcher = watcher;

export default store;
