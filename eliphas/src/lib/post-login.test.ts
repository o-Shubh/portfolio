import { test } from "node:test";
import assert from "node:assert/strict";
import { postLoginPath } from "./post-login.ts";

test("new accounts finish their profile first", () => {
  assert.equal(postLoginPath(null, "reader", "/dashboard"), "/onboarding");
  assert.equal(postLoginPath({ full_name: null, role: "reader" }, "reader", "/books/x"), "/onboarding?next=%2Fbooks%2Fx");
  assert.equal(postLoginPath({ full_name: "", role: "reader" }, "author", "/author"), "/onboarding?as=author&next=%2Fauthor");
});

test("existing accounts go where they were heading", () => {
  assert.equal(postLoginPath({ full_name: "Asha", role: "reader" }, "reader", "/account/saved"), "/account/saved");
  assert.equal(postLoginPath({ full_name: "Meera", role: "author" }, "author", "/author/books"), "/author/books");
  assert.equal(postLoginPath({ full_name: "Admin", role: "admin" }, "author", "/author"), "/author");
});

test("a reader on the author entrance is offered publishing", () => {
  assert.equal(postLoginPath({ full_name: "Kiran", role: "reader" }, "author", "/author"), "/login/author/start?next=%2Fauthor");
});
