import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
// import { displayDialogue, setCamScale } from "./utils";

k.scene("main", async () => {
  console.log(k.scale(scaleFactor));
});

k.loadSprite("map", "./office.png");


k.scene("main", async () => {
  //const mapData = await (await fetch("./office.json")).json();
  //const layers = mapData.layers;

  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);

  console.log("Map loaded:", map);

});

k.setBackground(k.Color.fromHex("#37966E"));

k.go("main");
