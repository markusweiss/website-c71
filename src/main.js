import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
// import { displayDialogue, setCamScale } from "./utils";

k.scene("main", async () => {
  console.log(k.scale(scaleFactor));
});

k.setBackground(k.Color.fromHex("#dfdfdf"));

k.go("main");
