import { init as coreInit } from "./core.js";
import { init as pf2eInit } from "./pf2e.js";

Hooks.once("init", () => {
  if (game.system.id === "pf2e") pf2eInit();
  else coreInit();
});
