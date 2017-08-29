/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import datastore from "./datastore";
import { makeEntrySummary } from "../common";

const ports = new Set();
browser.runtime.onConnect.addListener((port) => {
  ports.add(port);
  port.onDisconnect.addListener(() => {
    console.log("message port disconnected");
    ports.delete(port);
  });
});

function broadcast(message, excludeSender = null) {
  for (let p of ports) {
    if (!excludeSender || p.sender.contextId !== excludeSender.contextId) {
      p.postMessage(message);
    }
  }
}

browser.runtime.onMessage.addListener(async function(message, sender) {
  switch (message.type) {
  case "add_entry": {
    await datastore.unlock();
    const entry = await datastore.add(message.entry);
    broadcast({type: "added_entry", entry}, sender);
    return {entry};
  }
  case "update_entry": {
    await datastore.unlock();
    const entry = await datastore.update(message.entry);
    broadcast({type: "updated_entry", entry}, sender);
    return {entry};
  }
  case "remove_entry":
    await datastore.remove(message.id);
    broadcast({type: "removed_entry", id: message.id}, sender);
    return {};
  case "get_entry":
    return {entry: await datastore.get(message.id)};
  case "list_entries":
    return {entries: Array.from((await datastore.list()).values(),
                                makeEntrySummary)};
  default:
    return null;
  }
});