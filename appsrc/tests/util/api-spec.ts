
// tslint:disable:no-shadowed-variable

import test  = require("zopf");
import * as sinon from "sinon";
import * as proxyquire from "proxyquire";

import cooldown = require("../stubs/cooldown");

import {IResponse} from "../../util/net";
import {ApiError} from "../../util/api";

test("api", t => {
  const net = test.module({
    request: async (): Promise<IResponse> => ({
      statusCode: 200,
      status: "OK",
      body: {id: 12},
    } as IResponse),
  });

  const stubs = {
    "../util/net": net,
    "../util/cooldown": cooldown,
  };

  const api = proxyquire("../../util/api", stubs).default;
  api.rootUrl = "http://example.org/";

  const user = api.withKey("key");
  const client = api;

  const uri = "http://example.org/yo";

  t.case("can GET", async t => {
    const request = t.spy(net, "request");
    await client.request("get", "yo", {b: 11});
    sinon.assert.calledWith(request, "get", uri, {b: 11});
  });

  t.case("can POST", async t => {
    const request = t.spy(net, "request");
    await client.request("post", "yo", {b: 22});
    sinon.assert.calledWith(request, "post", uri, {b: 22});
  });

  t.case("can make authenticated request", t => {
    const mock = t.mock(client);
    mock.expects("request").withArgs("get", "/key/my-games").resolves({games: []});
    user.myGames();
  });

  t.case("rejects API errors", async t => {
    const errors = ["foo", "bar", "baz"];

    t.stub(net, "request").resolves({body: {errors}, statusCode: 200});
    let err: ApiError;
    try {
      await client.request("get", "", {});
    } catch (e) { err = e; }
    t.same(err, {errors});
  });

  {
    let testAPI = function (endpoint: string, args: any[], expected: any[]) {
      t.case(`${expected[0].toUpperCase()} ${endpoint}`, t => {
        let spy = t.spy(client, "request");
        client[endpoint].apply(client, args);
        sinon.assert.calledWith.apply(sinon.assert, [spy].concat(expected));
      });
    };

    testAPI(
      "loginKey", ["foobar"],
      ["get", "/foobar/me", {source: "desktop"}],
    );

    testAPI(
      "loginWithPassword", ["foo", "bar"],
      ["post", "/login", {username: "foo", password: "bar", source: "desktop", v: 3}],
    );
  }

  {
    let testAPI = function (endpoint: string, args: any[], expected: any[]) {
      t.case(`${expected[0].toUpperCase()} ${endpoint}`, t => {
        let spy = t.spy(user, "request");
        user[endpoint].apply(user, args);
        sinon.assert.calledWith.apply(sinon.assert, [spy].concat(expected));
      });
    };

    testAPI(
      "myGames", [],
      ["get", "/my-games"],
    );
    testAPI(
      "myOwnedKeys", [],
      ["get", "/my-owned-keys"],
    );
    testAPI(
      "me", [],
      ["get", "/me"],
    );
    testAPI(
      "myCollections", [],
      ["get", "/my-collections"],
    );
    testAPI(
      "collectionGames", [1708],
      ["get", "/collection/1708/games", {page: 1}],
    );
    testAPI(
      "searchGames", ["baz"],
      ["get", "/search/games", {query: "baz"}],
    );
    testAPI(
      "searchUsers", ["baz"],
      ["get", "/search/users", {query: "baz"}],
    );
    testAPI(
      "downloadUpload", [null, 99],
      ["get", "/upload/99/download"],
    );
    testAPI(
      "downloadUpload", [{id: "foobar"}, 99],
      ["get", "/upload/99/download", {download_key_id: "foobar"}],
    );
    testAPI(
      "listUploads", [null, 33],
      ["get", "/game/33/uploads"],
    );
    testAPI(
      "listUploads", [{id: "foobar"}, 33],
      ["get", "/download-key/foobar/uploads"],
    );
  }
});
